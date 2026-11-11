<script setup lang="ts">
import {
  Layers,
  Cpu,
  Zap,
  Clock,
  Play,
  CheckCircle2,
  Sparkles,
} from 'lucide-vue-next'
import type { GameStatus } from '@/types/game'
import { GAME_STATUS_CONFIG } from '@/types/game'
import type { CardDensity } from '@/stores/preferencesStore'

interface Props {
  defaultTab: GameStatus
  density: CardDensity
  reducedMotion: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:defaultTab', value: GameStatus): void
  (e: 'update:density', value: CardDensity): void
  (e: 'update:reducedMotion', value: boolean): void
}>()

const STATUS_OPTIONS: { id: GameStatus; label: string; description: string; icon: any }[] = [
  {
    id: 'BACKLOG',
    label: 'Backlog',
    description: 'Pendientes por jugar',
    icon: Clock,
  },
  {
    id: 'PLAYING',
    label: 'Jugando',
    description: 'Títulos activos actualmente',
    icon: Play,
  },
  {
    id: 'COMPLETED',
    label: 'Completados',
    description: 'Juegos finalizados o platinados',
    icon: CheckCircle2,
  },
  {
    id: 'WISHLIST',
    label: 'Deseados',
    description: 'Lanzamientos en radar',
    icon: Sparkles,
  },
]
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- MODULE 3: Default Tab Selector -->
    <section class="space-y-3">
      <div class="flex items-center gap-2">
        <Layers class="w-4 h-4" :style="{ color: 'var(--app-primary)' }" />
        <h2 class="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider">
          03. Pestaña de Inicio en Biblioteca
        </h2>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="st in STATUS_OPTIONS"
          :key="st.id"
          type="button"
          @click="emit('update:defaultTab', st.id)"
          class="p-3 rounded-[4px] border text-left transition-all duration-150 cursor-pointer flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 select-none"
          :style="{
            backgroundColor: 'var(--app-surface)',
            borderColor: defaultTab === st.id ? 'var(--app-primary)' : 'var(--app-border)',
            '--tw-ring-color': 'var(--app-primary)',
          }"
        >
          <component
            :is="st.icon"
            class="w-4 h-4 shrink-0"
            :style="{ color: GAME_STATUS_CONFIG[st.id].color }"
          />
          <div class="min-w-0">
            <p
              class="text-xs font-bold truncate leading-tight"
              :style="{ color: 'var(--app-text)' }"
            >
              {{ st.label }}
            </p>
            <span class="text-[10px] font-mono opacity-50 block truncate">
              {{ st.description }}
            </span>
          </div>
        </button>
      </div>
    </section>

    <!-- MODULE 4: Card Density & Reduced Motion -->
    <section class="space-y-3">
      <div class="flex items-center gap-2">
        <Cpu class="w-4 h-4" :style="{ color: 'var(--app-primary)' }" />
        <h2 class="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider">
          04. Densidad y Rendimiento
        </h2>
      </div>

      <div class="space-y-2">
        <!-- Density selector -->
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            @click="emit('update:density', 'comfortable')"
            class="p-2.5 rounded-[4px] border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 select-none"
            :style="{
              backgroundColor: 'var(--app-surface)',
              borderColor:
                density === 'comfortable' ? 'var(--app-primary)' : 'var(--app-border)',
              color: density === 'comfortable' ? 'var(--app-primary)' : 'var(--app-text)',
              '--tw-ring-color': 'var(--app-primary)',
            }"
          >
            <span>Confortable</span>
          </button>

          <button
            type="button"
            @click="emit('update:density', 'compact')"
            class="p-2.5 rounded-[4px] border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 select-none"
            :style="{
              backgroundColor: 'var(--app-surface)',
              borderColor: density === 'compact' ? 'var(--app-primary)' : 'var(--app-border)',
              color: density === 'compact' ? 'var(--app-primary)' : 'var(--app-text)',
              '--tw-ring-color': 'var(--app-primary)',
            }"
          >
            <span>Compacta</span>
          </button>
        </div>

        <!-- Reduced motion toggle -->
        <label
          class="p-3 rounded-[4px] border flex items-center justify-between cursor-pointer select-none transition-colors hover:border-[var(--app-primary)]/50"
          :style="{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }"
        >
          <div class="flex items-center gap-2">
            <Zap class="w-4 h-4 opacity-50" />
            <div>
              <span class="text-xs font-bold block" :style="{ color: 'var(--app-text)' }">
                Reducir animaciones cinéticas
              </span>
              <span class="text-[10px] font-mono opacity-60">
                Optimiza para terminales de bajo consumo
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            :checked="reducedMotion"
            @change="emit('update:reducedMotion', ($event.target as HTMLInputElement).checked)"
            class="w-4 h-4 rounded-[2px] cursor-pointer"
            :style="{ accentColor: 'var(--app-primary)' }"
          />
        </label>
      </div>
    </section>
  </div>
</template>
