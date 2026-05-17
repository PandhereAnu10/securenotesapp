import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { signToken } from "../utils/jwt";
import { verifyGoogleIdToken, isGoogleAuthEnabled } from "../utils/googleAuth";
import { AppError } from "../middleware/errorHandler";

const SALT_ROUNDS = 12;

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, "Email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword },
  });

  await prisma.$executeRaw`
    INSERT INTO user_profiles (id, user_id, email, created_at)
    VALUES (${randomUUID()}, ${user.id}, ${user.email}, NOW())
    ON CONFLICT (user_id) DO NOTHING
  `;

  res.status(201).json({ message: "User registered successfully" });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    res.status(401).json({
      error: "Invalid email or password",
      message: "Invalid email or password",
    });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({
      error: "Invalid email or password",
      message: "Invalid email or password",
    });
    return;
  }

  const access_token = signToken({ userId: user.id, email: user.email });
  res.status(200).json({ access_token });
};

export const getAuthConfig = async (_req: Request, res: Response): Promise<void> => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  res.status(200).json({
    googleClientId: googleClientId || null,
    googleEnabled: isGoogleAuthEnabled(),
  });
};

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  if (!isGoogleAuthEnabled()) {
    throw new AppError(503, "Google sign-in is not configured on the server");
  }

  const { credential } = req.body as { credential: string };
  const profile = await verifyGoogleIdToken(credential);

  let user = await prisma.user.findUnique({ where: { email: profile.email } });

  if (!user) {
    const hashedPassword = await bcrypt.hash(randomUUID() + randomUUID(), SALT_ROUNDS);
    user = await prisma.user.create({
      data: { email: profile.email, password: hashedPassword },
    });

    await prisma.$executeRaw`
      INSERT INTO user_profiles (id, user_id, email, created_at)
      VALUES (${randomUUID()}, ${user.id}, ${user.email}, NOW())
      ON CONFLICT (user_id) DO NOTHING
    `;
  }

  const access_token = signToken({ userId: user.id, email: user.email });
  res.status(200).json({ access_token });
};
