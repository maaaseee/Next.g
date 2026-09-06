<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Palette, Check, X } from 'lucide-vue-next';
import { useTheme } from '@/composables/useTheme';
import type { ThemeId } from '@/types/theme';

const { currentTheme, themes, setTheme } = useTheme();
const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

function toggleOpen() {
  isOpen.value = !isOpen.value;
}

function handleSelect(id: ThemeId) {
  setTheme(id);
  isOpen.value = false;
}

function handleClickOutside(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div ref="dropdownRef" class="relative">
    <button
      type="button"
      @click.stop="toggleOpen"
      class="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer border"
      :style="{
        backgroundColor: 'var(--app-surface)',
        borderColor: isOpen ? 'var(--app-primary)' : 'var(--app-border)',
        color: 'var(--app-text)',
      }"
      aria-haspopup="true"
      :aria-expanded="isOpen"
      aria-label="Cambiar tema de color"
    >
      <Palette class="w-3.5 h-3.5" :style="{ color: 'var(--app-primary)' }" />
      <span class="hidden sm:inline">Tema</span>
      <!-- Mini Color Swatch -->
      <span
        class="w-2.5 h-2.5 rounded-sm border border-black/30 inline-block shadow-xs"
        :style="{ backgroundColor: 'var(--app-primary)' }"
      ></span>
    </button>

    <!-- Dropdown Menu -->
    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-72 p-2.5 rounded-lg border shadow-2xl z-50 backdrop-blur-md"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
        }"
        role="menu"
        aria-orientation="vertical"
      >
        <div class="flex items-center justify-between pb-2 mb-2 border-b" :style="{ borderColor: 'var(--app-border)' }">
          <span class="text-xs font-bold uppercase tracking-wider" :style="{ color: 'var(--app-text-muted)' }">
            Paletas de Color
          </span>
          <button
            type="button"
            @click="isOpen = false"
            class="p-1 rounded hover:opacity-80 transition cursor-pointer"
            :style="{ color: 'var(--app-text-muted)' }"
            aria-label="Cerrar selector de temas"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <div class="space-y-1" role="none">
          <button
            v-for="theme in themes"
            :key="theme.id"
            type="button"
            @click="handleSelect(theme.id)"
            class="w-full flex items-center justify-between p-2 rounded-md text-left transition-all duration-150 border cursor-pointer group"
            :style="{
              backgroundColor: currentTheme === theme.id ? 'var(--app-surface-hover)' : 'transparent',
              borderColor: currentTheme === theme.id ? 'var(--app-primary)' : 'transparent',
            }"
            role="menuitem"
          >
            <div class="flex items-center gap-3">
              <!-- Palette Preview Trio Swatch -->
              <div class="flex items-center -space-x-1">
                <span
                  class="w-4 h-4 rounded-full border border-black/40 ring-1 ring-white/10"
                  :style="{ backgroundColor: theme.primaryColor }"
                ></span>
                <span
                  class="w-3.5 h-3.5 rounded-full border border-black/40"
                  :style="{ backgroundColor: theme.accentColor }"
                ></span>
                <span
                  class="w-3 h-3 rounded-full border border-black/40"
                  :style="{ backgroundColor: theme.surfaceColor }"
                ></span>
              </div>

              <div>
                <p class="text-xs font-bold" :style="{ color: 'var(--app-text)' }">
                  {{ theme.name }}
                </p>
              </div>
            </div>

            <Check
              v-if="currentTheme === theme.id"
              class="w-4 h-4 shrink-0"
              :style="{ color: 'var(--app-primary)' }"
            />
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>
