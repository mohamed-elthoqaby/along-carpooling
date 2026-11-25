"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AlongLogo } from "@/components/ui/AlongLogo";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, bio }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      window.dispatchEvent(new Event("along:auth-changed"));
      router.push("/profile");
      router.refresh();
    } catch {
      setError("Network error while registering");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-md">
      <div className="along-card p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <AlongLogo size={44} showWordmark showTagline />
          <h1 className="mt-5 text-[22px] font-bold text-[#050412]">
            Create your Along account
          </h1>
          <p className="mt-1 text-sm text-[#5E6878]">
            One unified account lets you book seats AND register a vehicle to
            publish rides.
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
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Salma Mahmoud"
              className="mt-1.5 w-full rounded-[12px] border border-[#DCE3EE] bg-white px-3.5 py-2.5 text-sm focus:border-[#1E90FF] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E6878]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5 w-full rounded-[12px] border border-[#DCE3EE] bg-white px-3.5 py-2.5 text-sm focus:border-[#1E90FF] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E6878]">
              Phone Number
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+201012345678"
              className="mt-1.5 w-full rounded-[12px] border border-[#DCE3EE] bg-white px-3.5 py-2.5 text-sm focus:border-[#1E90FF] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E6878]">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="mt-1.5 w-full rounded-[12px] border border-[#DCE3EE] bg-white px-3.5 py-2.5 text-sm focus:border-[#1E90FF] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E6878]">
              Short Bio (Optional)
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Daily commuter, punctual & friendly"
              className="mt-1.5 w-full rounded-[12px] border border-[#DCE3EE] bg-white px-3.5 py-2.5 text-sm focus:border-[#1E90FF] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="along-btn-primary w-full py-3 text-[15px]"
          >
            {submitting ? "Creating account..." : "Get Started"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[#5E6878]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#1E90FF] hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
