<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'

interface Props {
  /**
   * Valor para uso con v-model en grupos de selección
   */
  modelValue?: any
  /**
   * Valor propio de este card cuando se usa en un grupo
   */
  value?: any
  /**
   * Estado de selección directo (cuando no se usa v-model)
   */
  selected?: boolean
  /**
   * Título principal de la opción
   */
  title?: string
  /**
   * Subtítulo o descriptor secundario (mono-spaced)
   */
  subtitle?: string
  /**
   * Texto explicativo de la opción
   */
  description?: string
  /**
   * Componente de icono (ej. Lucide icon)
   */
  icon?: any
  /**
   * Etiqueta destacada (ej. 'Recomendado', 'Nuevo', 'Beta')
   */
  badge?: string
  /**
   * Variante del badge
   */
  badgeVariant?: 'primary' | 'muted' | 'outline'
  /**
   * Si está deshabilitado
   */
  disabled?: boolean
  /**
   * Si muestra el acento táctico en la esquina superior derecha al estar activo
   */
  cornerAccent?: boolean
  /**
   * Tamaño del card: 'default' para tarjetas de configuración, 'compact' para listados reducidos
   */
  size?: 'default' | 'compact'
  /**
   * Estilo del indicador: 'radio' (círculo con checkmark), 'none'
   */
  indicator?: 'radio' | 'none'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  value: undefined,
  selected: undefined,
  title: '',
  subtitle: '',
  description: '',
  icon: undefined,
  badge: '',
  badgeVariant: 'primary',
  disabled: false,
  cornerAccent: true,
  size: 'default',
  indicator: 'radio',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'select', value: any): void
  (e: 'click', event: MouseEvent): void
}>()

const isSelected = computed<boolean>(() => {
  if (props.selected !== undefined) {
    return Boolean(props.selected)
  }
  if (props.modelValue !== undefined && props.value !== undefined) {
    return props.modelValue === props.value
  }
  return false
})

function handleClick(event: MouseEvent) {
  if (props.disabled) return

  const targetValue = props.value !== undefined ? props.value : !isSelected.value
  emit('update:modelValue', targetValue)
  emit('select', targetValue)
  emit('click', event)
}

function handleKeydown(event: KeyboardEvent) {
  if (props.disabled) return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleClick(event as unknown as MouseEvent)
  }
}
</script>

<template>
  <button
    type="button"
    role="button"
    :aria-pressed="isSelected"
    :aria-disabled="disabled"
    :disabled="disabled"
    tabindex="0"
    @click="handleClick"
    @keydown="handleKeydown"
    class="group relative w-full text-left rounded-[4px] border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 select-none"
    :class="[
      size === 'compact' ? 'p-3 gap-2' : 'p-4 gap-3',
      disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'active:scale-[0.99]',
    ]"
    :style="{
      backgroundColor: 'var(--app-surface)',
      borderColor: isSelected ? 'var(--app-primary)' : 'var(--app-border)',
      boxShadow: isSelected ? '0 0 20px var(--app-glow)' : 'none',
      '--tw-ring-color': 'var(--app-primary)',
      '--tw-ring-offset-color': 'var(--app-bg)',
    }"
  >
    <!-- Tactical Corner Accent Marker on active -->
    <div
      v-if="isSelected && cornerAccent"
      class="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 pointer-events-none transition-opacity"
      :style="{ borderColor: 'var(--app-primary)' }"
    />

    <!-- Header / Meta section -->
    <div class="flex items-start justify-between gap-3 w-full">
      <div class="flex items-center gap-2.5 min-w-0">
        <!-- Icon container -->
        <slot name="icon">
          <div
            v-if="icon"
            class="rounded-[4px] flex items-center justify-center border shrink-0 transition-colors duration-150"
            :class="size === 'compact' ? 'w-7 h-7' : 'w-8 h-8'"
            :style="{
              backgroundColor: isSelected ? 'var(--app-surface-hover)' : 'var(--app-surface)',
              borderColor: isSelected ? 'var(--app-primary)' : 'var(--app-border)',
              color: isSelected ? 'var(--app-primary)' : 'var(--app-text-muted)',
            }"
          >
            <component :is="icon" :class="size === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4'" />
          </div>
        </slot>

        <!-- Titles & Badge -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <slot name="title">
              <h3
                class="font-display font-bold leading-tight truncate"
                :class="size === 'compact' ? 'text-xs' : 'text-xs sm:text-sm'"
                :style="{ color: 'var(--app-text)' }"
              >
                {{ title }}
              </h3>
            </slot>

            <slot name="badge">
              <span
                v-if="badge"
                class="px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold tracking-wider uppercase shrink-0"
                :style="{
                  backgroundColor:
                    badgeVariant === 'primary' ? 'var(--app-primary)' : 'var(--app-surface-hover)',
                  color:
                    badgeVariant === 'primary' ? '#ffffff' : 'var(--app-text-muted)',
                  border:
                    badgeVariant === 'outline' ? '1px solid var(--app-border)' : 'none',
                }"
              >
                {{ badge }}
              </span>
            </slot>
          </div>

          <slot name="subtitle">
            <span
              v-if="subtitle"
              class="text-[11px] font-mono opacity-60 block mt-0.5 truncate"
              :style="{ color: 'var(--app-text-muted)' }"
            >
              {{ subtitle }}
            </span>
          </slot>
        </div>
      </div>

      <!-- Selection Indicator (Radio / Check) -->
      <slot name="indicator" :selected="isSelected">
        <span
          v-if="indicator === 'radio'"
          class="w-5 h-5 rounded-full flex items-center justify-center border shrink-0 transition-all duration-150"
          :style="{
            backgroundColor: isSelected ? 'var(--app-primary)' : 'transparent',
            borderColor: isSelected ? 'var(--app-primary)' : 'var(--app-border)',
            color: '#ffffff',
          }"
        >
          <Check v-if="isSelected" class="w-3 h-3 stroke-3" />
        </span>
      </slot>
    </div>

    <!-- Body Description / Content Slot -->
    <slot>
      <p
        v-if="description"
        class="text-xs leading-relaxed mt-1"
        :style="{ color: 'var(--app-text-muted)' }"
      >
        {{ description }}
      </p>
    </slot>

    <!-- Optional Footer / Extra Slot -->
    <div v-if="$slots.footer" class="w-full mt-2 pt-2 border-t" :style="{ borderColor: 'var(--app-border)' }">
      <slot name="footer" />
    </div>
  </button>
</template>
