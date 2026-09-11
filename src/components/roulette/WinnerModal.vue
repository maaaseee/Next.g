<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { UserGame } from '@/types/game';
import { formatGameRating } from '@/types/game';
import { useGamesStore } from '@/stores/gamesStore';
import { Star, Calendar, Gamepad2, RotateCcw, X, Check, Target, Layers } from 'lucide-vue-next';

const props = defineProps<{
  game: UserGame | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'spinAgain'): void;
}>();

const gamesStore = useGamesStore();
const isStartingPlay = ref(false);
const playStarted = ref(false);

const handlePlayNow = async () => {
  if (!props.game) return;
  isStartingPlay.value = true;
  try {
    await gamesStore.updateGameStatus(props.game.id, 'PLAYING');
    playStarted.value = true;
    setTimeout(() => {
      emit('close');
      playStarted.value = false;
    }, 1000);
  } finally {
    isStartingPlay.value = false;
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen && game"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      :aria-label="'Juego seleccionado: ' + game.title"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-black/85 transition-opacity"
        @click="emit('close')"
      />

      <!-- Modal Card -->
      <div
        class="relative z-20 w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden transform transition-all duration-200"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
        }"
      >
        <!-- Header Section -->
        <div
          class="p-5 flex items-center justify-between border-b"
          :style="{
            backgroundColor: 'var(--app-surface-hover)',
            borderColor: 'var(--app-border)',
          }"
        >
          <div class="flex items-center gap-2.5">
            <div
              class="w-8 h-8 rounded-md flex items-center justify-center text-white"
              :style="{ backgroundColor: 'var(--app-primary)' }"
            >
              <Target class="w-4 h-4" />
            </div>
            <div>
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider block" :style="{ color: 'var(--app-primary)' }">
                OBJETIVO SELECCIONADO
              </span>
              <h2 class="text-lg sm:text-xl font-display font-bold tracking-tight" :style="{ color: 'var(--app-text)' }">
                {{ game.title }}
              </h2>
            </div>
          </div>

          <button
            type="button"
            @click="emit('close')"
            class="p-1.5 rounded-md cursor-pointer transition-colors hover:bg-white/10"
            :style="{ color: 'var(--app-text-muted)' }"
            aria-label="Cerrar ventana"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Body Content -->
        <div class="p-6 flex flex-col sm:flex-row gap-5 items-center sm:items-start max-h-[60vh] overflow-y-auto">
          <!-- Game Cover -->
          <div class="relative w-36 sm:w-44 aspect-[3/4] rounded-md overflow-hidden shadow-lg shrink-0 border border-white/10 bg-black">
            <img
              v-if="game.cover_url"
              :src="game.cover_url"
              :alt="game.title"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full flex flex-col items-center justify-center p-3 text-center text-gray-500"
            >
              <Gamepad2 class="w-8 h-8 mb-1" />
              <span class="text-[10px] font-bold">{{ game.title }}</span>
            </div>

            <!-- Rating badge -->
            <div
              v-if="formatGameRating(game.rating)"
              class="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/85 border border-amber-500/30 text-amber-300 font-bold text-[11px] flex items-center gap-1 shadow-sm"
            >
              <Star class="w-3 h-3 fill-amber-300 text-amber-300" />
              <span>{{ formatGameRating(game.rating) }}</span>
            </div>
          </div>

          <!-- Game Details -->
          <div class="flex-1 flex flex-col gap-3 text-center sm:text-left min-w-0">
            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              <span
                v-if="game.release_year"
                class="px-2 py-0.5 rounded text-xs font-mono font-semibold"
                :style="{ backgroundColor: 'var(--app-surface-hover)', color: 'var(--app-text)' }"
              >
                <Calendar class="w-3 h-3 inline mr-1 opacity-70" />
                {{ game.release_year }}
              </span>

              <span
                v-for="genre in (game.genres || []).slice(0, 3)"
                :key="genre"
                class="px-2 py-0.5 rounded text-[11px] font-medium"
                :style="{
                  backgroundColor: 'var(--app-surface-hover)',
                  color: 'var(--app-text-muted)',
                }"
              >
                {{ genre }}
              </span>
            </div>

            <!-- Platforms -->
            <div v-if="game.platforms && game.platforms.length > 0" class="flex flex-wrap items-center justify-center sm:justify-start gap-1">
              <span
                v-for="platform in game.platforms.slice(0, 4)"
                :key="platform"
                class="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider"
                :style="{
                  backgroundColor: 'var(--app-border)',
                  color: 'var(--app-text-muted)',
                }"
              >
                {{ platform }}
              </span>
            </div>

            <!-- Synopsis -->
            <p
              v-if="game.summary"
              class="text-xs leading-relaxed line-clamp-4"
              :style="{ color: 'var(--app-text-muted)' }"
            >
              {{ game.summary }}
            </p>
            <p
              v-else
              class="text-xs italic"
              :style="{ color: 'var(--app-text-muted)' }"
            >
              Sin descripción adicional registrada para este título.
            </p>
          </div>
        </div>

        <!-- Footer Actions -->
        <div
          class="p-4 flex flex-col sm:flex-row items-center justify-end gap-2.5 border-t"
          :style="{
            backgroundColor: 'var(--app-surface-hover)',
            borderColor: 'var(--app-border)',
          }"
        >
          <button
            type="button"
            @click="emit('spinAgain')"
            class="w-full sm:w-auto px-4 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer"
            :style="{
              backgroundColor: 'transparent',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text)',
            }"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            Sortear Nuevamente
          </button>

          <button
            type="button"
            @click="handlePlayNow"
            :disabled="isStartingPlay || playStarted"
            class="w-full sm:w-auto px-5 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50 text-white"
            :class="playStarted ? 'bg-emerald-500' : ''"
            :style="{
              backgroundColor: playStarted ? undefined : 'var(--app-primary)',
            }"
          >
            <Check v-if="playStarted" class="w-3.5 h-3.5" />
            <Gamepad2 v-else class="w-3.5 h-3.5" />
            <span>{{ playStarted ? '¡Asignado a Jugando!' : 'Empezar a Jugar' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
