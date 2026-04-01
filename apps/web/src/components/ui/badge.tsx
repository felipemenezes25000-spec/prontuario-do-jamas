import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        warning: 'border-transparent bg-warning text-warning-foreground',
        success: 'border-transparent bg-teal-600 text-white',
        info: 'border-transparent bg-blue-600 text-white',
        // Medical status variants
        stable: 'border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        caution: 'border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400',
        critical: 'border-transparent bg-red-500/15 text-red-600 dark:text-red-400',
        // Pulse variant for urgent badges
        pulse:
          'border-transparent bg-red-500/15 text-red-600 dark:text-red-400 animate-pulse',
        // Dot indicator variant
        dot: 'border-transparent bg-secondary text-secondary-foreground pl-2',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type DotColor = 'green' | 'amber' | 'red' | 'blue' | 'gray';

const dotColorMap: Record<DotColor, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  gray: 'bg-gray-400',
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Color of the dot indicator when variant="dot" */
  dotColor?: DotColor;
}

function Badge({ className, variant, dotColor = 'green', children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {variant === 'dot' && (
        <span
          className={cn('mr-1.5 inline-block h-1.5 w-1.5 rounded-full', dotColorMap[dotColor])}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
