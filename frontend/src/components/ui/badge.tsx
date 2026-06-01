import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-jcb-yellow text-black',
        secondary: 'border-jcb-border bg-jcb-surface text-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'border-jcb-border text-foreground',
        ghost: 'border-transparent text-muted-foreground',
        good: 'border-transparent bg-emerald-500/20 text-emerald-300',
        bad: 'border-transparent bg-red-500/20 text-red-300',
        warn: 'border-transparent bg-jcb-yellow/20 text-jcb-yellow2'
      }
    },
    defaultVariants: { variant: 'default' }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...p }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...p} />;
}
