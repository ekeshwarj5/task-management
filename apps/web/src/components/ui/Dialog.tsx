'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Lightweight wrapper around the native <dialog>. Browser handles
 * focus trap, Esc-to-close, and inert background; we just sync open
 * state to the DOM and forward the close event.
 */
export const Dialog = ({ open, onClose, title, description, className, children }: DialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={cn(
        'w-full max-w-lg rounded-lg bg-white p-0 shadow-xl backdrop:bg-black/40',
        'dark:bg-zinc-900 dark:text-zinc-100',
        className,
      )}
    >
      <header className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </header>
      <div className="px-6 py-4">{children}</div>
    </dialog>
  );
};
