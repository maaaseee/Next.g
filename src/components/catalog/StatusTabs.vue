<script setup lang="ts">
import { ref } from 'vue';
import { useGamesStore } from '@/stores/gamesStore';
import { useDragAndDrop } from '@/composables/useDragAndDrop';
import type { GameStatus } from '@/types/game';
import { GAME_STATUS_CONFIG } from '@/types/game';
import { Clock, Play, CheckCircle2, Sparkles } from 'lucide-vue-next';

const gamesStore = useGamesStore();
const { isDragging, handleDropOnTab } = useDragAndDrop();

const hoveredTab = ref<GameStatus | null>(null);

const TABS: { id: GameStatus; icon: any }[] = [
  { id: 'BACKLOG', icon: Clock },
  { id: 'COMPLETED', icon: CheckCircle2 },
  { id: 'PLAYING', icon: Play },
  { id: 'WISHLIST', icon: Sparkles },
];

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

function handleDragOver(e: DragEvent, tabId: GameStatus) {
  e.preventDefault();
  hoveredTab.value = tabId;
}

function handleDragLeave() {
  hoveredTab.value = null;
}

function onDrop(tabId: GameStatus) {
  hoveredTab.value = null;
  handleDropOnTab(tabId);
}
</script>

<template>
  <div class="flex items-center justify-between gap-2 overflow-x-auto pb-2 border-b no-scrollbar" :style="{ borderColor: 'var(--app-border)' }">
    <div class="flex items-center gap-1.5 p-1 rounded-lg border" :style="{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        type="button"
        @click="gamesStore.activeTab = tab.id"
        @dragover="handleDragOver($event, tab.id)"
        @dragleave="handleDragLeave"
        @drop="onDrop(tab.id)"
        class="relative flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none"
        :class="[
          gamesStore.activeTab === tab.id
            ? 'shadow-md scale-100'
            : 'opacity-70 hover:opacity-100 hover:bg-white/5',
          isDragging && hoveredTab === tab.id
            ? 'ring-2 ring-[var(--app-primary)] scale-105 bg-[var(--app-primary)]/20'
            : '',
        ]"
        :style="{
          backgroundColor: gamesStore.activeTab === tab.id ? 'var(--app-primary)' : 'transparent',
          color: gamesStore.activeTab === tab.id ? '#ffffff' : 'var(--app-text)',
        }"
      >
        <component :is="tab.icon" class="w-4 h-4 shrink-0" />
        <span>{{ GAME_STATUS_CONFIG[tab.id].label }}</span>
        <!-- Counter Badge -->
        <span
          class="px-2 py-0.5 rounded text-[11px] font-black"
          :style="{
            backgroundColor: gamesStore.activeTab === tab.id ? 'rgba(0,0,0,0.25)' : 'var(--app-surface-hover)',
            color: gamesStore.activeTab === tab.id ? '#ffffff' : 'var(--app-text-muted)',
          }"
        >
          {{ getCount(tab.id) }}
        </span>
      </button>
    </div>
  </div>
</template>
