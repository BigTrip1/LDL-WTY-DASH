import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}

export default function SplitText({ text, className, delay = 0, stagger = 0.03 }: Props) {
  const chars = Array.from(text);
  return (
    <span className={cn('inline-block', className)} aria-label={text}>
      {chars.map((c, i) => (
        <motion.span
          key={i}
          initial={{ y: '120%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: delay + i * stagger, duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
          className="inline-block will-change-transform"
          aria-hidden
        >
          {c === ' ' ? '\u00A0' : c}
        </motion.span>
      ))}
    </span>
  );
}
