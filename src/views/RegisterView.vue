<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { UserPlus, Loader2 } from 'lucide-vue-next'
import AuthCard from '@/components/auth/AuthCard.vue'
import SocialAuthButtons from '@/components/auth/SocialAuthButtons.vue'
import UsernameField from '@/components/auth/UsernameField.vue'
import EmailField from '@/components/auth/EmailField.vue'
import PasswordField from '@/components/auth/PasswordField.vue'
import PasswordRequirements from '@/components/auth/PasswordRequirements.vue'
import LegalCheckboxes from '@/components/auth/LegalCheckboxes.vue'
import { useUsernameValidation } from '@/composables/useUsernameValidation'
import { useEmailValidation } from '@/composables/useEmailValidation'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Validation composables
const {
  username: name,
  status: usernameStatus,
  message: usernameMessage,
  isAvailable: isUsernameAvailable,
} = useUsernameValidation({ minLength: 2, maxLength: 80 })

const {
  email,
  status: emailStatus,
  message: emailMessage,
} = useEmailValidation()

// Form field states
const password = ref('')
const confirmPassword = ref('')
const acceptTerms = ref(false)
const acceptPrivacy = ref(false)
const errorMessage = ref('')

// Password validation checks
const hasMinLength = computed(() => password.value.length >= 8)
const hasLetter = computed(() => /[\p{L}]/u.test(password.value))
const hasUppercase = computed(() => /[\p{Lu}]/u.test(password.value))
const hasNumber = computed(() => /\d/.test(password.value))
const isPasswordValid = computed(
  () => hasMinLength.value && hasLetter.value && hasUppercase.value && hasNumber.value
)

const hasTypedConfirm = computed(() => confirmPassword.value.length > 0)
const passwordsMatch = computed(
  () => password.value.length > 0 && password.value === confirmPassword.value
)

// Overall form validity
const isFormValid = computed(() => {
  return (
    name.value.trim().length >= 2 &&
    isUsernameAvailable.value &&
    email.value.trim().length > 3 &&
    emailStatus.value !== 'taken' &&
    emailStatus.value !== 'checking' &&
    isPasswordValid.value &&
    passwordsMatch.value &&
    acceptTerms.value &&
    acceptPrivacy.value
  )
})

onMounted(() => {
  if (authStore.isAuthenticated) {
    const redirect = (route.query.redirect as string) || '/'
    router.replace(redirect)
  }
})

async function handleSubmit() {
  errorMessage.value = ''

  if (!name.value.trim() || !email.value.trim() || !password.value) {
    errorMessage.value = 'Por favor completa todos los campos obligatorios.'
    return
  }

  if (usernameStatus.value === 'taken') {
    errorMessage.value = 'El nombre de usuario elegido ya está ocupado. Elige otro.'
    return
  }

  if (emailStatus.value === 'taken') {
    errorMessage.value = 'El correo electrónico ya está registrado. Inicia sesión.'
    return
  }

  if (!isPasswordValid.value) {
    errorMessage.value = 'La contraseña no cumple con los requisitos mínimos de seguridad.'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Las contraseñas no coinciden.'
    return
  }

  if (!acceptTerms.value || !acceptPrivacy.value) {
    errorMessage.value =
      'Debes aceptar los Términos y Condiciones y la Política de Privacidad para continuar.'
    return
  }

  const success = await authStore.register(name.value.trim(), email.value.trim(), password.value)
  if (success) {
    router.push('/setup')
  }
}
</script>

<template>
  <AuthCard
    title="Crear Cuenta"
    subtitle="Únete a la comunidad de NEXT.g y empieza a organizar tus videojuegos"
    :error-message="errorMessage"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Username Field Component -->
      <UsernameField
        v-model="name"
        :status="usernameStatus"
        :message="usernameMessage"
        :maxlength="80"
      />

      <!-- Email Field Component -->
      <EmailField
        v-model="email"
        :status="emailStatus"
        :message="emailMessage"
      />

      <!-- Password Field & Security Requirements -->
      <div class="space-y-1">
        <PasswordField
          v-model="password"
          label="Contraseña"
          autocomplete="new-password"
        />
        <PasswordRequirements :password="password" />
      </div>

      <!-- Confirm Password Field -->
      <PasswordField
        v-model="confirmPassword"
        label="Confirmar Contraseña"
        autocomplete="new-password"
        :match-status="hasTypedConfirm ? (passwordsMatch ? 'match' : 'mismatch') : 'idle'"
        :match-message="hasTypedConfirm ? (passwordsMatch ? '✓ Las contraseñas coinciden' : '✕ Las contraseñas no coinciden') : ''"
      />

      <!-- Terms & Privacy Checkboxes Component -->
      <LegalCheckboxes
        v-model:terms="acceptTerms"
        v-model:privacy="acceptPrivacy"
        required
      />

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="authStore.loading || !isFormValid"
        class="w-full h-10 rounded-[4px] font-bold text-xs sm:text-sm text-white shadow-md transition-all duration-150 flex items-center justify-center gap-2 hover:opacity-95 active:scale-98 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-2"
        :style="{ backgroundColor: 'var(--app-primary)' }"
      >
        <Loader2 v-if="authStore.loading" class="w-4 h-4 animate-spin" />
        <UserPlus v-else class="w-4 h-4" />
        <span>{{ authStore.loading ? 'Creando cuenta...' : 'Crear Cuenta' }}</span>
      </button>
    </form>

    <!-- Social OAuth Buttons Component -->
    <SocialAuthButtons divider-text="o regístrate con" />

    <!-- Footer Link -->
    <template #footer>
      <div class="text-center pt-2">
        <p class="text-xs" :style="{ color: 'var(--app-text-muted)' }">
          ¿Ya tienes una cuenta?
          <RouterLink
            to="/login"
            class="font-bold underline hover:opacity-80 ml-1"
            :style="{ color: 'var(--app-primary)' }"
          >
            Inicia sesión aquí
          </RouterLink>
        </p>
      </div>
    </template>
  </AuthCard>
</template>
