import { ref, computed, watch, onUnmounted, type Ref } from 'vue'
import { getApiUrl } from '@/config/api.config'

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export interface UseUsernameValidationOptions {
  initialValue?: string
  minLength?: number
  maxLength?: number
  debounceMs?: number
  currentName?: Ref<string | undefined> | (() => string | undefined)
}

/**
 * Composable for real-time, debounced username/gamertag validation against the backend.
 */
export function useUsernameValidation(options: UseUsernameValidationOptions = {}) {
  const {
    initialValue = '',
    minLength = 2,
    maxLength = 50,
    debounceMs = 400,
    currentName,
  } = options

  const username = ref(initialValue)
  const status = ref<UsernameStatus>('idle')
  const message = ref('')
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let abortController: AbortController | null = null

  function getCurrentName(): string | undefined {
    if (!currentName) return undefined
    return typeof currentName === 'function' ? currentName() : currentName.value
  }

  watch(username, (newVal) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (abortController) {
      abortController.abort()
      abortController = null
    }

    const clean = newVal.trim()

    if (clean.length === 0) {
      status.value = 'idle'
      message.value = ''
      return
    }

    if (clean.length < minLength) {
      status.value = 'invalid'
      message.value = `El nombre de usuario debe tener al menos ${minLength} caracteres.`
      return
    }

    if (clean.length > maxLength) {
      status.value = 'invalid'
      message.value = `El nombre de usuario no puede exceder los ${maxLength} caracteres.`
      return
    }

    // If user kept their current/suggested name, treat it as available
    const current = getCurrentName()?.trim()
    if (current && clean.toLowerCase() === current.toLowerCase()) {
      status.value = 'available'
      message.value = 'Este es tu nombre actual sugerido.'
      return
    }

    status.value = 'checking'
    message.value = 'Comprobando disponibilidad...'

    debounceTimer = setTimeout(async () => {
      abortController = new AbortController()
      try {
        const url = getApiUrl(`/api/auth/check-username?username=${encodeURIComponent(clean)}`)
        const res = await fetch(url, { signal: abortController.signal })
        const data = await res.json()

        if (res.ok && data.available) {
          status.value = 'available'
          message.value = '¡Este nombre de usuario está disponible!'
        } else {
          status.value = 'taken'
          message.value = data.message || 'Este nombre de usuario ya está ocupado por otra persona.'
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

  const isAvailable = computed(() => status.value === 'available')

  return {
    username,
    status,
    message,
    isAvailable,
  }
}
