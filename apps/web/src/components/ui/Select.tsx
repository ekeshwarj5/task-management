import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900',
        'focus:outline focus:outline-2 focus:outline-indigo-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
