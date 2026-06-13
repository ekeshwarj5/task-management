import bcrypt from 'bcrypt';

/**
 * bcrypt cost factor. 10 is the modern default — fast enough for
 * interactive login (~80 ms) while comfortably outpacing brute-force
 * attempts on stolen hashes.
 */
const BCRYPT_ROUNDS = 10;

export const hashPassword = (plaintext: string): Promise<string> =>
  bcrypt.hash(plaintext, BCRYPT_ROUNDS);

export const verifyPassword = (plaintext: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plaintext, hash);
