"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  CalendarCheck,
  ChevronRight,
  Globe,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  Shield,
  ShieldCheck,
  Star,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { AlongLogo } from "@/components/ui/AlongLogo";
import { useDirection } from "./DirectionContext";

export interface ShellUser {
  id: string;
  name: string;
  email: string;
  role: "PASSENGER" | "DRIVER" | "USER" | "ADMIN";
  kycStatus?: "UNVERIFIED" | "PENDING" | "VERIFIED";
  stats?: {
    averageRating: number | null;
    totalReviews: number;
  };
}

interface ShellContextValue {
  user: ShellUser | null;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const ShellContext = createContext<ShellContextValue>({
  user: null,
  openDrawer: () => {},
  closeDrawer: () => {},
});

export function useAppShell() {
  return useContext(ShellContext);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { dir, toggleDirection } = useDirection();

  const [user, setUser] = useState<ShellUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isMapHome = pathname === "/";

  useEffect(() => {
    let active = true;
    const loadUser = () => {
      fetch("/api/auth/me")
        .then((res) => (res.ok ? res.json() : { user: null }))
        .then((data) => {
          if (active) setUser(data.user ?? null);
        })
        .catch(() => {
          if (active) setUser(null);
        });
    };
    loadUser();
    window.addEventListener("along:auth-changed", loadUser);
    return () => {
      active = false;
      window.removeEventListener("along:auth-changed", loadUser);
    };
  }, [pathname]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setDrawerOpen(false);
    window.dispatchEvent(new Event("along:auth-changed"));
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AL";

  return (
    <ShellContext.Provider
      value={{
        user,
        openDrawer: () => setDrawerOpen(true),
        closeDrawer: () => setDrawerOpen(false),
      }}
    >
      <div className="flex h-[100dvh] w-screen overflow-hidden bg-[#F7F9FC] text-[#050412]">
        {/* DESKTOP (>= 1024px): Slim Start-Edge Icon Sidebar Rail (w-[72px]) */}
        <aside className="hidden h-full w-[72px] shrink-0 flex-col items-center justify-between border-e border-[#DCE3EE] bg-white py-4 lg:flex">
          {/* Top Brand Mark */}
          <Link
            href="/"
            title="Along — Carpool your way."
            className="transition hover:scale-105"
          >
            <AlongLogo size={40} showWordmark={false} />
          </Link>

          {/* Middle Vertical Icon Stack */}
          <nav
            aria-label="Primary rail navigation"
            className="flex flex-col items-center gap-2.5"
          >
            <Link
              href="/"
              title="Explore Map"
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                isActive("/")
                  ? "bg-[#EBF5FF] text-[#1E90FF]"
                  : "text-[#5E6878] hover:bg-[#E9EEF5] hover:text-[#050412]"
              }`}
            >
              <MapPin className="h-5 w-5" />
            </Link>

            <Link
              href="/rides"
              title="Your Rides"
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                isActive("/rides") || isActive("/dashboard")
                  ? "bg-[#EBF5FF] text-[#1E90FF]"
                  : "text-[#5E6878] hover:bg-[#E9EEF5] hover:text-[#050412]"
              }`}
            >
              <CalendarCheck className="h-5 w-5" />
            </Link>

            <Link
              href="/publish"
              title="Publish Ride"
              className="my-1 flex h-12 w-12 items-center justify-center rounded-full bg-[#1E90FF] text-white shadow-[0_6px_20px_rgba(30,144,255,0.3)] transition hover:bg-[#1574D6] active:scale-95"
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </Link>

            <Link
              href="/chat"
              title="Messages"
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                isActive("/chat")
                  ? "bg-[#EBF5FF] text-[#1E90FF]"
                  : "text-[#5E6878] hover:bg-[#E9EEF5] hover:text-[#050412]"
              }`}
            >
              <MessageCircle className="h-5 w-5" />
            </Link>

            <Link
              href="/profile"
              title="Profile"
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                isActive("/profile")
                  ? "bg-[#EBF5FF] text-[#1E90FF]"
                  : "text-[#5E6878] hover:bg-[#E9EEF5] hover:text-[#050412]"
              }`}
            >
              <User className="h-5 w-5" />
            </Link>

            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                title="Admin Console"
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                  isActive("/admin")
                    ? "bg-[#EBF5FF] text-[#1E90FF]"
                    : "text-[#5E6878] hover:bg-[#E9EEF5] hover:text-[#050412]"
                }`}
              >
                <Shield className="h-5 w-5" />
              </Link>
            )}
          </nav>

          {/* Bottom Utility Controls: EN/AR Toggle + Auth Buttons or User Avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={toggleDirection}
              title={`Switch to ${dir === "ltr" ? "Arabic (RTL)" : "English (LTR)"}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DCE3EE] bg-[#F7F9FC] text-[11px] font-extrabold text-[#050412] hover:border-[#1E90FF] hover:text-[#1E90FF]"
            >
              {dir === "ltr" ? "AR" : "EN"}
            </button>

            {user ? (
              <>
                <Link
                  href="/profile"
                  title={`${user.name} (${user.role})`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#050412] text-xs font-bold text-white"
                >
                  {initials}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Logout"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[#5E6878] hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  title="Sign In"
                  className={`flex flex-col items-center justify-center rounded-xl px-2 py-1.5 text-[10px] font-bold transition ${
                    isActive("/login")
                      ? "bg-[#1E90FF] text-white"
                      : "bg-[#EBF5FF] text-[#1E90FF] hover:bg-[#1E90FF] hover:text-white"
                  }`}
                >
                  <LogIn className="h-4 w-4" />
                  <span className="mt-0.5">Sign In</span>
                </Link>
                <Link
                  href="/register"
                  title="Register Account"
                  className={`flex flex-col items-center justify-center rounded-xl px-1.5 py-1.5 text-[10px] font-bold transition ${
                    isActive("/register")
                      ? "bg-[#1E90FF] text-white"
                      : "bg-[#050412] text-white hover:opacity-90"
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="mt-0.5">Join</span>
                </Link>
              </>
            )}
          </div>
        </aside>

        {/* MAIN VIEWPORT AREA */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Compact Mobile Header on secondary routes */}
          {!isMapHome && (
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#DCE3EE] bg-white px-4 lg:hidden">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F9FC] text-[#050412]"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link href="/">
                <AlongLogo size={28} showWordmark />
              </Link>
              <div className="flex items-center gap-1.5">
                {!user && (
                  <Link
                    href="/login"
                    className="rounded-lg bg-[#1E90FF] px-2.5 py-1.5 text-xs font-bold text-white"
                  >
                    Sign In
                  </Link>
                )}
                <button
                  type="button"
                  onClick={toggleDirection}
                  className="rounded-lg border border-[#DCE3EE] px-2 py-1 text-xs font-bold text-[#050412]"
                >
                  {dir === "ltr" ? "AR" : "EN"}
                </button>
              </div>
            </header>
          )}

          {isMapHome ? (
            <main className="relative h-full w-full flex-1 overflow-hidden">
              {children}
            </main>
          ) : (
            <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
              <div className="mx-auto w-full max-w-5xl">{children}</div>
            </main>
          )}
        </div>
      </div>

      {/* MOBILE & TABLET SLIDE-OUT NAVIGATION DRAWER (inDrive-style in Along colors) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-[rgba(5,4,18,0.45)] transition-opacity"
          />

          {/* Drawer Panel anchored to start-0 */}
          <aside className="relative z-10 flex h-full w-[82%] max-w-[320px] flex-col bg-white shadow-[0_8px_32px_rgba(5,4,18,0.2)]">
            {/* Drawer Header */}
            <div className="border-b border-[#DCE3EE] p-5">
              <div className="flex items-center justify-between">
                <AlongLogo size={30} showWordmark />
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="rounded-full p-1.5 text-[#5E6878] hover:bg-[#E9EEF5]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {user ? (
                <Link
                  href="/profile"
                  className="mt-5 flex items-center justify-between rounded-[14px] bg-[#F7F9FC] p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#050412] text-sm font-bold text-white">
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-[#050412]">
                          {user.name}
                        </span>
                        {user.kycStatus === "VERIFIED" && (
                          <BadgeCheck className="h-4 w-4 text-[#1E90FF]" />
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#5E6878]">
                        <span className="rounded bg-[#EBF5FF] px-1.5 py-0.5 text-[10px] font-bold text-[#1E90FF]">
                          {user.role}
                        </span>
                        <Star className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" />
                        <span className="font-semibold text-[#050412]">
                          {user.stats?.averageRating
                            ? user.stats.averageRating.toFixed(1)
                            : "5.0"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#5E6878]" />
                </Link>
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    className="along-btn-primary flex items-center justify-center gap-1.5 py-2.5 text-xs"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="along-btn-secondary flex items-center justify-center gap-1.5 py-2.5 text-xs"
                  >
                    <UserPlus className="h-4 w-4" />
                    Register
                  </Link>
                </div>
              )}
            </div>

            {/* Vertical Menu List */}
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              <Link
                href="/"
                className={`flex items-center gap-3 rounded-[12px] px-3.5 py-3 text-sm font-semibold ${
                  isActive("/")
                    ? "bg-[#EBF5FF] text-[#1E90FF]"
                    : "text-[#050412] hover:bg-[#F7F9FC]"
                }`}
              >
                <MapPin className="h-5 w-5 text-[#1E90FF]" />
                Explore Rides
              </Link>

              <Link
                href="/rides"
                className={`flex items-center gap-3 rounded-[12px] px-3.5 py-3 text-sm font-semibold ${
                  isActive("/rides") || isActive("/dashboard")
                    ? "bg-[#EBF5FF] text-[#1E90FF]"
                    : "text-[#050412] hover:bg-[#F7F9FC]"
                }`}
              >
                <CalendarCheck className="h-5 w-5 text-[#5E6878]" />
                Your Rides & History
              </Link>

              <Link
                href="/chat"
                className={`flex items-center gap-3 rounded-[12px] px-3.5 py-3 text-sm font-semibold ${
                  isActive("/chat")
                    ? "bg-[#EBF5FF] text-[#1E90FF]"
                    : "text-[#050412] hover:bg-[#F7F9FC]"
                }`}
              >
                <MessageCircle className="h-5 w-5 text-[#5E6878]" />
                Messages & Chat
              </Link>

              <Link
                href="/profile#verification"
                className="flex items-center gap-3 rounded-[12px] px-3.5 py-3 text-sm font-semibold text-[#050412] hover:bg-[#F7F9FC]"
              >
                <ShieldCheck className="h-5 w-5 text-[#5E6878]" />
                Verification & Safety
              </Link>

              <button
                type="button"
                onClick={toggleDirection}
                className="flex w-full items-center justify-between rounded-[12px] px-3.5 py-3 text-sm font-semibold text-[#050412] hover:bg-[#F7F9FC]"
              >
                <span className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-[#5E6878]" />
                  Language & Direction
                </span>
                <span className="rounded-full bg-[#E9EEF5] px-2.5 py-0.5 text-xs font-bold text-[#1E90FF]">
                  {dir === "ltr" ? "EN · LTR" : "AR · RTL"}
                </span>
              </button>

              {!user && (
                <div className="mt-2 space-y-1 border-t border-[#E9EEF5] pt-2">
                  <Link
                    href="/login"
                    className="flex items-center gap-3 rounded-[12px] px-3.5 py-3 text-sm font-semibold text-[#1E90FF] hover:bg-[#EBF5FF]"
                  >
                    <LogIn className="h-5 w-5" />
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="flex items-center gap-3 rounded-[12px] px-3.5 py-3 text-sm font-semibold text-[#050412] hover:bg-[#F7F9FC]"
                  >
                    <UserPlus className="h-5 w-5 text-[#1E90FF]" />
                    Register (Passenger / Driver)
                  </Link>
                </div>
              )}

              {user?.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 rounded-[12px] px-3.5 py-3 text-sm font-semibold text-[#050412] hover:bg-[#F7F9FC]"
                >
                  <Shield className="h-5 w-5 text-[#1E90FF]" />
                  Admin Panel
                </Link>
              )}

              {user && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-3 text-sm font-semibold text-[#DC2626] hover:bg-[#FEE2E2]"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              )}
            </nav>

            {/* Bottom Sticky Full-Width CTA (Along Blue) */}
            <div className="border-t border-[#DCE3EE] p-4">
              <Link
                href="/publish"
                className="along-btn-primary flex h-12 w-full items-center justify-center gap-2 text-[15px] shadow-[0_6px_20px_rgba(30,144,255,0.28)]"
              >
                <Plus className="h-5 w-5" strokeWidth={2.5} />
                Driver Mode · Publish Ride
              </Link>
            </div>
          </aside>
        </div>
      )}
    </ShellContext.Provider>
  );
}
