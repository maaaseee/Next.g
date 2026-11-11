import { tv, type VariantProps } from 'tailwind-variants';

export const buttonVariants = tv({
  base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] text-xs sm:text-sm font-semibold transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-95 select-none',
  variants: {
    variant: {
      default: 'bg-[var(--app-primary)] text-white hover:opacity-95 shadow-md',
      secondary: 'bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] hover:bg-white/5',
      outline: 'border border-[var(--app-border)] bg-transparent text-[var(--app-text)] hover:bg-white/5',
      ghost: 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-white/5',
      destructive: 'bg-rose-600 text-white hover:bg-rose-700 shadow-md',
    },
    size: {
      default: 'h-9 px-4 py-2',
      sm: 'h-7.5 rounded-[2px] px-2.5 text-xs',
      lg: 'h-11 rounded-[3px] px-6 text-sm sm:text-base font-bold',
      icon: 'h-8 w-8 p-0',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export type ButtonVariants = VariantProps<typeof buttonVariants>;
export { default as Button } from './Button.vue';
