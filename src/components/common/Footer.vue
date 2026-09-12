<script setup lang="ts">
import { Code2, ExternalLink, Github, Sparkles } from 'lucide-vue-next';

const APP_VERSION = __APP_VERSION__;
const CURRENT_YEAR = new Date().getFullYear();
</script>

<template>
  <footer
    class="w-full border-t transition-colors duration-200 mt-auto"
    :style="{
      backgroundColor: 'var(--app-surface)',
      borderColor: 'var(--app-border)',
    }"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div class="flex flex-col md:flex-row items-center justify-between gap-6">
        <!-- Brand & App Info -->
        <div class="flex flex-col sm:flex-row items-center sm:items-start gap-3 text-center sm:text-left">
          <div>
            <div class="flex items-center justify-center sm:justify-start gap-2">
              <span class="font-brand text-3xl tracking-wider" :style="{ color: 'var(--app-text)' }">
                NEXT<span :style="{ color: 'var(--app-primary)' }">.g</span>
              </span>
              <span
                class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
                :style="{
                  backgroundColor: 'var(--app-surface-hover)',
                  borderColor: 'var(--app-border)',
                }"
              >
                {{ APP_VERSION }}
              </span>
            </div>
          </div>
        </div>

        <!-- Powered By API Provider Info -->
        <div class="flex items-center gap-2 text-xs" :style="{ color: 'var(--app-text-muted)' }">
          <span class="font-medium">Powered by</span>
          <a
            href="https://rawg.io/apidocs"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-xs border transition-all duration-150 hover:brightness-110"
            :style="{
              backgroundColor: 'var(--app-surface-hover)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text)',
            }"
          >
            <Sparkles class="w-3.5 h-3.5" :style="{ color: 'var(--app-primary)' }" />
            <span>RAWG API</span>
            <ExternalLink class="w-3 h-3 opacity-60" />
          </a>
        </div>

        <!-- Developer Info -->
        <div class="flex items-center gap-2 text-xs">
          <div
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border"
            :style="{
              backgroundColor: 'var(--app-surface-hover)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text)',
            }"
          >
            <Code2 class="w-3.5 h-3.5" :style="{ color: 'var(--app-primary)' }" />
            <span class="font-medium">Desarrollado por</span>
            <a
              href="https://github.com/maaaseee"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 font-bold hover:underline transition-colors"
              :style="{ color: 'var(--app-primary)' }"
            >
              <Github class="w-3.5 h-3.5" />
              maaaseee
            </a>
          </div>
        </div>
      </div>

      <!-- Bottom Meta & Copyright Bar -->
      <div
        class="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono"
        :style="{
          borderColor: 'var(--app-border)',
          color: 'var(--app-text-muted)',
        }"
      >
        <div class="flex items-center gap-2">
          <span>&copy; {{ CURRENT_YEAR }} NEXT.g</span>
          <span>•</span>
          <span>Todos los datos e imágenes provienen de RAWG.</span>
        </div>
      </div>
    </div>
  </footer>
</template>
