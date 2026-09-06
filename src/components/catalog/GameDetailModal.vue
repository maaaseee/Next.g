<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { X, Star, Calendar, Monitor, Tag, Users, Trash2, Play, CheckCircle2, Clock, Sparkles } from 'lucide-vue-next';
import type { UserGame, GameStatus } from '@/types/game';
import { GAME_STATUS_CONFIG } from '@/types/game';
import { useGamesStore } from '@/stores/gamesStore';

const props = defineProps<{
  game: UserGame | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const gamesStore = useGamesStore();

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close');
  }
}

async function handleStatusChange(newStatus: GameStatus) {
  if (!props.game) return;
  await gamesStore.updateGameStatus(props.game.id, newStatus);
}

async function handleDelete() {
  if (!props.game) return;
  await gamesStore.deleteGame(props.game.id);
  emit('close');
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="game"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
      @click.self="emit('close')"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="relative w-full max-w-4xl lg:max-w-5xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col md:flex-row my-auto max-h-[90vh]"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text)',
        }"
      >
        <!-- Close Button -->
        <button
          type="button"
          @click="emit('close')"
          class="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/70 text-white/80 hover:text-white hover:bg-black/90 transition cursor-pointer backdrop-blur-sm"
          aria-label="Cerrar modal"
        >
          <X class="w-5 h-5" />
        </button>

        <!-- Left Column: Cover Image -->
        <div class="w-full md:w-5/12 relative aspect-[3/4] md:aspect-auto shrink-0 bg-black/60 overflow-hidden min-h-[350px] md:min-h-[520px]">
          <img
            v-if="game.cover_url"
            :src="game.cover_url"
            :alt="game.title"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center p-8 text-center">
            <span class="font-display font-bold text-xl">{{ game.title }}</span>
          </div>
          <div class="absolute inset-0 bg-linear-to-t md:bg-linear-to-r from-black/80 via-transparent to-transparent"></div>
        </div>

        <!-- Right Column: Info & Actions -->
        <div class="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto max-h-[85vh]">
          <div>
            <!-- Top Badges -->
            <div class="flex items-center gap-2.5 flex-wrap mb-3">
              <span
                v-if="game.rating"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
              >
                <Star class="w-4 h-4 fill-amber-300" />
                {{ game.rating.toFixed(1) }} / 100
              </span>

              <span
                v-if="game.release_year"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold bg-white/10 text-white/90"
              >
                <Calendar class="w-4 h-4" />
                {{ game.release_year }}
              </span>

              <span
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold border"
                :class="GAME_STATUS_CONFIG[game.status].badgeClass"
              >
                {{ GAME_STATUS_CONFIG[game.status].label }}
              </span>
            </div>

            <!-- Title -->
            <h2 class="text-3xl md:text-4xl font-display font-extrabold leading-tight mb-4 tracking-tight" :style="{ color: 'var(--app-text)' }">
              {{ game.title }}
            </h2>

            <!-- Metadata List -->
            <div class="space-y-3 mb-6 text-sm">
              <div v-if="game.genres?.length" class="flex items-start gap-2.5">
                <Tag class="w-5 h-5 shrink-0 mt-0.5" :style="{ color: 'var(--app-primary)' }" />
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="genre in game.genres"
                    :key="genre"
                    class="px-2.5 py-1 rounded-md text-xs font-semibold"
                    :style="{ backgroundColor: 'var(--app-surface-hover)', color: 'var(--app-text)' }"
                  >
                    {{ genre }}
                  </span>
                </div>
              </div>

              <div v-if="game.platforms?.length" class="flex items-start gap-2.5">
                <Monitor class="w-5 h-5 shrink-0 mt-0.5" :style="{ color: 'var(--app-primary)' }" />
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="platform in game.platforms"
                    :key="platform"
                    class="px-2.5 py-1 rounded-md text-[11px] font-mono uppercase tracking-wider font-semibold"
                    :style="{ backgroundColor: 'var(--app-border)', color: 'var(--app-text-muted)' }"
                  >
                    {{ platform }}
                  </span>
                </div>
              </div>

              <div v-if="game.game_modes?.length" class="flex items-start gap-2.5">
                <Users class="w-5 h-5 shrink-0 mt-0.5" :style="{ color: 'var(--app-primary)' }" />
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="mode in game.game_modes"
                    :key="mode"
                    class="px-2.5 py-1 rounded-md text-xs font-medium"
                    :style="{ backgroundColor: 'var(--app-surface-hover)', color: 'var(--app-text-muted)' }"
                  >
                    {{ mode }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Summary -->
            <div v-if="game.summary" class="text-sm md:text-base leading-relaxed space-y-2 mb-6" :style="{ color: 'var(--app-text-muted)' }">
              <p class="line-clamp-6">
                {{ game.summary }}
              </p>
            </div>
          </div>

          <!-- Bottom Actions: Move Status & Delete -->
          <div class="pt-5 border-t space-y-4" :style="{ borderColor: 'var(--app-border)' }">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-2.5" :style="{ color: 'var(--app-text-muted)' }">
                Cambiar Estado:
              </p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  @click="handleStatusChange('BACKLOG')"
                  class="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold border transition cursor-pointer"
                  :class="game.status === 'BACKLOG' ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'hover:bg-white/5 border-transparent text-amber-400/70'"
                >
                  <Clock class="w-4 h-4" /> Backlog
                </button>
                <button
                  type="button"
                  @click="handleStatusChange('COMPLETED')"
                  class="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold border transition cursor-pointer"
                  :class="game.status === 'COMPLETED' ? 'bg-sky-500/20 text-sky-300 border-sky-500' : 'hover:bg-white/5 border-transparent text-sky-400/70'"
                >
                  <CheckCircle2 class="w-4 h-4" /> Completado
                </button>
                <button
                  type="button"
                  @click="handleStatusChange('PLAYING')"
                  class="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold border transition cursor-pointer"
                  :class="game.status === 'PLAYING' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500' : 'hover:bg-white/5 border-transparent text-emerald-400/70'"
                >
                  <Play class="w-4 h-4" /> Jugando
                </button>
                <button
                  type="button"
                  @click="handleStatusChange('WISHLIST')"
                  class="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold border transition cursor-pointer"
                  :class="game.status === 'WISHLIST' ? 'bg-purple-500/20 text-purple-300 border-purple-500' : 'hover:bg-white/5 border-transparent text-purple-400/70'"
                >
                  <Sparkles class="w-4 h-4" /> Deseado
                </button>
              </div>
            </div>

            <button
              type="button"
              @click="handleDelete"
              class="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg text-sm font-bold text-red-400 hover:bg-red-500/15 border border-red-500/20 transition cursor-pointer"
            >
              <Trash2 class="w-4 h-4" />
              Eliminar de la biblioteca
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
