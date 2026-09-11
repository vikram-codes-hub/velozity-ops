

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    // Maintains correct prototype chain for `instanceof ApiError` checks
    // when compiled down by certain TS targets.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  // Known, expected errors — pass the code/message straight through.
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message },
    });
  }

  // Prisma "record not found" on update/delete — surface as 404 instead
  // of a generic 500, without exposing the raw Prisma error shape.
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2025'
  ) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Resource not found.' },
    });
  }

  // Prisma unique-constraint violation (e.g. duplicate email on signup).
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    return res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'A record with these unique fields already exists.',
      },
    });
  }

  // Prisma foreign-key constraint violation — e.g. deleting a PM who still
  // owns projects (Project.createdById is RESTRICT), or a client that
  // still has projects. Surface as a 409 telling the caller to resolve
  // the dependency first, instead of a raw 500 with a Prisma stack trace.
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2003'
  ) {
    return res.status(409).json({
      error: {
        code: 'FOREIGN_KEY_CONSTRAINT',
        message:
          'This record cannot be deleted or modified because other records still depend on it.',
      },
    });
  }

  // Anything else is unexpected — log the real error for debugging, but
  // never let its message or stack reach the client.
  console.error(`[unhandled error] ${req.method} ${req.originalUrl}`, err);

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong. Please try again.',
    },
  });
}