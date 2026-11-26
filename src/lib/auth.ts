import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const AUTH_COOKIE_NAME = "along_token";

export type UserRole = "USER" | "ADMIN";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.JWT_SECRET || "dev-super-secret-along-jwt-key-change-in-prod";
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      (payload.role !== "USER" && payload.role !== "ADMIN")
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

/**
 * Resolves the currently authenticated user:
 * 1. Checks Supabase Auth session (`supabase.auth.getUser()`) first and syncs with PostgreSQL `User`.
 * 2. Falls back to signed HTTP-only `along_token` cookie when Supabase Auth is not active.
 * Always enforces real-time `isBanned` and `role` from PostgreSQL.
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  // 1. Primary: Supabase Auth session
  try {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user?.email) {
        const email = data.user.email.toLowerCase();
        let dbUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true, isBanned: true, role: true, name: true, email: true },
        });

        // Auto-provision PostgreSQL profile if user registered directly via Supabase Auth
        if (!dbUser) {
          const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
          dbUser = await prisma.user.create({
            data: {
              email,
              name:
                typeof meta.name === "string" && meta.name.trim()
                  ? meta.name.trim()
                  : email.split("@")[0],
              phone:
                typeof meta.phone === "string" && meta.phone.trim()
                  ? meta.phone.trim()
                  : "+201000000000",
              bio: typeof meta.bio === "string" ? meta.bio : "",
              passwordHash: "supabase_auth_managed",
              role: "USER",
            },
            select: { id: true, isBanned: true, role: true, name: true, email: true },
          });
        }

        if (dbUser.isBanned) return null;
        return {
          userId: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
        };
      }
    }
  } catch {
    // Fall through to cookie check
  }

  // 2. Fallback: HTTP-only JWT cookie
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  if (!session) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, isBanned: true, role: true, name: true, email: true },
  });
  if (!dbUser || dbUser.isBanned) return null;

  return {
    userId: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
  };
}
