import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, signToken, verifyPassword } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const supabase = await createSupabaseServerClient();

    let authenticatedViaSupabase = false;
    let supabaseUserId: string | undefined;
    let supabaseMeta: Record<string, unknown> = {};
    let supabaseErrorMsg: string | null = null;

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!error && data.user) {
        authenticatedViaSupabase = true;
        supabaseUserId = data.user.id;
        supabaseMeta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      } else if (error) {
        supabaseErrorMsg = error.message;
      }
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (authenticatedViaSupabase) {
      const metaRole =
        supabaseMeta.role === "DRIVER" || supabaseMeta.role === "PASSENGER"
          ? supabaseMeta.role
          : "PASSENGER";

      if (!user) {
        user = await prisma.user.create({
          data: {
            ...(supabaseUserId ? { id: supabaseUserId } : {}),
            email,
            name:
              typeof supabaseMeta.name === "string" && supabaseMeta.name.trim()
                ? supabaseMeta.name.trim()
                : email.split("@")[0],
            phone:
              typeof supabaseMeta.phone === "string" && supabaseMeta.phone.trim()
                ? supabaseMeta.phone.trim()
                : "+201000000000",
            bio: typeof supabaseMeta.bio === "string" ? supabaseMeta.bio : "",
            passwordHash: null,
            role: metaRole,
          },
        });
      }
    } else {
      // Fallback for seeded PostgreSQL accounts
      if (!user || !user.passwordHash) {
        return NextResponse.json(
          { error: supabaseErrorMsg || "Invalid email or password" },
          { status: 401 }
        );
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }
    }

    if (user.isBanned) {
      if (supabase) {
        await supabase.auth.signOut().catch(() => {});
      }
      return NextResponse.json(
        { error: "Account is banned" },
        { status: 403 }
      );
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const res = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        kycStatus: user.kycStatus,
      },
      supabaseAuth: authenticatedViaSupabase,
    });

    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (error) {
    console.error("Login error:", error);
    const detail =
      error instanceof Error ? error.message : "Unexpected login error";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
