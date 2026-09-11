// backend/src/middleware/validate.ts
//
// Generic, reusable request-validation middleware built on zod. Every
// write endpoint (and any read endpoint with meaningful query params)
// should run through this instead of hand-rolling a safeParse block per
// route — keeps validation errors in one consistent shape and keeps
// route handlers focused on logic instead of parsing.

import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ApiError } from "./errorHandler";

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        const parsedQuery = schemas.query.parse(req.query);
        Object.defineProperty(req, "query", {
          value: parsedQuery,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      if (schemas.params) {
        const parsedParams = schemas.params.parse(req.params);
        Object.defineProperty(req, "params", {
          value: parsedParams,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new ApiError(400, "VALIDATION_ERROR", formatZodError(err)));
      }
      next(err);
    }
  };
}
