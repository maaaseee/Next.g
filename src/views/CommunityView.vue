<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Users, Loader2 } from 'lucide-vue-next'
import { getApiUrl } from '@/config/api.config'
import type { CommunityUser } from '@/types/auth'

import SearchInput from '@/components/common/SearchInput.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import UserCard from '@/components/common/UserCard.vue'

const users = ref<CommunityUser[]>([])
const loading = ref(true)
const searchQuery = ref('')

const filteredUsers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter((u) => u.name.toLowerCase().includes(q))
})

async function loadCommunity() {
  loading.value = true
  try {
    const res = await fetch(getApiUrl('/api/users?limit=50'))
    if (res.ok) {
      users.value = await res.json()
    }
  } catch (err) {
    console.error('Failed to load community users:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCommunity()
})
</script>

<template>
  <div class="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 flex-1 flex flex-col">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1
          class="text-3xl font-display font-black tracking-tight"
          :style="{ color: 'var(--app-text)' }"
        >
          Comunidad Gamer
        </h1>
        <p class="text-xs sm:text-sm mt-1" :style="{ color: 'var(--app-text-muted)' }">
          Explora los perfiles de otros jugadores, descubre qué están jugando y revisa sus
          colecciones.
        </p>
      </div>

      <!-- Shared Search Input -->
      <div class="w-full md:w-80">
        <SearchInput
          v-model="searchQuery"
          @clear="searchQuery = ''"
          placeholder="Buscar jugador..."
        />
      </div>
    </div>

    <!-- Main Content -->
    <div class="grow">
      <!-- Loading State -->
      <div v-if="loading" class="py-24 flex flex-col items-center justify-center gap-3 opacity-60">
        <Loader2 class="w-8 h-8 animate-spin" :style="{ color: 'var(--app-primary)' }" />
        <p class="text-sm font-medium">Cargando perfiles de la comunidad...</p>
      </div>

      <!-- Shared Empty State -->
      <EmptyState
        v-else-if="filteredUsers.length === 0"
        :icon="Users"
        title="No se encontraron jugadores"
        description="Prueba con otro término de búsqueda."
      />

      <!-- Shared Users Grid -->
      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
      >
        <UserCard
          v-for="u in filteredUsers"
          :key="u.id"
          :user="u"
        />
      </div>
    </div>
  </div>
</template>
