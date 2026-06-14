import { redirect } from 'next/navigation';

/**
 * Root route — always redirect to /tasks. AuthProvider takes over from
 * there and bounces unauthenticated users to /login.
 */
export default function RootPage() {
  redirect('/tasks');
}
