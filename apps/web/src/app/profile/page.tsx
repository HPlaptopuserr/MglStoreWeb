"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, LogOut } from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AccountLibraryPanel } from "./_components/AccountLibraryPanel";
import { OrdersPanel } from "./_components/OrdersPanel";
import { ProfileHero } from "./_components/ProfileHero";
import { ProfileTabs } from "./_components/ProfileTabs";
import {
  createProfileFormState,
  type AccountContract,
  type AccountPurchase,
  type MPointHistory,
  type ProfileOrder,
  type ProfileFormState,
  type ProfileTab,
} from "./_components/types";

type ConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
};

export default function ProfilePage() {
  const { user, loading, logout, refreshUser, authFetch } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<ProfileTab>("orders");
  const [form, setForm] = useState<ProfileFormState | null>(null);

  const [purchases, setPurchases] = useState<AccountPurchase[]>([]);
  const [contracts, setContracts] = useState<AccountContract[]>([]);
  const [orders, setOrders] = useState<ProfileOrder[]>([]);
  const [points, setPoints] = useState(0);
  const [pointHistory, setPointHistory] = useState<MPointHistory[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    const allowedTabs: ProfileTab[] = ["library", "orders"];
    if (requestedTab && ["profile", "address", "security"].includes(requestedTab)) {
      router.replace(`/profile/settings?section=${requestedTab}`);
      return;
    }
    if (requestedTab && allowedTabs.includes(requestedTab as ProfileTab)) {
      setTab(requestedTab as ProfileTab);
    }
  }, [router]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (user) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) setForm(createProfileFormState(user));
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchAccountData = async () => {
      setAccountLoading(true);
      try {
        const [purchaseRes, pointRes, historyRes, contractRes] = await Promise.all([
          authFetch(`${API}/customer/purchases`),
          authFetch(`${API}/customer/loyalty/points`),
          authFetch(`${API}/customer/loyalty/history`),
          authFetch(`${API}/contracts/my`),
        ]);

        if (purchaseRes.ok) {
          const data = await purchaseRes.json().catch(() => ({}));
          setPurchases(Array.isArray(data.purchases) ? data.purchases : []);
        }
        if (pointRes.ok) {
          const data = await pointRes.json().catch(() => ({}));
          setPoints(Number(data.points || 0));
        }
        if (historyRes.ok) {
          const data = await historyRes.json().catch(() => []);
          setPointHistory(Array.isArray(data) ? data : []);
        }
        if (contractRes.ok) {
          const data = await contractRes.json().catch(() => ({}));
          setContracts(Array.isArray(data.contracts) ? data.contracts : []);
        }
      } catch (error) {
        console.error("Failed to fetch profile account data", error);
      } finally {
        setAccountLoading(false);
      }
    };

    fetchAccountData();
  }, [authFetch, user]);

  const fetchOrders = async () => {
    if (!user) return;
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const res = await authFetch(`${API}/store/orders`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOrdersError(data?.message || "Захиалгууд ачаалахад алдаа гарлаа");
        return;
      }
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch {
      setOrdersError("Сүлжээний алдаа гарлаа");
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading || !form) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) return null;

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    setConfirming(true);
    try {
      await confirmAction.onConfirm();
      setConfirmAction(null);
    } finally {
      setConfirming(false);
    }
  };

  const handleLogout = () => {
    setConfirmAction({
      title: "Account-аас гарах уу?",
      description:
        "Гарсны дараа сагс болон profile-ийн зарим үйлдлийг үргэлжлүүлэхийн тулд дахин нэвтрэх шаардлагатай.",
      confirmLabel: "Гарах",
      tone: "danger",
      onConfirm: () => {
        logout();
        router.replace("/");
      },
    });
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_44%,#f8fafc_100%)] px-4 py-8 text-slate-950 md:py-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <ProfileHero
          user={{ ...user, avatarUrl: form.avatarUrl }}
          purchases={purchases}
          orders={orders}
          points={points}
        />
        <ProfileTabs active={tab} onChange={setTab} />

        {tab === "library" && (
          <AccountLibraryPanel
            purchases={purchases}
            contracts={contracts}
            points={points}
            history={pointHistory}
            loading={accountLoading}
          />
        )}

        {tab === "orders" && (
          <OrdersPanel
            orders={orders}
            loading={ordersLoading}
            error={ordersError}
            onRefresh={fetchOrders}
          />
        )}

        <LogoutPanel onLogout={handleLogout} />
      </div>
      <ConfirmActionDialog
        action={confirmAction}
        loading={confirming}
        onCancel={() => {
          if (!confirming) setConfirmAction(null);
        }}
        onConfirm={runConfirmedAction}
      />
    </main>
  );
}

function LogoutPanel({ onLogout }: { onLogout: () => void }) {
  return (
    <section className="rounded-[22px] border border-red-100 bg-red-50/70 p-3 shadow-sm">
      <button
        type="button"
        onClick={onLogout}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 text-sm font-black text-red-600 transition hover:bg-red-50"
      >
        <LogOut size={18} />
        Гарах
      </button>
    </section>
  );
}

function ConfirmActionDialog({
  action,
  loading,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!action) return null;

  const isDanger = action.tone === "danger";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
        <div className="p-6">
          <div
            className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${
              isDanger
                ? "bg-red-50 text-red-600"
                : "bg-orange-50 text-orange-600"
            }`}
          >
            <AlertTriangle size={22} />
          </div>
          <h2 className="text-xl font-black text-slate-950">{action.title}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            {action.description}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            {action.cancelLabel || "Буцах"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black text-white shadow-sm transition disabled:opacity-60 ${
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {action.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
