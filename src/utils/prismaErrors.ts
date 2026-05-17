import { Prisma } from "@prisma/client";

export function mapPrismaError(error: unknown): {
  status: number;
  error: string;
} | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return { status: 409, error: "Email already exists" };
      case "P2021":
        return {
          status: 503,
          error: "Database schema not initialized. Run: npx prisma db push",
        };
      default:
        return { status: 500, error: "Database operation failed" };
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: 503,
      error: "Database connection failed. Check DATABASE_URL and DIRECT_URL.",
    };
  }

  return null;
}
