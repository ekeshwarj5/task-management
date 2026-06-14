'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ApiError, fetchMe, login as apiLogin, logout as apiLogout, signup as apiSignup } from './api';

export interface AuthUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthContextValue {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_PATHS = new Set(['/login', '/signup']);

/**
 * Holds auth state in memory and hydrates it on every page load via
 * /auth/me. The JWT lives in an HTTP-only cookie - this provider
 * never touches it directly; the browser handles sending it on each
 * fetch via credentials:'include'.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const router = useRouter();
  const pathname = usePathname();

  // Hydrate on mount.
  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((res) => {
        if (cancelled) return;
        setUser({ id: res.user.sub, email: res.user.email, role: res.user.role });
        setStatus('authenticated');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.statusCode === 401) {
          setUser(null);
          setStatus('unauthenticated');
        } else {
          // Network / server error — treat as unauthenticated; the
          // user will see the login screen and any deeper error surfaces
          // through a normal API call.
          setUser(null);
          setStatus('unauthenticated');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Redirect to /login if unauthenticated on a protected route.
  useEffect(() => {
    if (status === 'unauthenticated' && !PUBLIC_PATHS.has(pathname)) {
      router.replace('/login');
    }
    if (status === 'authenticated' && PUBLIC_PATHS.has(pathname)) {
      router.replace('/tasks');
    }
  }, [status, pathname, router]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    setUser(res.user);
    setStatus('authenticated');
    router.push('/tasks');
  }, [router]);

  const signUp = useCallback(async (email: string, password: string) => {
    const res = await apiSignup(email, password);
    setUser(res.user);
    setStatus('authenticated');
    router.push('/tasks');
  }, [router]);

  const signOut = useCallback(async () => {
    await apiLogout().catch(() => undefined);
    setUser(null);
    setStatus('unauthenticated');
    router.replace('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, status, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
