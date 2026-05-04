import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from './env.js';

export interface JwtPayload {
  userId: string;
  role: 'admin' | 'barber' | 'client' | 'staff';
  // Convenience: barberId/clientId/staffMemberId injected when role-specific
  // record exists. staffMemberId also carries the barberId of the staff's
  // employer for fast scoping in the badge endpoints.
  barberId?: string;
  clientId?: string;
  staffMemberId?: string;
  staffBarberId?: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(payload: Pick<JwtPayload, 'userId'>): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
}
