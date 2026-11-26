import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, hashPassword, signToken } from "@/lib/auth";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().trim().min(6, "Phone number is required"),
  role: z.enum(["PASSENGER", "DRIVER"]).default("PASSENGER"),
  bio: z.string().trim().max(300).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { name, email, password, phone, role, bio } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email is already registered" },
        { status: 409 }
      );
    }

    // 1. Create user in Supabase Auth (prefer Admin API with auto-confirm if service role key is set)
    let supabaseUserId: string | undefined;
    const adminSupabase = createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();

    if (adminSupabase) {
      const { data: created, error: adminErr } =
        await adminSupabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name, phone, role, bio: bio ?? "" },
        });

      if (adminErr) {
        const msg = adminErr.message || "Supabase Auth user creation failed";
        if (msg.toLowerCase().includes("already")) {
          return NextResponse.json(
            { error: "Email is already registered in Supabase Auth" },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      supabaseUserId = created.user?.id;

      // Immediately sign in to establish Supabase SSR cookies
      if (supabase) {
        await supabase.auth.signInWithPassword({ email, password });
      }
    } else if (supabase) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, phone, role, bio: bio ?? "" },
        },
      });

      if (authError) {
        const msg = authError.message || "Supabase Auth registration failed";
        if (msg.toLowerCase().includes("already registered")) {
          return NextResponse.json(
            { error: "Email is already registered" },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      supabaseUserId = authData.user?.id;
    }

    // 2. Sync user profile into PostgreSQL via Prisma upsert
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        phone,
        bio: bio ?? "",
        role,
        passwordHash,
      },
      create: {
        ...(supabaseUserId ? { id: supabaseUserId } : {}),
        name,
        email,
        passwordHash,
        phone,
        bio: bio ?? "",
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        bio: true,
        role: true,
        kycStatus: true,
        isBanned: true,
        createdAt: true,
      },
    });

    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const res = NextResponse.json(
      { user, supabaseAuth: Boolean(adminSupabase || supabase) },
      { status: 201 }
    );
    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (error) {
    console.error("Register error:", error);
    const detail =
      error instanceof Error ? error.message : "Unexpected registration error";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
