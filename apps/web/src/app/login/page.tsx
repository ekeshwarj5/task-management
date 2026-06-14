import { AuthForm } from '@/components/auth-form';

export default function LoginPage() {
  return (
    <main className="px-4">
      <AuthForm mode="login" />
    </main>
  );
}
