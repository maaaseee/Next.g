<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { buttonVariants, type ButtonVariants } from './index';
import { cn } from '@/lib/utils';

interface Props {
  variant?: ButtonVariants['variant'];
  size?: ButtonVariants['size'];
  class?: HTMLAttributes['class'];
  as?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  type: 'button',
  disabled: false,
});
</script>

<template>
  <component
    :is="as"
    :type="as === 'button' ? type : undefined"
    :disabled="disabled"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </component>
</template>
