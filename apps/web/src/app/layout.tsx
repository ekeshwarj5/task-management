import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/lib/query-provider';
import { AuthProvider } from '@/lib/auth-provider';

export const metadata: Metadata = {
  title: 'Task Manager',
  description: 'Plan, filter, and track tasks.',
};

// Inline script that runs before React hydrates so the initial paint
// already matches the persisted theme. Without this, users see a flash
// of the wrong palette before useTheme() applies the stored value.
const themeBoot = `
(function(){
  try {
    var key = 'task-manager-theme';
    var stored = localStorage.getItem(key) || 'system';
    var effective = stored === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : stored;
    document.documentElement.dataset.theme = effective;
    document.documentElement.classList.toggle('dark', effective === 'dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="min-h-full">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
