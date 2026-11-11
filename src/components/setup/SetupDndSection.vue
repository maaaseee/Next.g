<script setup lang="ts">
import { Sliders, Move, MousePointerClick } from 'lucide-vue-next'
import OptionCard from '@/components/common/OptionCard.vue'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

function setDnD(value: boolean) {
  emit('update:modelValue', value)
}
</script>

<template>
  <section class="space-y-3">
    <div class="flex items-center gap-2">
      <Sliders class="w-4 h-4" :style="{ color: 'var(--app-primary)' }" />
      <h2 class="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider">
        02. Mecánica de la Biblioteca (Drag & Drop)
      </h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      <!-- Mode A: Kinetic Drag & Drop -->
      <OptionCard
        :selected="modelValue"
        @click="setDnD(true)"
        :icon="Move"
        title="Drag & Drop Cinético"
        badge="Recomendado"
        subtitle="Arrastre fluido con aceleración por puntero"
        description="Mueve juegos entre columnas arrastrándolos con el cursor. Activa los portales laterales manteniendo la tarjeta en el borde para cambiar de vista sin soltar el clic."
      />

      <!-- Mode B: Button Controls (DnD Deactivated) -->
      <OptionCard
        :selected="!modelValue"
        @click="setDnD(false)"
        :icon="MousePointerClick"
        title="Controles Clásicos por Botonera"
        subtitle="Ideal para trackpads o mouses de alta sensibilidad"
        description="Desactiva el gesto de arrastre en las tarjetas. La categorización se realiza únicamente pulsando los iconos en la barra de cada juego, evitando movimientos accidentales."
      />
    </div>
  </section>
</template>
