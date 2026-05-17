import type { Request, Response } from "express";
import { openApiSpec } from "../openapi/spec";

export const getOpenApi = (_req: Request, res: Response): void => {
  res.status(200).json(openApiSpec);
};

export const getAbout = (_req: Request, res: Response): void => {
  res.status(200).json({
    name: process.env.ABOUT_NAME ?? "Anushka Pandhere",
    email: process.env.ABOUT_EMAIL ?? "anushka.pandhere10@gmail.com",
    "my features": {
      "Cryptographic Audit Ledger":
        "A fintech-inspired versioning system. It captures immutable snapshots of every edit, ensuring document provenance and allowing point-in-time recovery—a critical requirement for collaborative financial documentation.",
    },
  });
};
