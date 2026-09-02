"use client";

import { CheckCircle2, Loader2, Navigation } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import {
  ACTIVE_CHECKOUT_DISPATCH_EVENT,
  getActiveCheckoutDispatch,
  setActiveCheckoutDispatch,
} from "@/lib/active-checkout-dispatch";
import { useAuth } from "@/lib/auth-context";
import type { DeliverySession } from "./DeliveryDispatchRadar";

export function ActiveCheckoutDispatchAlert() {
  const { user, authFetch } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<DeliverySession | null>(null);

  useEffect(() => {
    const sync = () => setSession(getActiveCheckoutDispatch(user?.id));
    sync();
    window.addEventListener(ACTIVE_CHECKOUT_DISPATCH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ACTIVE_CHECKOUT_DISPATCH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !session?.orderId || session.canPay || session.status === "NO_BRANCH_AVAILABLE") {
      return;
    }

    const pollDispatch = async () => {
      try {
        const res = await authFetch(`${API}/store/checkout/${session.orderId}/dispatch-status`);
        if (res.status === 403 || res.status === 404) {
          setActiveCheckoutDispatch(user.id, null);
          setSession(null);
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as DeliverySession;
        setActiveCheckoutDispatch(user.id, data);
        setSession(data);
      } catch {
        // Keep the last known session; the next poll can recover.
      }
    };

    const poll = window.setInterval(pollDispatch, 5000);
    pollDispatch();
    return () => window.clearInterval(poll);
  }, [authFetch, session?.canPay, session?.orderId, session?.status, user]);

  if (!user || !session || pathname?.startsWith("/contract")) return null;

  const isReady = session.canPay;
  const isSearching = !isReady && session.status !== "NO_BRANCH_AVAILABLE";

  if (!isReady && !isSearching) return null;

  return (
    <div className="fixed bottom-24 left-3 z-[70] w-[min(78vw,320px)] md:bottom-6 md:left-6 md:w-[420px]">
      <button
        type="button"
        onClick={() => router.push(`/checkout?dispatch=${session.orderId}`)}
        className={`flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left shadow-2xl backdrop-blur transition hover:-translate-y-0.5 md:gap-3 md:px-4 md:py-3 ${
          isReady
            ? "border-emerald-200 bg-emerald-50/95 text-emerald-950"
            : "border-orange-200 bg-white/95 text-slate-950"
        }`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white md:h-10 md:w-10 ${
            isReady ? "bg-emerald-500" : "bg-orange-500"
          }`}
        >
          {isReady ? <CheckCircle2 size={18} /> : <Loader2 size={17} className="animate-spin" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-black md:text-sm">
            {isReady ? "Хүргэлт авах салбар олдлоо" : "Төлбөр хийхэд бэлэн"}
          </span>
          <span className="mt-0.5 hidden truncate text-xs font-bold opacity-70 sm:block">
            {isReady
              ? "Дарж төлбөрөө үргэлжлүүлнэ үү."
              : "Дарж QPay төлбөрөө үргэлжлүүлж болно."}
          </span>
        </span>
        <Navigation size={16} className="shrink-0 opacity-70 md:size-[18px]" />
      </button>
    </div>
  );
}
