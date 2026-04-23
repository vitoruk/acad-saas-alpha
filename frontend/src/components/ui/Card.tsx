import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-6 shadow-card',
        'border-slate-200 text-slate-900',
        'dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
        className,
      )}
    >
      {children}
    </div>
  );
}
