<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'
import type { CommunityUser } from '@/types/auth'

interface Props {
  user: CommunityUser
}

defineProps<Props>()
</script>

<template>
  <RouterLink
    :to="`/user/${encodeURIComponent(user.name)}`"
    class="group p-5 rounded-[4px] border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-primary)"
    :style="{
      backgroundColor: 'var(--app-surface)',
      borderColor: 'var(--app-border)',
      '--tw-ring-color': 'var(--app-primary)',
    }"
  >
    <div class="flex items-center gap-3.5">
      <!-- Avatar -->
      <img
        v-if="user.avatar_url"
        :src="user.avatar_url"
        :alt="user.name"
        class="w-12 h-12 rounded-full object-cover border"
        :style="{ borderColor: 'var(--app-primary)' }"
      />
      <div
        v-else
        class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base text-white border border-white/10"
        :style="{ backgroundColor: 'var(--app-primary)' }"
      >
        {{ (user.name || 'U').charAt(0).toUpperCase() }}
      </div>

      <!-- Name & Meta -->
      <div class="min-w-0 flex-1">
        <h3
          class="text-sm sm:text-base font-bold truncate group-hover:text-(--app-primary) transition-colors"
          :style="{ color: 'var(--app-text)' }"
        >
          {{ user.name }}
        </h3>
        <span class="text-[11px] font-mono opacity-50 block truncate">
          {{ user.provider ? `@${user.provider}` : 'Jugador' }}
        </span>
      </div>
    </div>

    <!-- Stats Grid -->
    <div
      class="mt-5 pt-3.5 border-t grid grid-cols-3 gap-2 text-center"
      :style="{ borderColor: 'var(--app-border)' }"
    >
      <div class="p-2 rounded-[2px]" :style="{ backgroundColor: 'var(--app-bg)' }">
        <span class="block text-sm font-bold font-mono">{{ user.stats?.total || 0 }}</span>
        <span class="text-[10px] font-mono opacity-60">Total</span>
      </div>
      <div class="p-2 rounded-[2px]" :style="{ backgroundColor: 'var(--app-bg)' }">
        <span class="block text-sm font-bold font-mono text-emerald-400">{{
          user.stats?.playing || 0
        }}</span>
        <span class="text-[10px] font-mono opacity-60">Jugando</span>
      </div>
      <div class="p-2 rounded-[2px]" :style="{ backgroundColor: 'var(--app-bg)' }">
        <span class="block text-sm font-bold font-mono text-sky-400">{{
          user.stats?.completed || 0
        }}</span>
        <span class="text-[10px] font-mono opacity-60">Listos</span>
      </div>
    </div>

    <!-- Action Link -->
    <div
      class="mt-4 flex items-center justify-between text-xs font-semibold group-hover:translate-x-1 transition-transform"
      :style="{ color: 'var(--app-primary)' }"
    >
      <span class="font-mono text-[11px] uppercase tracking-wider">Ver biblioteca</span>
      <ArrowRight class="w-3.5 h-3.5" />
    </div>
  </RouterLink>
</template>
