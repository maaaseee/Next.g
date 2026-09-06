<script setup lang="ts">
import { ref, computed } from 'vue';
import { Trash2, CheckCircle2, Play, Clock, Sparkles } from 'lucide-vue-next';
import type { UserGame, GameStatus } from '@/types/game';
import { useGamesStore } from '@/stores/gamesStore';
import { useDragAndDrop } from '@/composables/useDragAndDrop';

const props = defineProps<{
  game: UserGame;
}>();

const emit = defineEmits<{
  (e: 'click', game: UserGame): void;
}>();

const gamesStore = useGamesStore();
const { onDragStart, onDragEnd, draggedGame } = useDragAndDrop();

const imageError = ref(false);
const hoveredActionStatus = ref<GameStatus | null>(null);

const ALL_STATUSES: { id: GameStatus; label: string; actionLabel: string; icon: any; colorClass: string; hoverClass: string }[] = [
  {
    id: 'BACKLOG',
    label: 'Backlog',
    actionLabel: 'Mover a Backlog',
    icon: Clock,
    colorClass: 'text-white/70',
    hoverClass: 'hover:bg-amber-500/20 hover:text-amber-400 hover:scale-110',
  },
  {
    id: 'COMPLETED',
    label: 'Completado',
    actionLabel: 'Mover a Completado',
    icon: CheckCircle2,
    colorClass: 'text-white/70',
    hoverClass: 'hover:bg-sky-500/20 hover:text-sky-400 hover:scale-110',
  },
  {
    id: 'PLAYING',
    label: 'Jugando',
    actionLabel: 'Mover a Jugando',
    icon: Play,
    colorClass: 'text-white/70',
    hoverClass: 'hover:bg-emerald-500/20 hover:text-emerald-400 hover:scale-110',
  },
  {
    id: 'WISHLIST',
    label: 'Deseados',
    actionLabel: 'Mover a Deseados',
    icon: Sparkles,
    colorClass: 'text-white/70',
    hoverClass: 'hover:bg-purple-500/20 hover:text-purple-400 hover:scale-110',
  },
];

// 3 target statuses to switch to (excluding current game status)
const otherStatuses = computed(() => {
  return ALL_STATUSES.filter((s) => s.id !== props.game.status);
});

function handleImageError() {
  imageError.value = true;
}

function handleStatusChange(newStatus: GameStatus) {
  gamesStore.updateGameStatus(props.game.id, newStatus);
}

function handleDelete() {
  gamesStore.deleteGame(props.game.id);
}
</script>

<template>
  <div
    draggable="true"
    @dragstart="onDragStart(game, $event)"
    @dragend="onDragEnd"
    @click="emit('click', game)"
    class="group relative rounded-lg overflow-hidden border transition-all duration-300 cursor-grab active:cursor-grabbing hover:-translate-y-1.5 hover:shadow-2xl shadow-md flex flex-col justify-end select-none"
    :class="[
      draggedGame?.id === game.id ? 'opacity-30 scale-95' : 'opacity-100',
    ]"
    :style="{
      backgroundColor: 'var(--app-surface)',
      borderColor: 'var(--app-border)',
      aspectRatio: '3 / 4.2',
    }"
  >
    <!-- Background Image / Clean Cover (Takes 100% of the visual space) -->
    <div class="absolute inset-0 z-0 bg-black">
      <img
        v-if="game.cover_url && !imageError"
        :src="game.cover_url"
        :alt="game.title"
        loading="lazy"
        decoding="async"
        draggable="false"
        @error="handleImageError"
        class="w-full h-full object-cover object-center pointer-events-none transition-transform duration-500 ease-out"
      />
      <!-- Fallback if cover is missing -->
      <div
        v-else
        class="w-full h-full flex flex-col items-center justify-center p-4 text-center"
        :style="{
          backgroundColor: 'var(--app-surface-hover)',
        }"
      >
        <Sparkles class="w-8 h-8 mb-2 opacity-50" :style="{ color: 'var(--app-primary)' }" />
        <span class="font-display font-bold text-sm line-clamp-3" :style="{ color: 'var(--app-text)' }">
          {{ game.title }}
        </span>
      </div>

      <!-- Dark Vignette Gradient: Only visible on Hover -->
      <div class="absolute inset-0 bg-linear-to-t from-black/95 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>

    <!-- Bottom Content Overlay: Appears smoothly on Hover -->
    <div class="relative z-10 px-2 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
      <!-- Genres -->
      <div v-if="game.genres && game.genres.length > 0" class="flex items-center gap-1 flex-wrap mb-1.5 pointer-events-none">
        <span
          v-for="genre in game.genres.slice(0, 2)"
          :key="genre"
          class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/80 text-white/90 border border-white/10 truncate max-w-27.5"
        >
          {{ genre }}
        </span>
      </div>

      <!-- Title -->
      <h3 class="font-display font-extrabold text-sm leading-snug text-white line-clamp-2 mb-1 group-hover:text-(--app-primary-light) transition-colors drop-shadow-md">
        {{ game.title }}
      </h3>

      <!-- Status Action Bar: Icon-only buttons -->
      <div
        class="relative mt-2 p-1.5 rounded-lg bg-black/70 flex items-center justify-between gap-1 backdrop-blur-sm"
        @click.stop
      >
        <!-- Floating Tooltip showing category name on button hover -->
        <div
          v-if="hoveredActionStatus"
          class="absolute bottom-full left-0 right-0 mb-2 py-1 px-2 rounded-md bg-black/95 border border-white/20 text-center text-[10px] font-bold text-white shadow-2xl pointer-events-none animate-fadeIn z-20"
        >
          {{ ALL_STATUSES.find(s => s.id === hoveredActionStatus)?.actionLabel }}
        </div>

        <!-- 3 Icon-Only Category Switch Buttons -->
        <div class="flex items-center gap-1.5 flex-1">
          <button
            v-for="target in otherStatuses"
            :key="target.id"
            type="button"
            @click.stop="handleStatusChange(target.id)"
            @mouseenter="hoveredActionStatus = target.id"
            @mouseleave="hoveredActionStatus = null"
            :aria-label="target.actionLabel"
            :title="target.actionLabel"
            class="flex-1 flex items-center justify-center p-1.5 rounded-md transition-all duration-150 cursor-pointer active:scale-90"
            :class="[target.colorClass, target.hoverClass]"
          >
            <component :is="target.icon" class="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>

        <!-- Delete Quick Action Button -->
        <button
          type="button"
          @click.stop="handleDelete"
          title="Eliminar de la biblioteca"
          aria-label="Eliminar de la biblioteca"
          class="p-1.5 rounded-md text-white/50 hover:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer shrink-0 hover:scale-110 active:scale-90"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.15s ease-out forwards;
}
</style>
