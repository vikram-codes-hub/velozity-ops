
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { ApiError } from '../middleware/errorHandler';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
  AuthResponseBody,
} from '../types/auth';

const router = Router();

const ACCESS_TOKEN_SECRET = (process.env.ACCESS_TOKEN_SECRET || process.env.JWT_ACCESS_SECRET) as string;
const REFRESH_TOKEN_SECRET = (process.env.REFRESH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET) as string;
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL ?? '15m';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL ?? '7d';
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // keep in sync with REFRESH_TOKEN_TTL

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error(
    'ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must both be set in the environment.'
  );
}

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth', // only sent to /api/auth/* routes, not the whole API
  maxAge: REFRESH_TOKEN_MAX_AGE_MS,
};

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  });
}

function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  });
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', validate({ body: loginSchema }), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // Same error for "no such user" and "wrong password" — don't leak
    // which one it was.
    if (!user) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const accessToken = signAccessToken({ id: user.id, role: user.role });
    const refreshToken = signRefreshToken({
      id: user.id,
      tokenVersion: user.tokenVersion,
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    const body: AuthResponseBody = {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/refresh
// Reads the refresh token from the HttpOnly cookie, verifies it, checks
// tokenVersion still matches the DB (i.e. hasn't been revoked by a logout
// or a forced-logout-all), and issues a brand new access token. Also
// rotates the refresh cookie itself (new token, same tokenVersion) so a
// leaked-but-unused old refresh token has a shrinking window of validity.
// ---------------------------------------------------------------------------

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
      throw new ApiError(401, 'NO_REFRESH_TOKEN', 'No refresh token provided.');
    }

    let payload: RefreshTokenPayload;
    try {
      payload = jwt.verify(token, REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
    } catch {
      throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) {
      throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'User no longer exists.');
    }

    // The core revocation check: if the DB's tokenVersion has moved on
    // (logout, or an admin-triggered "log out everywhere"), this specific
    // refresh token is dead even though its JWT signature is still valid.
    if (user.tokenVersion !== payload.tokenVersion) {
      throw new ApiError(401, 'REFRESH_TOKEN_REVOKED', 'Refresh token has been revoked.');
    }

    const accessToken = signAccessToken({ id: user.id, role: user.role });
    const newRefreshToken = signRefreshToken({
      id: user.id,
      tokenVersion: user.tokenVersion,
    });

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, REFRESH_COOKIE_OPTIONS);

    const body: AuthResponseBody = {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// Bumps tokenVersion server-side (invalidating ALL outstanding refresh
// tokens for this user, across every device/tab, not just this cookie)
// and clears the cookie. If the tokenVersion bump is undesirable for your
// UX (kills other active sessions too), swap this for a per-session
// refresh-token allowlist table instead — noted as a known limitation.
// ---------------------------------------------------------------------------

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];

    if (token) {
      try {
        const payload = jwt.verify(token, REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
        await prisma.user.update({
          where: { id: payload.id },
          data: { tokenVersion: { increment: 1 } },
        });
      } catch {
        // Token was already invalid/expired — nothing to revoke, and we
        // still want to clear the cookie below regardless.
      }
    }

    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;