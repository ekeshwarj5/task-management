import { z } from 'zod';

/**
 * Signup / login payloads. Same shape because both endpoints take the
 * same fields; we still keep two schemas so future divergence (e.g. a
 * confirm-password field on signup) is a single-place change.
 */
export const CredentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const SignupSchema = CredentialsSchema;
export const LoginSchema = CredentialsSchema;

export type Credentials = z.infer<typeof CredentialsSchema>;
export type Signup = z.infer<typeof SignupSchema>;
export type Login = z.infer<typeof LoginSchema>;

export interface AuthUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
}
