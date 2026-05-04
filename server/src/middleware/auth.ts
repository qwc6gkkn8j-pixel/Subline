import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type JwtPayload } from '../lib/jwt.js';
import { Forbidden, Unauthorized } from '../lib/errors.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw Unauthorized('Missing or invalid Authorization header');
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    throw Unauthorized('Invalid or expired token', 'token_expired');
  }
}

export function requireRole(...roles: Array<'admin' | 'barber' | 'client' | 'staff'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) throw Unauthorized();
    if (!roles.includes(req.auth.role)) throw Forbidden('Insufficient role');
    next();
  };
}
