

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';

export type Role = 'ADMIN' | 'PM' | 'DEVELOPER';

export interface AccessTokenPayload {
  id: string;
  role: Role;
}


declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

if (!ACCESS_TOKEN_SECRET) {
 
  throw new Error('ACCESS_TOKEN_SECRET is not set in the environment.');
}


export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(
      new ApiError(401, 'UNAUTHORIZED', 'Missing or malformed access token.')
    );
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET as string) as AccessTokenPayload;

    if (!payload?.id || !payload?.role) {
      return next(
        new ApiError(401, 'UNAUTHORIZED', 'Access token payload is invalid.')
      );
    }

    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(
        new ApiError(401, 'TOKEN_EXPIRED', 'Access token has expired.')
      );
    }
    return next(
      new ApiError(401, 'UNAUTHORIZED', 'Access token is invalid.')
    );
  }
}


export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
 
      return next(
        new ApiError(500, 'MIDDLEWARE_ORDER_ERROR', 'requireRole used without requireAuth.')
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          'FORBIDDEN',
          `Role '${req.user.role}' is not permitted to access this resource.`
        )
      );
    }

    next();
  };
}