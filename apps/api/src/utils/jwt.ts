import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: 'user' | 'admin';
}

export const signToken = (payload: JwtPayload): string => {
  const options: SignOptions = { expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, config.JWT_SECRET, options);
};

export const verifyToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, config.JWT_SECRET);
  if (typeof decoded === 'string' || !decoded.sub || !decoded.email) {
    throw new Error('Malformed JWT payload');
  }
  return decoded as JwtPayload;
};
