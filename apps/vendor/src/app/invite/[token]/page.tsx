"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "https://mgl-api.onrender.com";

export default function VendorInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params.token || "");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    try {
      setError("");
      setSuccess("");

      if (!password || password.length < 8) {
        throw new Error("Нууц үг хамгийн багадаа 8 тэмдэгттэй байх ёстой");
      }

      if (password !== confirmPassword) {
        throw new Error("Нууц үг таарахгүй байна");
      }

      setLoading(true);

      const res = await fetch(
        `${API_BASE}/api/partner-requests/activate-invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            password,
          }),
        },
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Invite идэвхжүүлэхэд алдаа гарлаа");
      }

      setSuccess("Account амжилттай үүслээ. Одоо нэвтэрч болно.");

      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Vendor account идэвхжүүлэх
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Шинэ нууц үгээ оруулаад бүртгэлээ идэвхжүүлнэ үү.
        </p>

        <div className="mt-5 space-y-4">
          <input
            type="password"
            placeholder="Нууц үг"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />

          <input
            type="password"
            placeholder="Нууц үг давтах"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Идэвхжүүлж байна..." : "Бүртгэл идэвхжүүлэх"}
          </button>
        </div>
      </div>
    </div>
  );
}
