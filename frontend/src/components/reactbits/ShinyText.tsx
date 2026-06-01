import { cn } from '@/lib/utils';

export default function ShinyText({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('shimmer-text font-semibold', className)}>{children}</span>;
}
