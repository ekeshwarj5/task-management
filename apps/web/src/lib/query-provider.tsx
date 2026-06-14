'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

/**
 * One QueryClient instance per app. Defaults tuned for an interactive
 * task UI: data goes stale fast (15s) so list views feel live, no
 * refocus refetches (the user doesn't want their table rearranging
 * when they tab back), one retry on transient failure.
 */
export const QueryProvider = ({ children }: { children: ReactNode }) => {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
