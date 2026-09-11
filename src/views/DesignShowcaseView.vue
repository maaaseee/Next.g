<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header with Version Selector Tabs -->
    <div class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6" :style="{ borderColor: 'var(--app-border)' }">
      <div>
        <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider mb-2 border" :style="{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)', color: 'var(--app-primary)' }">
          Showcase de UX / UI
        </div>
        <h1 class="text-3xl font-extrabold tracking-tight" :style="{ color: 'var(--app-text)' }">
          Estilos de Categorización de Juegos
        </h1>
        <p class="text-sm mt-1 text-app-text-muted max-w-2xl">
          Compara cómo se comporta y luce cada sistema de selección de estados en los 3 lugares clave: Tarjeta, Buscador y Modal de Detalle.
        </p>
      </div>

      <!-- Version Switcher -->
      <div class="flex items-center gap-1.5 p-1 rounded-xl border self-start md:self-auto bg-black/20" :style="{ borderColor: 'var(--app-border)' }">
        <button
          v-for="v in versions"
          :key="v.id"
          type="button"
          @click="currentVersion = v.id"
          class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer"
          :class="currentVersion === v.id ? 'shadow-sm text-white' : 'text-app-text-muted hover:text-app-text'"
          :style="{
            backgroundColor: currentVersion === v.id ? 'var(--app-primary)' : 'transparent',
          }"
        >
          {{ v.name }}
        </button>
      </div>
    </div>

    <!-- Active Version Description Banner -->
    <div
      class="p-4 rounded-xl border mb-8 flex items-center justify-between gap-4"
      :style="{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }"
    >
      <div>
        <h2 class="text-base font-bold flex items-center gap-2" :style="{ color: 'var(--app-text)' }">
          <span>{{ currentVersionData.name }}</span>
          <span class="text-xs font-mono px-2 py-0.5 rounded border text-app-text-muted" :style="{ borderColor: 'var(--app-border)' }">
            {{ currentVersionData.inspiration }}
          </span>
        </h2>
        <p class="text-xs text-app-text-muted mt-1 leading-relaxed">
          {{ currentVersionData.description }}
        </p>
      </div>
      <div class="text-xs font-mono font-semibold text-app-text-muted shrink-0 hidden sm:block">
        Estado actual: <span class="font-bold uppercase" :style="{ color: currentStatusConfig.color }">{{ currentStatusConfig.label }}</span>
      </div>
    </div>

    <!-- 3 Contexts Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      
      <!-- CONTEXT 1: Game Card (Catálogo) -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold font-mono uppercase tracking-wider text-app-text-muted">
            1. En la Tarjeta (Catálogo)
          </h3>
          <span class="text-[10px] text-app-text-muted">Hover para interactuar</span>
        </div>

        <!-- Simulated Card Container -->
        <div class="w-full max-w-65 mx-auto">
          <!-- Card V1: Segmented Pill -->
          <div
            v-if="currentVersion === 'segmented'"
            class="group relative rounded-xl overflow-hidden border shadow-lg transition-all duration-300 flex flex-col justify-end"
            :style="{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)', aspectRatio: '3 / 4.2' }"
          >
            <img :src="mockGame.cover_url" class="absolute inset-0 w-full h-full object-cover" />
            <div class="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent"></div>
            
            <div class="relative z-10 p-3 space-y-2">
              <span class="text-xs font-bold text-white leading-tight block truncate drop-shadow-sm">{{ mockGame.title }}</span>
              <!-- Segmented Slider at bottom of card -->
              <div class="p-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 flex items-center gap-1">
                <button
                  v-for="s in statusList"
                  :key="s.id"
                  @click.stop="activeStatus = s.id"
                  class="flex-1 py-1 rounded flex items-center justify-center transition-all cursor-pointer"
                  :class="activeStatus === s.id ? 'text-white shadow-sm' : 'text-white/40 hover:text-white/80'"
                  :style="{ backgroundColor: activeStatus === s.id ? s.color : 'transparent' }"
                  :title="s.label"
                >
                  <component :is="s.icon" class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Card V2: Cyberpunk Neon -->
          <div
            v-else-if="currentVersion === 'cyberpunk'"
            class="group relative rounded-xl overflow-hidden border transition-all duration-300 flex flex-col justify-between p-3"
            :style="{
              backgroundColor: 'var(--app-surface)',
              borderColor: activeStatusConfig.color,
              boxShadow: `0 0 20px ${activeStatusConfig.color}25`,
              aspectRatio: '3 / 4.2',
            }"
          >
            <img :src="mockGame.cover_url" class="absolute inset-0 w-full h-full object-cover" />
            <div class="absolute inset-0 bg-linear-to-t from-black/95 via-transparent to-black/60"></div>

            <!-- Top Neon Badge -->
            <div class="relative z-10 flex justify-between items-start">
              <div
                class="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider border shadow-md flex items-center gap-1.5"
                :style="{
                  backgroundColor: 'rgba(0,0,0,0.85)',
                  borderColor: activeStatusConfig.color,
                  color: activeStatusConfig.color,
                }"
              >
                <span class="w-1.5 h-1.5 rounded-full animate-ping" :style="{ backgroundColor: activeStatusConfig.color }"></span>
                {{ activeStatusConfig.label }}
              </div>
            </div>

            <!-- Bottom Neon Quick Toggle -->
            <div class="relative z-10 space-y-1.5">
              <span class="text-xs font-bold text-white leading-tight block truncate">{{ mockGame.title }}</span>
              <div class="grid grid-cols-4 gap-1 pt-1 border-t border-white/10">
                <button
                  v-for="s in statusList"
                  :key="s.id"
                  @click.stop="activeStatus = s.id"
                  class="py-1 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center justify-center"
                  :class="activeStatus === s.id ? 'text-black font-black' : 'text-white/60 hover:text-white border border-white/10'"
                  :style="{ backgroundColor: activeStatus === s.id ? s.color : 'rgba(0,0,0,0.6)' }"
                >
                  <component :is="s.icon" class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <!-- Card V3: Minimalist Popover -->
          <div
            v-else-if="currentVersion === 'minimal'"
            class="group relative rounded-xl overflow-hidden border shadow-md transition-all duration-300 flex flex-col justify-between p-3"
            :style="{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)', aspectRatio: '3 / 4.2' }"
          >
            <img :src="mockGame.cover_url" class="absolute inset-0 w-full h-full object-cover" />
            <div class="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent"></div>

            <!-- Floating Dot Status in Top Corner -->
            <div class="relative z-10 flex justify-end">
              <div class="p-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 flex items-center gap-1.5 px-2 py-0.5">
                <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: activeStatusConfig.color }"></span>
                <span class="text-[10px] font-semibold text-white/90">{{ activeStatusConfig.label }}</span>
              </div>
            </div>

            <!-- Clean Bottom Info -->
            <div class="relative z-10">
              <span class="text-xs font-bold text-white block truncate">{{ mockGame.title }}</span>
              <span class="text-[10px] text-white/60 font-mono">Arrastra para mover de lista</span>
            </div>
          </div>

          <!-- Card V4: Action Cards / Steam Deck -->
          <div
            v-else-if="currentVersion === 'cards'"
            class="group relative rounded-xl overflow-hidden border shadow-lg transition-all duration-300 flex flex-col justify-end"
            :style="{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)', aspectRatio: '3 / 4.2' }"
          >
            <img :src="mockGame.cover_url" class="absolute inset-0 w-full h-full object-cover" />
            <div class="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent"></div>

            <div class="relative z-10 p-3">
              <span class="text-xs font-bold text-white block truncate mb-1.5">{{ mockGame.title }}</span>
              <!-- Interactive expand on card bottom -->
              <div class="flex items-center justify-between p-1.5 rounded-lg bg-black/80 border border-white/15 text-xs text-white/90">
                <div class="flex items-center gap-1.5">
                  <component :is="activeStatusConfig.icon" class="w-3.5 h-3.5" :style="{ color: activeStatusConfig.color }" />
                  <span class="font-semibold text-[11px]">{{ activeStatusConfig.label }}</span>
                </div>
                <div class="flex gap-1">
                  <button
                    v-for="s in statusList.filter(x => x.id !== activeStatus).slice(0, 2)"
                    :key="s.id"
                    @click.stop="activeStatus = s.id"
                    class="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                    :title="`Cambiar a ${s.label}`"
                  >
                    <component :is="s.icon" class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CONTEXT 2: Search Row (Buscador Ctrl+K) -->
      <div class="flex flex-col gap-3">
        <h3 class="text-xs font-bold font-mono uppercase tracking-wider text-app-text-muted">
          2. En el Buscador (Ctrl + K)
        </h3>

        <!-- Simulated Search Modal Row -->
        <div
          class="p-3.5 rounded-xl border flex items-center justify-between gap-3 shadow-sm"
          :style="{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }"
        >
          <!-- Game Info -->
          <div class="flex items-center gap-3 min-w-0">
            <img :src="mockGame.cover_url" class="w-12 h-14 object-cover rounded-lg shrink-0 border border-white/10" />
            <div class="min-w-0">
              <span class="text-xs font-bold block truncate" :style="{ color: 'var(--app-text)' }">{{ mockGame.title }}</span>
              <span class="text-[11px] text-app-text-muted">2015 • RPG</span>
            </div>
          </div>

          <!-- Action V1: Segmented mini buttons directly in row -->
          <div v-if="currentVersion === 'segmented'" class="shrink-0 flex items-center p-1 rounded-lg bg-black/20 border" :style="{ borderColor: 'var(--app-border)' }">
            <button
              v-for="s in statusList"
              :key="s.id"
              @click="activeStatus = s.id"
              class="px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
              :class="activeStatus === s.id ? 'text-white shadow-xs' : 'text-app-text-muted hover:text-app-text'"
              :style="{ backgroundColor: activeStatus === s.id ? s.color : 'transparent' }"
            >
              <component :is="s.icon" class="w-3 h-3" />
              <span class="hidden sm:inline text-[10px]">{{ s.label }}</span>
            </button>
          </div>

          <!-- Action V2: Cyberpunk Neon Pill -->
          <div v-else-if="currentVersion === 'cyberpunk'" class="shrink-0 relative">
            <button
              type="button"
              @click="showSearchDropdown = !showSearchDropdown"
              class="px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase border flex items-center gap-2 cursor-pointer transition-all"
              :style="{
                backgroundColor: 'rgba(0,0,0,0.6)',
                borderColor: activeStatusConfig.color,
                color: activeStatusConfig.color,
                boxShadow: `0 0 12px ${activeStatusConfig.color}30`,
              }"
            >
              <component :is="activeStatusConfig.icon" class="w-3.5 h-3.5" />
              <span>{{ activeStatusConfig.label }}</span>
              <ChevronDown class="w-3 h-3 opacity-60" />
            </button>

            <!-- Cyberpunk Dropdown -->
            <div
              v-if="showSearchDropdown"
              class="absolute right-0 top-full mt-1.5 z-30 w-44 rounded-xl border p-1 shadow-2xl bg-black/90 backdrop-blur-md"
              :style="{ borderColor: activeStatusConfig.color }"
            >
              <button
                v-for="s in statusList"
                :key="s.id"
                @click="activeStatus = s.id; showSearchDropdown = false"
                class="w-full px-3 py-2 rounded-lg text-xs font-mono font-bold uppercase flex items-center justify-between text-left transition-colors cursor-pointer"
                :class="activeStatus === s.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'"
              >
                <div class="flex items-center gap-2">
                  <component :is="s.icon" class="w-3.5 h-3.5" :style="{ color: s.color }" />
                  <span>{{ s.label }}</span>
                </div>
                <Check v-if="activeStatus === s.id" class="w-3.5 h-3.5" :style="{ color: s.color }" />
              </button>
            </div>
          </div>

          <!-- Action V3: Minimalist Dot Popover -->
          <div v-else-if="currentVersion === 'minimal'" class="shrink-0 relative">
            <button
              type="button"
              @click="showSearchDropdown = !showSearchDropdown"
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors"
              :style="{ backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)', color: 'var(--app-text)' }"
            >
              <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: activeStatusConfig.color }"></span>
              <span>{{ activeStatusConfig.label }}</span>
              <ChevronDown class="w-3 h-3 text-app-text-muted" />
            </button>

            <!-- Minimal Popover -->
            <div
              v-if="showSearchDropdown"
              class="absolute right-0 top-full mt-1.5 z-30 w-40 rounded-xl border p-1 shadow-xl"
              :style="{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }"
            >
              <button
                v-for="s in statusList"
                :key="s.id"
                @click="activeStatus = s.id; showSearchDropdown = false"
                class="w-full px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer"
                :class="activeStatus === s.id ? 'bg-white/10 text-app-text font-bold' : 'text-app-text-muted hover:text-app-text hover:bg-white/5'"
              >
                <div class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: s.color }"></span>
                  <span>{{ s.label }}</span>
                </div>
                <Check v-if="activeStatus === s.id" class="w-3 h-3 text-app-primary" />
              </button>
            </div>
          </div>

          <!-- Action V4: Action Cards / Subtitled Dropdown -->
          <div v-else-if="currentVersion === 'cards'" class="shrink-0 relative">
            <button
              type="button"
              @click="showSearchDropdown = !showSearchDropdown"
              class="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
              :style="{ backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)', color: 'var(--app-text)' }"
            >
              <component :is="activeStatusConfig.icon" class="w-3.5 h-3.5" :style="{ color: activeStatusConfig.color }" />
              <span>{{ activeStatusConfig.label }}</span>
              <ChevronDown class="w-3.5 h-3.5 text-app-text-muted" />
            </button>

            <!-- Subtitled Dropdown -->
            <div
              v-if="showSearchDropdown"
              class="absolute right-0 top-full mt-2 z-30 w-56 rounded-2xl border p-1.5 shadow-2xl space-y-1"
              :style="{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }"
            >
              <button
                v-for="s in statusList"
                :key="s.id"
                @click="activeStatus = s.id; showSearchDropdown = false"
                class="w-full p-2 rounded-xl text-left transition-all cursor-pointer flex items-center gap-2.5"
                :class="activeStatus === s.id ? 'bg-white/10' : 'hover:bg-white/5'"
              >
                <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" :style="{ backgroundColor: `${s.color}20`, color: s.color }">
                  <component :is="s.icon" class="w-4 h-4" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-bold" :style="{ color: 'var(--app-text)' }">{{ s.label }}</div>
                  <div class="text-[10px] text-app-text-muted truncate">{{ s.desc }}</div>
                </div>
                <Check v-if="activeStatus === s.id" class="w-4 h-4 text-emerald-400 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- CONTEXT 3: Game Detail Modal (Modal de Detalle) -->
      <div class="flex flex-col gap-3">
        <h3 class="text-xs font-bold font-mono uppercase tracking-wider text-app-text-muted">
          3. En el Modal de Detalle
        </h3>

        <div
          class="p-4 rounded-xl border shadow-sm space-y-4"
          :style="{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }"
        >
          <div class="flex items-center justify-between border-b pb-2" :style="{ borderColor: 'var(--app-border)' }">
            <span class="text-xs font-bold text-app-text-muted">Mover de categoría:</span>
            <span class="text-[11px] font-mono" :style="{ color: activeStatusConfig.color }">
              ● {{ activeStatusConfig.label }}
            </span>
          </div>

          <!-- Modal Action V1: Segmented Pill Slider (Continuous bar) -->
          <div v-if="currentVersion === 'segmented'" class="space-y-2">
            <div class="p-1 rounded-xl bg-black/30 border flex items-center gap-1" :style="{ borderColor: 'var(--app-border)' }">
              <button
                v-for="s in statusList"
                :key="s.id"
                @click="activeStatus = s.id"
                class="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer"
                :class="activeStatus === s.id ? 'text-white shadow-md' : 'text-app-text-muted hover:text-app-text hover:bg-white/5'"
                :style="{ backgroundColor: activeStatus === s.id ? s.color : 'transparent' }"
              >
                <component :is="s.icon" class="w-4 h-4" />
                <span>{{ s.label }}</span>
              </button>
            </div>
            <p class="text-[11px] text-app-text-muted text-center">
              Cambio táctil directo de 1 solo clic con respuesta instantánea.
            </p>
          </div>

          <!-- Modal Action V2: Cyberpunk Neon Grid -->
          <div v-else-if="currentVersion === 'cyberpunk'" class="grid grid-cols-2 gap-2">
            <button
              v-for="s in statusList"
              :key="s.id"
              @click="activeStatus = s.id"
              class="p-3 rounded-xl border text-left font-mono transition-all cursor-pointer flex flex-col justify-between h-20"
              :style="{
                backgroundColor: activeStatus === s.id ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.3)',
                borderColor: activeStatus === s.id ? s.color : 'var(--app-border)',
                boxShadow: activeStatus === s.id ? `0 0 16px ${s.color}40` : 'none',
              }"
            >
              <div class="flex items-center justify-between">
                <component :is="s.icon" class="w-4 h-4" :style="{ color: s.color }" />
                <span v-if="activeStatus === s.id" class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/10" :style="{ color: s.color }">ACTIVO</span>
              </div>
              <div class="text-xs font-bold uppercase tracking-wider text-white">
                {{ s.label }}
              </div>
            </button>
          </div>

          <!-- Modal Action V3: Minimalist Compact Dropdown in Header -->
          <div v-else-if="currentVersion === 'minimal'" class="space-y-3">
            <div class="p-3 rounded-xl border flex items-center justify-between" :style="{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: activeStatusConfig.color }"></span>
                <span class="text-xs font-bold" :style="{ color: 'var(--app-text)' }">Estado actual:</span>
              </div>
              <select
                :value="activeStatus"
                @change="activeStatus = ($event.target as HTMLSelectElement).value as any"
                class="px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer outline-none"
                :style="{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)', color: 'var(--app-text)' }"
              >
                <option v-for="s in statusList" :key="s.id" :value="s.id">
                  {{ s.label }}
                </option>
              </select>
            </div>
            <p class="text-[11px] text-app-text-muted">
              Diseño ultra-compacto que no roba protagonismo a la descripción del juego.
            </p>
          </div>

          <!-- Modal Action V4: Steam Deck Action Cards with Subtitles -->
          <div v-else-if="currentVersion === 'cards'" class="space-y-2">
            <button
              v-for="s in statusList"
              :key="s.id"
              @click="activeStatus = s.id"
              class="w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between"
              :style="{
                backgroundColor: activeStatus === s.id ? `${s.color}15` : 'transparent',
                borderColor: activeStatus === s.id ? s.color : 'var(--app-border)',
              }"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" :style="{ backgroundColor: `${s.color}25`, color: s.color }">
                  <component :is="s.icon" class="w-4 h-4" />
                </div>
                <div>
                  <div class="text-xs font-bold" :style="{ color: 'var(--app-text)' }">{{ s.label }}</div>
                  <div class="text-[10px] text-app-text-muted">{{ s.desc }}</div>
                </div>
              </div>
              <div v-if="activeStatus === s.id" class="w-5 h-5 rounded-full flex items-center justify-center text-white" :style="{ backgroundColor: s.color }">
                <Check class="w-3 h-3" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Clock,
  Play,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  Check,
} from 'lucide-vue-next';
import type { GameStatus } from '@/types/game';

