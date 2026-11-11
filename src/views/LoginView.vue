<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { LogIn, Loader2, FlaskConical } from 'lucide-vue-next'
import AuthCard from '@/components/auth/AuthCard.vue'
import SocialAuthButtons from '@/components/auth/SocialAuthButtons.vue'
import EmailField from '@/components/auth/EmailField.vue'
import PasswordField from '@/components/auth/PasswordField.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isLocalEnv = computed(() => {
  if (!import.meta.env.DEV) return false
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')
})

const email = ref(authStore.rememberedEmail || '')
const password = ref('')
const rememberMe = ref(true)
const errorMessage = ref('')

onMounted(() => {
  if (authStore.isAuthenticated) {
    const redirect = (route.query.redirect as string) || '/'
    router.replace(redirect)
  }
})

async function handleSubmit() {
  errorMessage.value = ''
  if (!email.value || !password.value) {
    errorMessage.value = 'Por favor completa todos los campos.'
    return
  }

  const success = await authStore.login(email.value, password.value, rememberMe.value)
  if (success) {
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  }
}

async function handleLocalTestLogin() {
  if (!isLocalEnv.value) return
  errorMessage.value = ''
  const success = await authStore.loginWithLocalTestAccount()
  if (success) {
    const redirect = (route.query.redirect as string) || '/catalog'
    router.push(redirect)
  }
}
</script>

<template>
  <AuthCard
    title="Iniciar Sesión"
    subtitle="Accede a tu biblioteca de videojuegos y sigue tu progreso"
    :error-message="errorMessage"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Email Input Component -->
      <EmailField v-model="email" />

      <!-- Password Input Component -->
      <PasswordField
        v-model="password"
        label="Contraseña"
        autocomplete="current-password"
      />

      <!-- Remember Me Checkbox -->
      <div class="flex items-center justify-between pt-0.5">
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input
            v-model="rememberMe"
            type="checkbox"
            class="w-3.5 h-3.5 rounded-[2px] border-gray-600 text-(--app-primary) focus:ring-(--app-primary) focus:ring-offset-0 transition-colors"
            :style="{ accentColor: 'var(--app-primary)' }"
          />
          <span class="text-xs font-medium" :style="{ color: 'var(--app-text)' }">
            Recordar mi sesión
          </span>
        </label>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="authStore.loading"
        class="w-full h-10 rounded-[4px] font-bold text-xs sm:text-sm text-white shadow-md transition-all duration-150 flex items-center justify-center gap-2 hover:opacity-95 active:scale-98 cursor-pointer disabled:opacity-50"
        :style="{ backgroundColor: 'var(--app-primary)' }"
      >
        <Loader2 v-if="authStore.loading" class="w-4 h-4 animate-spin" />
        <LogIn v-else class="w-4 h-4" />
        <span>{{ authStore.loading ? 'Iniciando...' : 'Iniciar Sesión' }}</span>
      </button>
    </form>

    <!-- Social OAuth Buttons Component -->
    <SocialAuthButtons divider-text="o continúa con" />

    <!-- Local-Only Dev Test Account (Strictly rendered in local development mode) -->
    <div
      v-if="isLocalEnv"
      class="pt-2 border-t space-y-2"
      :style="{ borderColor: 'var(--app-border)' }"
    >
      <div class="flex items-center justify-between text-[11px] font-semibold">
        <span class="uppercase tracking-wider" :style="{ color: 'var(--app-primary)' }">
          Entorno Local de Desarrollo
        </span>
        <span :style="{ color: 'var(--app-text-muted)' }">
          test@nextg.local · Test1234
        </span>
      </div>
      <button
        type="button"
        :disabled="authStore.loading"
        @click="handleLocalTestLogin"
        class="w-full h-10 px-3 rounded-[4px] border text-xs font-bold transition-all flex items-center justify-center gap-2 hover:opacity-95 active:scale-98 cursor-pointer disabled:opacity-50"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-primary)',
          color: 'var(--app-text)',
          boxShadow: '0 0 16px var(--app-glow)',
        }"
      >
        <FlaskConical class="w-4 h-4" :style="{ color: 'var(--app-primary)' }" />
        <span>Entrar con Cuenta Test Local (135 Juegos / +100 en Backlog)</span>
      </button>
    </div>

    <!-- Footer Link -->
    <template #footer>
      <div class="text-center pt-2">
        <p class="text-xs" :style="{ color: 'var(--app-text-muted)' }">
          ¿No tienes una cuenta aún?
          <RouterLink
            to="/register"
            class="font-bold underline hover:opacity-80 ml-1"
            :style="{ color: 'var(--app-primary)' }"
          >
            Regístrate aquí
          </RouterLink>
        </p>
      </div>
    </template>
  </AuthCard>
</template>
