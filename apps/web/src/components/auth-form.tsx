'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { useAuth } from '@/lib/auth-provider';
import { ApiError } from '@/lib/api';

const Schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
});

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export const AuthForm = ({ mode }: AuthFormProps) => {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = Schema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as 'email' | 'password';
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      if (mode === 'login') await signIn(parsed.data.email, parsed.data.password);
      else await signUp(parsed.data.email, parsed.data.password);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Something went wrong, please try again.';
      setErrors({ form: message });
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'login' ? 'Welcome back' : 'Create your account';
  const cta = mode === 'login' ? 'Sign in' : 'Sign up';
  const altHref = mode === 'login' ? '/signup' : '/login';
  const altText = mode === 'login' ? 'Create an account' : 'Sign in instead';

  return (
    <div className="mx-auto mt-20 w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {mode === 'login'
          ? 'Sign in to manage your tasks.'
          : 'Pick an email and a strong password (8+ characters).'}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <Input
            id="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        {errors.form && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {errors.form}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Please wait…' : cta}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-zinc-500">
        <Link href={altHref} className="font-medium text-indigo-600 hover:underline">
          {altText}
        </Link>
      </p>
    </div>
  );
};
