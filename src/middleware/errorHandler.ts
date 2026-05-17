import type { Request, Response, NextFunction } from "express";
import { mapPrismaError } from "../utils/prismaErrors";

export class AppError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error(err);

  const payloadTooLarge =
    "type" in err &&
    (err as Error & { type?: string }).type === "entity.too.large";
  if (payloadTooLarge) {
    res.status(413).json({
      error: "Note content is too large",
      message:
        "This note is too large to save (attachments and drawings). Try a smaller file.",
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message, message: err.message });
    return;
  }

  const prismaError = mapPrismaError(err);
  if (prismaError) {
    res.status(prismaError.status).json({
      error: prismaError.error,
      message: prismaError.error,
    });
    return;
  }

  res.status(500).json({
    error: "Internal server error",
    message: "Internal server error",
  });
};