type DesignVersion = 'segmented' | 'cyberpunk' | 'minimal' | 'cards';

interface VersionItem {
  id: DesignVersion;
  name: string;
}

interface StatusItem {
  id: GameStatus;
  label: string;
  desc: string;
  color: string;
  icon: any;
}

const currentVersion = ref<DesignVersion>('segmented');
const activeStatus = ref<GameStatus>('PLAYING');
const showSearchDropdown = ref(false);

const versions: VersionItem[] = [
  { id: 'segmented', name: '1. Segmented Pill' },
  { id: 'cyberpunk', name: '2. Cyberpunk Neon' },
  { id: 'minimal', name: '3. Minimalist Popover' },
  { id: 'cards', name: '4. Action Cards' },
];

const statusList: StatusItem[] = [
  { id: 'BACKLOG', label: 'Backlog', desc: 'Pendiente por comenzar', color: '#f59e0b', icon: Clock },
  { id: 'PLAYING', label: 'Jugando', desc: 'En progreso actualmente', color: '#10b981', icon: Play },
  { id: 'COMPLETED', label: 'Completado', desc: 'Terminado o platinado', color: '#0ea5e9', icon: CheckCircle2 },
  { id: 'WISHLIST', label: 'Deseados', desc: 'Próxima compra o estreno', color: '#a855f7', icon: Sparkles },
];

