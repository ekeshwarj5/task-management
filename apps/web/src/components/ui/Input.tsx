import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900',
      'placeholder:text-zinc-400',
      'focus:outline focus:outline-2 focus:outline-indigo-500',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
