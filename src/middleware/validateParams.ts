import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export const validateParams =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      res.status(400).json({
        error: "Invalid route parameters",
        message: "Invalid route parameters",
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    req.params = result.data as typeof req.params;
    next();
  };
