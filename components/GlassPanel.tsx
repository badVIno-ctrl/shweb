import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const padMap = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-7' } as const;

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(function GlassPanel(
  { className, hoverable, padding = 'md', children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'glass-panel rounded-glass border border-white/[0.08] bg-white/[0.04]',
        'backdrop-blur-glass backdrop-saturate-150',
        padMap[padding],
        hoverable && 'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
