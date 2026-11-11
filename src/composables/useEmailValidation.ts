import { ref, computed, watch, onUnmounted } from 'vue'
import { getApiUrl } from '@/config/api.config'

export type EmailStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function useEmailValidation(debounceMs = 450) {
  const email = ref('')
  const status = ref<EmailStatus>('idle')
  const message = ref('')
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let abortController: AbortController | null = null

  watch(email, (newVal) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (abortController) {
      abortController.abort()
      abortController = null
    }

    const clean = newVal.trim().toLowerCase()

    if (clean.length === 0) {
      status.value = 'idle'
      message.value = ''
      return
    }

    if (!EMAIL_REGEX.test(clean)) {
      status.value = 'invalid'
      message.value = 'Formato de correo electrónico no válido.'
      return
    }

    status.value = 'checking'
    message.value = 'Comprobando correo...'

    debounceTimer = setTimeout(async () => {
      abortController = new AbortController()
      try {
        const url = getApiUrl(`/api/auth/check-email?email=${encodeURIComponent(clean)}`)
        const res = await fetch(url, { signal: abortController.signal })
        const data = await res.json()

        if (res.ok && data.available) {
          status.value = 'available'
          message.value = 'Correo electrónico disponible'
        } else {
          status.value = 'taken'
          message.value = data.message || 'Este correo electrónico ya está registrado.'
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (err instanceof Error && err.name === 'AbortError') return
        status.value = 'idle'
        message.value = ''
      } finally {
        abortController = null
      }
    }, debounceMs)
  })

  onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (abortController) abortController.abort()
  })

  const isValid = computed(() => status.value === 'available')

  return {
    email,
    status,
    message,
    isValid,
  }
}
