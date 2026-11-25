"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Shield } from "lucide-react";

interface AdminStats {
  users: number;
  rides: number;
  bookings: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isBanned: boolean;
  kycStatus: "UNVERIFIED" | "PENDING" | "VERIFIED";
  kycIdNumber: string | null;
  kycNote: string | null;
}

interface AdminRide {
  id: string;
  originName: string;
  destName: string;
  departureTime: string;
  price: number;
  status: string;
  driver: { name: string; email: string };
}

export default function AdminPanelPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"stats" | "users" | "rides">("stats");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rides, setRides] = useState<AdminRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sRes, uRes, rRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/users"),
        fetch("/api/admin/rides"),
      ]);

      if (sRes.status === 401) {
        router.push("/login");
        return;
      }
      if (sRes.status === 403) {
        setError("Access Denied: Admin role required.");
        return;
      }

      const [sData, uData, rData] = await Promise.all([
        sRes.json(),
        uRes.json(),
        rRes.json(),
      ]);

      setStats(sData.stats ?? null);
      setUsers(uData.users ?? []);
      setRides(rData.rides ?? []);
    } catch {
      setError("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  async function toggleBan(userId: string) {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toggleBan: true }),
    });
    loadAdminData();
  }

  async function updateKyc(
    userId: string,
    kycStatus: "VERIFIED" | "UNVERIFIED"
  ) {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kycStatus }),
    });
    loadAdminData();
  }

  async function deleteRide(rideId: string) {
    await fetch(`/api/admin/rides/${rideId}`, { method: "DELETE" });
    loadAdminData();
  }

  if (loading) {
    return (
      <p className="py-10 text-center text-sm text-[#5E6878]">
        Loading admin panel...
      </p>
    );
  }

  if (error) {
    return (
      <div className="mt-8 rounded-[16px] bg-[#FEE2E2] p-6 text-sm font-semibold text-[#DC2626]">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <Shield className="h-6 w-6 text-[#1E90FF]" />
        <div>
          <h1 className="text-[22px] font-bold text-[#050412]">
            Along Admin Console
          </h1>
          <p className="text-sm text-[#5E6878]">
            Platform metrics, KYC ID verification approval, user moderation, and
            ride oversight.
          </p>
        </div>
      </div>

      <div className="flex gap-6 border-b border-[#DCE3EE]">
        {(
          [
            { key: "stats", label: "Overview Stats" },
            { key: "users", label: `Users & KYC (${users.length})` },
            { key: "rides", label: `Rides (${rides.length})` },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`border-b-2 pb-2.5 text-sm font-semibold ${
              tab === item.key
                ? "border-[#1E90FF] text-[#1E90FF]"
                : "border-transparent text-[#5E6878] hover:text-[#050412]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "stats" && stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="along-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5E6878]">
              Total Users
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[#050412]">
              {stats.users}
            </p>
          </div>
          <div className="along-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5E6878]">
              Total Rides
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[#1E90FF]">
              {stats.rides}
            </p>
          </div>
          <div className="along-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5E6878]">
              Total Bookings
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[#16A34A]">
              {stats.bookings}
            </p>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="along-card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#DCE3EE] bg-[#F7F9FC] text-[11px] font-bold uppercase tracking-wider text-[#5E6878]">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">KYC Status</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EEF5]">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#050412]">{u.name}</p>
                    <p className="text-xs text-[#5E6878]">{u.email}</p>
                    {u.kycIdNumber && (
                      <p className="text-[11px] text-[#1E90FF]">
                        ID: {u.kycIdNumber}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold">{u.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        u.kycStatus === "VERIFIED"
                          ? "bg-[#EBF5FF] text-[#1E90FF]"
                          : u.kycStatus === "PENDING"
                          ? "bg-[#FEF3C7] text-[#D97706]"
                          : "bg-[#E9EEF5] text-[#5E6878]"
                      }`}
                    >
                      {u.kycStatus === "VERIFIED" && (
                        <BadgeCheck className="h-3.5 w-3.5" />
                      )}
                      {u.kycStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.isBanned ? (
                      <span className="rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-xs font-semibold text-[#DC2626]">
                        Banned
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-semibold text-[#16A34A]">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {u.kycStatus !== "VERIFIED" && (
                        <button
                          onClick={() => updateKyc(u.id, "VERIFIED")}
                          className="rounded-lg bg-[#1E90FF] px-2.5 py-1 text-xs font-semibold text-white"
                        >
                          Approve KYC
                        </button>
                      )}
                      {u.kycStatus === "PENDING" && (
                        <button
                          onClick={() => updateKyc(u.id, "UNVERIFIED")}
                          className="rounded-lg border border-[#DCE3EE] px-2.5 py-1 text-xs font-semibold text-[#5E6878]"
                        >
                          Reject KYC
                        </button>
                      )}
                      {u.role !== "ADMIN" && (
                        <button
                          onClick={() => toggleBan(u.id)}
                          className="rounded-lg border border-[#DC2626] px-2.5 py-1 text-xs font-semibold text-[#DC2626] hover:bg-[#FEE2E2]"
                        >
                          {u.isBanned ? "Unban" : "Ban"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "rides" && (
        <div className="along-card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#DCE3EE] bg-[#F7F9FC] text-[11px] font-bold uppercase tracking-wider text-[#5E6878]">
              <tr>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EEF5]">
              {rides.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-semibold text-[#050412]">
                    {r.originName} → {r.destName}
                  </td>
                  <td className="px-4 py-3 text-[#5E6878]">{r.driver.name}</td>
                  <td className="px-4 py-3 font-semibold">{r.price} EGP</td>
                  <td className="px-4 py-3 text-xs font-semibold">{r.status}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteRide(r.id)}
                      className="rounded-lg bg-[#DC2626] px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
