"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

type ConfirmState = "loading" | "success" | "error";

function ConfirmPhoneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<ConfirmState>("loading");
  const [message, setMessage] = useState("Баталгаажуулж байна...");

  useEffect(() => {
    let cancelled = false;

    async function confirmPhone() {
      if (!token) {
        setState("error");
        setMessage("Баталгаажуулах token олдсонгүй.");
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/partners/members/confirm-phone`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Login утас баталгаажуулахад алдаа гарлаа.");
        }

        setState("success");
        setMessage(
          data.phone
            ? `Login утас ${data.phone} болж баталгаажлаа.`
            : "Login утас амжилттай ариллаа.",
        );
      } catch (error) {
        if (cancelled) return;
        setState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Login утас баталгаажуулахад алдаа гарлаа.",
        );
      }
    }

    confirmPhone();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const isSuccess = state === "success";
  const isLoading = state === "loading";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/70">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-black ${
            isLoading
              ? "bg-indigo-50 text-indigo-600"
              : isSuccess
                ? "bg-emerald-50 text-emerald-600"
                : "bg-rose-50 text-rose-600"
          }`}
        >
          {isLoading ? (
            <span className="h-7 w-7 animate-spin rounded-full border-4 border-current border-t-transparent" />
          ) : isSuccess ? (
            "✓"
          ) : (
            "!"
          )}
        </div>

        <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          Vendor login phone
        </p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">
          {isLoading
            ? "Шалгаж байна"
            : isSuccess
              ? "Баталгаажлаа"
              : "Баталгаажсангүй"}
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          {message}
        </p>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="mt-7 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
        >
          Vendor login руу очих
        </button>
      </section>
    </main>
  );
}

export default function ConfirmPhonePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </main>
      }
    >
      <ConfirmPhoneContent />
    </Suspense>
  );
}
