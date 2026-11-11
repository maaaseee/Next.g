<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Gamepad2, Star } from 'lucide-vue-next'
import type { Game, GameStatus } from '@/types/game'
import { formatGameRating, GAME_STATUS_CONFIG } from '@/types/game'

interface Props {
  game: Game
  rankingIndex?: number
  libraryStatus?: GameStatus | null
}

const props = withDefaults(defineProps<Props>(), {
  rankingIndex: undefined,
  libraryStatus: null,
})

const emit = defineEmits<{
  (e: 'click', game: Game): void
}>()

const router = useRouter()

const formattedRating = computed(() => {
  return formatGameRating(props.game.rating)
})

function handleClick() {
  emit('click', props.game)
  router.push(`/game/${props.game.slug || props.game.id}`)
}
</script>

<template>
  <div
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
    class="group relative flex flex-col rounded-[4px] overflow-hidden border cursor-pointer select-none transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-(--app-primary) hover:ring-1 hover:ring-(--app-primary)/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-primary)"
    :style="{
      backgroundColor: 'var(--app-surface)',
      borderColor: 'var(--app-border)',
    }"
  >
    <!-- Cover Poster -->
    <div class="aspect-3/4 w-full bg-black/40 overflow-hidden relative">
      <img
        v-if="game.cover_url"
        :src="game.cover_url"
        :alt="game.title"
        loading="lazy"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div v-else class="w-full h-full flex items-center justify-center opacity-30">
        <Gamepad2 class="w-10 h-10" />
      </div>

      <!-- Ranking Pill (#1, #2...) -->
      <div
        v-if="rankingIndex !== undefined"
        class="absolute top-2 left-2 px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-black bg-black/80 backdrop-blur-xs text-white border border-white/20 shadow-md"
      >
        #{{ rankingIndex + 1 }}
      </div>

      <!-- Rating Badge -->
      <div
        v-if="formattedRating"
        class="absolute top-2 right-2 px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold flex items-center gap-1 bg-black/80 backdrop-blur-xs text-amber-400 border border-amber-500/30"
      >
        <Star class="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
        <span>{{ formattedRating }}</span>
      </div>

      <!-- Library Status Badge -->
      <div
        v-if="libraryStatus"
        class="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold uppercase tracking-wider backdrop-blur-xs shadow-md border"
        :class="GAME_STATUS_CONFIG[libraryStatus].badgeClass"
      >
        {{ GAME_STATUS_CONFIG[libraryStatus].label }}
      </div>

      <!-- Release Year Badge (shown if no library status badge or placed appropriately) -->
      <span
        v-else-if="game.release_year"
        class="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-bold bg-black/70 text-white/90"
      >
        {{ game.release_year }}
      </span>
    </div>

    <!-- Metadata Footer -->
    <div class="p-2.5 flex flex-col grow justify-between gap-1">
      <h3
        class="text-xs sm:text-sm font-bold line-clamp-1 group-hover:text-(--app-primary) transition-colors leading-tight"
        :style="{ color: 'var(--app-text)' }"
      >
        {{ game.title }}
      </h3>

      <div
        class="flex items-center justify-between text-[10px] font-mono opacity-70"
        :style="{ color: 'var(--app-text-muted)' }"
      >
        <span v-if="libraryStatus && game.release_year">
          {{ game.release_year }}
        </span>
        <span v-if="game.genres && game.genres.length" class="truncate max-w-[85%]">
          {{ game.genres.slice(0, 2).join(', ') }}
        </span>
        <span v-else-if="!libraryStatus && !game.release_year" class="opacity-40">
          S/D
        </span>
      </div>
    </div>
  </div>
</template>
