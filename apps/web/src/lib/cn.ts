import clsx, { type ClassValue } from 'clsx';

/**
 * Tiny wrapper around clsx for conditional Tailwind classes. Wrapped
 * (rather than importing clsx everywhere) so a future tailwind-merge
 * upgrade is a single-place change.
 */
export const cn = (...inputs: ClassValue[]): string => clsx(inputs);
