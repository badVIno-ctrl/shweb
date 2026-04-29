import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
} as const;

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(function GlassButton(
  { className, variant = 'primary', size = 'md', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-glass border font-medium',
        'transition-all duration-200 backdrop-blur-glass backdrop-saturate-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora-2/60',
        'hover:-translate-y-0.5 hover:shadow-glow disabled:opacity-50 disabled:pointer-events-none',
        sizeMap[size],
        variant === 'primary' &&
          'border-white/[0.10] bg-white/[0.06] text-text-primary hover:bg-white/[0.10]',
        variant === 'ghost' &&
          'border-transparent bg-transparent text-text-muted hover:text-text-primary hover:bg-white/[0.04]',
        variant === 'gold' &&
          'border-accent-gold/40 bg-accent-gold/[0.10] text-accent-gold hover:bg-accent-gold/[0.18]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
