"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AlongLogo } from "@/components/ui/AlongLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      window.dispatchEvent(new Event("along:auth-changed"));
      if (data.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/rides");
      }
      router.refresh();
    } catch {
      setError("Network error while signing in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <div className="along-card p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <AlongLogo size={44} showWordmark showTagline />
          <h1 className="mt-5 text-[22px] font-bold text-[#050412]">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-[#5E6878]">
            Sign in with your email to search, book, or publish rides.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-[12px] bg-[#FEE2E2] p-3 text-sm font-medium text-[#DC2626]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E6878]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ahmed@along.eg"
              className="mt-1.5 w-full rounded-[12px] border border-[#DCE3EE] bg-white px-3.5 py-3 text-sm text-[#050412] focus:border-[#1E90FF] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E6878]">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-[12px] border border-[#DCE3EE] bg-white px-3.5 py-3 text-sm text-[#050412] focus:border-[#1E90FF] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="along-btn-primary w-full py-3 text-[15px]"
          >
            {submitting ? "Signing in..." : "Continue"}
          </button>
        </form>

        <div className="mt-5 rounded-[12px] bg-[#E9EEF5] p-3 text-xs text-[#5E6878]">
          <p className="font-semibold text-[#050412]">Accounts:</p>
          <p className="mt-1">Driver: ahmed@along.eg (Password123!)</p>
          <p>Passenger: salma@along.eg (Password123!)</p>
          <p>Admin: admin@along.com</p>
        </div>

        <p className="mt-5 text-center text-sm text-[#5E6878]">
          New to Along?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#1E90FF] hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
