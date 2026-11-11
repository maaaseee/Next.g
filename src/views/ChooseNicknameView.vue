<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-vue-next'
import AuthCard from '@/components/auth/AuthCard.vue'
import UsernameField from '@/components/auth/UsernameField.vue'
import LegalCheckboxes from '@/components/auth/LegalCheckboxes.vue'
import { useUsernameValidation } from '@/composables/useUsernameValidation'

const router = useRouter()
const authStore = useAuthStore()

const {
  username: nickname,
  status: usernameStatus,
  message: usernameMessage,
  isAvailable: isUsernameAvailable,
} = useUsernameValidation({
  minLength: 2,
  maxLength: 50,
  debounceMs: 350,
  currentName: () => authStore.user?.name,
})

const acceptTerms = ref(true)
const acceptPrivacy = ref(true)
const errorMessage = ref('')
const isSubmitting = ref(false)

const isFormValid = computed(() => {
  return (
    nickname.value.trim().length >= 2 &&
    nickname.value.trim().length <= 50 &&
    isUsernameAvailable.value &&
    acceptTerms.value &&
    acceptPrivacy.value &&
    !isSubmitting.value
  )
})

onMounted(() => {
  if (authStore.user?.onboarded) {
    router.replace('/library')
    return
  }

  if (authStore.user?.name) {
    const raw = authStore.user.name.trim()
    const suggested = raw.includes(' ') ? raw.split(' ')[0] : raw
    nickname.value = suggested || ''
  }
})

async function handleSubmit() {
  errorMessage.value = ''
  const clean = nickname.value.trim()

  if (clean.length < 2 || clean.length > 50) {
    errorMessage.value = 'El nickname debe tener entre 2 y 50 caracteres.'
    return
  }

  if (usernameStatus.value === 'taken') {
    errorMessage.value = 'El nombre de usuario elegido ya está ocupado. Elige otro.'
    return
  }

  if (!acceptTerms.value || !acceptPrivacy.value) {
    errorMessage.value = 'Debes aceptar los Términos y la Política de Privacidad para continuar.'
    return
  }

  isSubmitting.value = true
  try {
    const success = await authStore.updateNickname(clean)
    if (success) {
      router.push('/setup')
    }
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : 'Error al guardar el nickname.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AuthCard
    title="Elige tu Nickname Gamer"
    subtitle="Te has autenticado mediante un acceso social. Para proteger tu privacidad y evitar que se use tu nombre real, elige el apodo público con el que aparecerás en NEXT.g y en la URL de tu perfil."
    :error-message="errorMessage"
    boxed
  >
    <!-- Privacy Shield Badge -->
    <template #badge>
      <div
        class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border shadow-xs mb-2"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-primary)',
          color: 'var(--app-primary)',
        }"
      >
        <ShieldCheck class="w-4 h-4" />
        <span>Protección de Privacidad de Identidad</span>
      </div>
    </template>

    <form @submit.prevent="handleSubmit" class="space-y-5">
      <!-- Username / Nickname Field Component -->
      <UsernameField
        v-model="nickname"
        :status="usernameStatus"
        :message="usernameMessage"
        label="Tu Nickname / GamerTag público"
        placeholder="Ej. CyberKnight, StarGamer99"
        :maxlength="50"
        show-url-preview
      />

      <!-- Legal Consent Checkboxes Component -->
      <div class="pt-2 border-t" :style="{ borderColor: 'var(--app-border)' }">
        <LegalCheckboxes
          v-model:terms="acceptTerms"
          v-model:privacy="acceptPrivacy"
        />
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="!isFormValid || isSubmitting"
        class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95 active:scale-98"
        :style="{ backgroundColor: 'var(--app-primary)' }"
      >
        <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
        <template v-else>
          <span>Confirmar Nickname y Continuar</span>
          <ArrowRight class="w-4 h-4" />
        </template>
      </button>
    </form>
  </AuthCard>
</template>
