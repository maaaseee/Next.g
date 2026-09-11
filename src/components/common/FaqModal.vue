<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
        @click.self="close"
        @keydown.esc="close"
      >
        <div
          class="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          :style="{
            backgroundColor: 'var(--app-card)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text)',
          }"
        >
          <!-- Header -->
          <div
            class="flex items-center justify-between px-6 py-4 border-b shrink-0"
            :style="{ borderColor: 'var(--app-border)' }"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs"
                :style="{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-primary)',
                }"
              >
                <HelpCircle class="w-5 h-5" />
              </div>
              <div>
                <h3 class="text-base font-bold tracking-tight">Preguntas Frecuentes</h3>
                <p class="text-xs text-app-text-muted">Guía de uso y funcionamiento de NEXT.g</p>
              </div>
            </div>

            <button
              type="button"
              @click="close"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-app-text-muted hover:text-app-text hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Cerrar ventana"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Accordion List (Scrollable) -->
          <div class="p-6 overflow-y-auto space-y-3">
            <div
              v-for="(item, index) in faqItems"
              :key="index"
              class="rounded-xl border transition-colors overflow-hidden"
              :style="{
                backgroundColor: openIndex === index ? 'var(--app-surface-hover)' : 'var(--app-surface)',
                borderColor: 'var(--app-border)',
              }"
            >
              <!-- Accordion Header Button -->
              <button
                type="button"
                @click="toggle(index)"
                class="w-full flex items-center justify-between px-4 py-3.5 text-left text-sm font-semibold transition-colors cursor-pointer gap-3"
                :style="{ color: 'var(--app-text)' }"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <component
                    :is="item.icon"
                    class="w-4 h-4 shrink-0"
                    :style="{ color: 'var(--app-primary)' }"
                  />
                  <span class="truncate">{{ item.question }}</span>
                </div>

                <ChevronDown
                  class="w-4 h-4 shrink-0 transition-transform duration-300 ease-in-out"
                  :class="{ 'rotate-180': openIndex === index }"
                  :style="{ color: 'var(--app-text-muted)' }"
                />
              </button>

              <!-- Accordion Body with Smooth CSS Grid Height Transition -->
              <div
                class="grid transition-all duration-300 ease-in-out"
                :class="openIndex === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
              >
                <div class="overflow-hidden">
                  <div
                    class="px-4 pb-4 pt-2 text-xs sm:text-sm text-app-text-muted leading-relaxed border-t"
                    :style="{ borderColor: 'var(--app-border)' }"
                  >
                    {{ item.answer }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div
            class="px-6 py-3.5 border-t flex justify-end shrink-0"
            :style="{ borderColor: 'var(--app-border)', backgroundColor: 'var(--app-surface)' }"
          >
            <button
              type="button"
              @click="close"
              class="px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              :style="{ backgroundColor: 'var(--app-primary)', color: '#ffffff' }"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  HelpCircle,
  X,
  ChevronDown,
  Gamepad2,
  Users,
  Search,
  Dices,
  Palette,
} from 'lucide-vue-next';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const openIndex = ref<number | null>(0); // Primer ítem abierto inicialmente

function toggle(index: number) {
  openIndex.value = openIndex.value === index ? null : index;
}

function close() {
  emit('close');
}

const faqItems = [
  {
    icon: Gamepad2,
    question: '¿Qué es NEXT.g?',
    answer:
      'NEXT.g es un organizador de videojuegos diseñado para centralizar títulos pendientes y resolver la indecisión al elegir a qué jugar mediante una ruleta interactiva.',
  },
  {
    icon: Users,
    question: '¿Por qué el catálogo es compartido?',
    answer:
      'En esta fase inicial de pruebas, todos los usuarios interactúan con una misma biblioteca colectiva en tiempo real. De esta forma es posible probar las funciones y girar la ruleta con un catálogo amplio sin requerir registro previo.',
  },
  {
    icon: Search,
    question: '¿Cómo agregar un juego a la biblioteca?',
    answer:
      'Haz clic en el botón "Buscar juego" en la barra de navegación superior o presiona el atajo de teclado Ctrl + K. Puedes escribir el título y clasificarlo en Backlog, Jugando, Completado o Deseado.',
  },
  {
    icon: Dices,
    question: '¿Cómo funciona la ruleta de selección?',
    answer:
      'En la pestaña Ruleta, selecciona la categoría que deseas filtrar (por ejemplo, juegos pendientes en Backlog) y pulsa "Girar Ruleta". El sistema elegirá un título al azar entre los disponibles.',
  },
  {
    icon: Palette,
    question: '¿Es posible cambiar el tema visual?',
    answer:
      'Sí. En la esquina superior derecha se encuentra el selector de temas, que permite alternar entre distintas paletas de color para personalizar la apariencia de la interfaz.',
  },
];
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
