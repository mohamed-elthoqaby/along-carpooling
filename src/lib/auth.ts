import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const AUTH_COOKIE_NAME = "along_token";

export type UserRole = "PASSENGER" | "DRIVER" | "USER" | "ADMIN";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

const VALID_ROLES = new Set<UserRole>(["PASSENGER", "DRIVER", "USER", "ADMIN"]);

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
      typeof payload.role !== "string" ||
      !VALID_ROLES.has(payload.role as UserRole)
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

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

        if (!dbUser) {
          const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
          const metaRole =
            meta.role === "DRIVER" || meta.role === "PASSENGER"
              ? meta.role
              : "PASSENGER";
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
              role: metaRole,
            },
            select: { id: true, isBanned: true, role: true, name: true, email: true },
          });
        }

        if (dbUser.isBanned) return null;
        return {
          userId: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role as UserRole,
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
    role: dbUser.role as UserRole,
  };
}