const mockGame = {
  id: 1,
  title: 'The Witcher 3: Wild Hunt',
  cover_url: 'https://media.rawg.io/media/games/618/618c2031a07077a942a7b8e5c7ecc800.jpg',
  release_year: 2015,
};

const DEFAULT_STATUS: StatusItem = {
  id: 'BACKLOG',
  label: 'Backlog',
  desc: 'Pendiente por comenzar',
  color: '#f59e0b',
  icon: Clock,
};

const activeStatusConfig = computed<StatusItem>(() => {
  const found = statusList.find((s) => s.id === activeStatus.value);
  return found || DEFAULT_STATUS;
});

const currentStatusConfig = computed<StatusItem>(() => activeStatusConfig.value);

const currentVersionData = computed(() => {
  switch (currentVersion.value) {
    case 'segmented':
      return {
        name: 'Segmented Pill (Slider Físico)',
        inspiration: 'Estilo Apple Arcade / Consola Moderna',
        description: 'Todo accesible en 1 solo toque horizontal. Fondo continuo integrado, ideal para máxima rapidez sin menús desplegables.',
      };
    case 'cyberpunk':
      return {
        name: 'Cyberpunk Neon Glow',
        inspiration: 'Estilo Riot Games / Cyberpunk 2077',
        description: 'Bordes luminosos con brillo difuso, esquinas afiladas y tipografía mono. Máxima inmersión visual gamer.',
      };
    case 'minimal':
      return {
        name: 'Minimalist Popover con Dot',
        inspiration: 'Estilo Linear / Raycast / Notion',
        description: 'La portada del juego queda 100% limpia. Indicador discreto con punto de color pulsante y popover rápido.',
      };
    case 'cards':
      return {
        name: 'Action Cards con Subtítulos',
        inspiration: 'Estilo Steam Deck UI',
        description: 'Enfocado en claridad y contexto. Cada categoría explica qué significa (Pendiente, En progreso, etc.) para que nadie se pierda.',
      };
  }
});
</script>
