import type { RequestHandler } from "express";
import { z, type ZodType } from "zod";
import { ApiError } from "../utils/apiError";

interface RequestSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

// Validates the request before it reaches the controller. Invalid input is rejected with 400.
// Usage: router.post("/", validate({ body: createUserSchema }), controller.create)
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    const errors: Record<string, unknown> = {};

    for (const part of ["body", "params", "query"] as const) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        errors[part] = z.flattenError(result.error);
        continue;
      }

      // Replace the raw input with the validated data (unknown fields removed, types converted).
      // req.query is read-only in Express 5, so we redefine it instead of assigning it.
      Object.defineProperty(req, part, { value: result.data, writable: true, enumerable: true });
    }

    if (Object.keys(errors).length > 0) {
      return next(new ApiError(400, "Validation failed", errors));
    }
    next();
  };
}
