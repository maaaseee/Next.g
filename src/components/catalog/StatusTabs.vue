<script setup lang="ts">
import { computed, type Component } from 'vue';
import { useGamesStore } from '@/stores/gamesStore';
import { useDragAndDrop } from '@/composables/useDragAndDrop';
import type { GameStatus } from '@/types/game';
import { GAME_STATUS_CONFIG } from '@/types/game';
import { Clock, Play, CheckCircle2, Sparkles, ArrowDownToLine } from 'lucide-vue-next';

const gamesStore = useGamesStore();
const { isDragging, currentOrder, hoveredTab } = useDragAndDrop();

const ICON_MAP: Record<GameStatus, Component> = {
  COMPLETED: CheckCircle2,
  PLAYING: Play,
  BACKLOG: Clock,
  WISHLIST: Sparkles,
};

const orderedTabs = computed(() =>
  currentOrder.value.map((id) => ({
    id,
    icon: ICON_MAP[id],
    config: GAME_STATUS_CONFIG[id],
  }))
);

function getCount(status: GameStatus) {
  switch (status) {
    case 'BACKLOG':
      return gamesStore.backlogGames.length;
    case 'PLAYING':
      return gamesStore.playingGames.length;
    case 'COMPLETED':
      return gamesStore.completedGames.length;
    case 'WISHLIST':
      return gamesStore.wishlistGames.length;
  }
}
</script>

<template>
  <div
    class="w-full pb-2 border-b transition-colors duration-200"
    :style="{ borderColor: 'var(--app-border)' }"
  >
    <div
      class="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-[4px] border w-full transition-all duration-200"
      :style="{
        backgroundColor: 'var(--app-surface)',
        borderColor: isDragging ? 'var(--app-primary)' : 'var(--app-border)',
        boxShadow: isDragging ? '0 0 20px var(--app-glow)' : undefined,
      }"
    >
      <button
        v-for="tab in orderedTabs"
        :key="tab.id"
        type="button"
        :data-drop-tab="tab.id"
        @click="gamesStore.activeTab = tab.id"
        class="relative w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-[4px] text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none border"
        :class="[
          gamesStore.activeTab === tab.id && !isDragging
            ? 'shadow-md text-white border-transparent'
            : 'border-transparent hover:opacity-95',
          isDragging && hoveredTab === tab.id
            ? 'scale-[1.02] shadow-xl text-white z-10'
            : '',
          isDragging && hoveredTab !== tab.id
            ? 'border-dashed opacity-90 hover:opacity-100'
            : '',
        ]"
        :style="{
          backgroundColor:
            isDragging && hoveredTab === tab.id
              ? 'var(--app-primary)'
              : gamesStore.activeTab === tab.id
                ? 'var(--app-primary)'
                : isDragging
                  ? 'var(--app-surface-hover)'
                  : 'transparent',
          borderColor:
            isDragging && hoveredTab === tab.id
              ? 'var(--app-primary-light)'
              : isDragging
                ? 'var(--app-border)'
                : 'transparent',
          color:
            gamesStore.activeTab === tab.id || (isDragging && hoveredTab === tab.id)
              ? '#ffffff'
              : 'var(--app-text)',
          boxShadow:
            isDragging && hoveredTab === tab.id
              ? '0 0 22px var(--app-glow)'
              : undefined,
        }"
      >
        <div class="flex items-center gap-2 min-w-0 pointer-events-none">
          <component
            :is="isDragging && hoveredTab === tab.id ? ArrowDownToLine : tab.icon"
            class="w-4 h-4 shrink-0 transition-transform duration-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]"
            :class="isDragging && hoveredTab === tab.id ? 'animate-bounce' : ''"
            :style="{
              color: tab.config.color,
            }"
          />
          <span class="truncate">
            {{ tab.config.label }}
          </span>
        </div>

        <div class="flex items-center gap-1.5 shrink-0 pointer-events-none">
          <span
            v-if="isDragging"
            class="hidden md:inline-block text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-[2px] border"
            :style="{
              backgroundColor:
                hoveredTab === tab.id ? 'rgba(0, 0, 0, 0.25)' : 'var(--app-surface)',
              borderColor:
                hoveredTab === tab.id ? 'transparent' : 'var(--app-border)',
              color: hoveredTab === tab.id ? '#ffffff' : 'var(--app-text-muted)',
            }"
          >
            {{ hoveredTab === tab.id ? 'Soltar aquí' : 'Mover' }}
          </span>

          <!-- Counter Badge -->
          <span
            class="px-2 py-0.5 rounded-[3px] text-[11px] font-black tabular-nums"
            :style="{
              backgroundColor:
                gamesStore.activeTab === tab.id || (isDragging && hoveredTab === tab.id)
                  ? 'rgba(0, 0, 0, 0.28)'
                  : 'var(--app-surface-hover)',
              color:
                gamesStore.activeTab === tab.id || (isDragging && hoveredTab === tab.id)
                  ? '#ffffff'
                  : 'var(--app-text-muted)',
            }"
          >
            {{ getCount(tab.id) }}
          </span>
        </div>
      </button>
    </div>
  </div>
</template>
