<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { usePreferencesStore, type CardDensity } from '@/stores/preferencesStore'
import { useGamesStore } from '@/stores/gamesStore'
import type { ThemeId } from '@/types/theme'
import type { GameStatus } from '@/types/game'

import SetupHeader from '@/components/setup/SetupHeader.vue'
import SetupThemeSection from '@/components/setup/SetupThemeSection.vue'
import SetupDndSection from '@/components/setup/SetupDndSection.vue'
import SetupPreferencesSection from '@/components/setup/SetupPreferencesSection.vue'
import SetupActionBar from '@/components/setup/SetupActionBar.vue'

const router = useRouter()
const theme = useTheme()
const preferencesStore = usePreferencesStore()
const gamesStore = useGamesStore()

// Working state (reactive live changes)
const selectedTheme = ref<ThemeId>(theme.currentTheme.value)
const enableDnD = ref<boolean>(preferencesStore.enableDragAndDrop)
const selectedDefaultTab = ref<GameStatus>(preferencesStore.defaultLibraryTab)
const selectedDensity = ref<CardDensity>(preferencesStore.cardDensity)
const reducedMotion = ref<boolean>(preferencesStore.reducedMotion)

function handleThemeSelect(themeId: ThemeId) {
  selectedTheme.value = themeId
  theme.setTheme(themeId)
}

async function handleSave() {
  preferencesStore.setDragAndDrop(enableDnD.value)
  preferencesStore.setDefaultLibraryTab(selectedDefaultTab.value)
  preferencesStore.setCardDensity(selectedDensity.value)
  preferencesStore.setReducedMotion(reducedMotion.value)
  gamesStore.activeTab = selectedDefaultTab.value

  await preferencesStore.completeSetup(false)
  router.push('/library')
}

async function handleSkip() {
  await preferencesStore.completeSetup(true)
  router.push('/library')
}
</script>

<template>
  <div
    class="w-full flex-1 flex flex-col justify-start py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto select-none transition-colors duration-300"
  >
    <!-- Main Content Container -->
    <div class="relative z-10 max-w-5xl mx-auto w-full space-y-8 sm:space-y-10">
      <!-- Cockpit Header -->
      <SetupHeader />

      <!-- Modules Grid -->
      <div class="space-y-8">
        <!-- MODULE 1: THEME SELECTION -->
        <SetupThemeSection
          v-model="selectedTheme"
          :themes="theme.themes"
          @select="handleThemeSelect"
        />

        <!-- MODULE 2: DRAG & DROP TOGGLE (Reutiliza OptionCard) -->
        <SetupDndSection v-model="enableDnD" />

        <!-- MODULE 3 & 4: INITIAL DEFAULT TAB & DISPLAY DENSITY -->
        <SetupPreferencesSection
          v-model:default-tab="selectedDefaultTab"
          v-model:density="selectedDensity"
          v-model:reduced-motion="reducedMotion"
        />
      </div>

      <!-- Action Cockpit Buttons Bar -->
      <SetupActionBar
        :saving="preferencesStore.saving"
        @save="handleSave"
        @skip="handleSkip"
      />
    </div>
  </div>
</template>
