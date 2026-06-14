'use client';

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'task-manager-theme';

const resolveSystem = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const apply = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  const effective = theme === 'system' ? resolveSystem() : theme;
  document.documentElement.dataset.theme = effective;
  document.documentElement.classList.toggle('dark', effective === 'dark');
};

/**
 * Reads + writes the persisted theme. The first paint reads from
 * localStorage before React mounts via the inline script in
 * layout.tsx, so users never see a flash of the wrong palette.
 */
export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'system';
    setThemeState(stored);
    apply(stored);
  }, []);

  const setTheme = (next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
    apply(next);
  };

  return { theme, setTheme };
};
