import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export const Field = ({ label, htmlFor, hint, error, className, children }: FieldProps) => (
  <div className={cn('space-y-1', className)}>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {label}
    </label>
    {children}
    {error ? (
      <p role="alert" className="text-xs text-red-600 dark:text-red-400">
        {error}
      </p>
    ) : hint ? (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
    ) : null}
  </div>
);
