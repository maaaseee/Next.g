import { tv, type VariantProps } from 'tailwind-variants';

export const badgeVariants = tv({
  base: 'inline-flex items-center gap-1 rounded-[2px] px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors',
  variants: {
    variant: {
      default: 'bg-[var(--app-primary)] text-white',
      secondary: 'bg-white/10 text-[var(--app-text)] border border-white/10',
      outline: 'border border-[var(--app-border)] text-[var(--app-text-muted)]',
      success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      destructive: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type BadgeVariants = VariantProps<typeof badgeVariants>;
export { default as Badge } from './Badge.vue';
