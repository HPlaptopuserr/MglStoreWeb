"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { API, API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AccountLibraryPanel } from "./_components/AccountLibraryPanel";
import { AddressConsentPanel } from "./_components/AddressConsentPanel";
import { OrdersPanel } from "./_components/OrdersPanel";
import { ProfileHero } from "./_components/ProfileHero";
import { ProfileInfoPanel } from "./_components/ProfileInfoPanel";
import { ProfileTabs } from "./_components/ProfileTabs";
import { SecurityPanel } from "./_components/SecurityPanel";
import {
  createProfileFormState,
  type AccountPurchase,
  type MPointHistory,
  type ProfileOrder,
  type ProfileFormState,
  type ProfileTab,
} from "./_components/types";

export default function ProfilePage() {
  const { user, loading, logout, updateUser, refreshUser, authFetch } =
    useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<ProfileTab>("library");
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [purchases, setPurchases] = useState<AccountPurchase[]>([]);
  const [orders, setOrders] = useState<ProfileOrder[]>([]);
  const [points, setPoints] = useState(0);
  const [pointHistory, setPointHistory] = useState<MPointHistory[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    const allowedTabs: ProfileTab[] = [
      "library",
      "orders",
      "profile",
      "address",
      "security",
    ];
    if (requestedTab && allowedTabs.includes(requestedTab as ProfileTab)) {
      setTab(requestedTab as ProfileTab);
    }
  }, []);

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
        const [purchaseRes, pointRes, historyRes] = await Promise.all([
          authFetch(`${API}/customer/purchases`),
          authFetch(`${API}/customer/loyalty/points`),
          authFetch(`${API}/customer/loyalty/history`),
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

  const updateForm = (patch: Partial<ProfileFormState>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaved(false);
    setProfileError("");
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.acceptTerms) {
      setProfileError("Үйлчилгээний нөхцөлийг зөвшөөрөх шаардлагатай.");
      setTab("address");
      return;
    }

    setSaving(true);
    setSaved(false);
    setProfileError("");
    try {
      const res = await authFetch(`${API_BASE}/auth/web/profile`, {
        method: "PUT",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          avatarUrl: form.avatarUrl || null,
          acceptTerms: form.acceptTerms,
          marketingConsent: form.marketingConsent,
          address: {
            label: form.addressLabel,
            fullAddress: form.fullAddress,
            city: form.city,
            district: form.district,
            khoroo: form.khoroo,
            entrance: form.entrance,
            apartment: form.apartment,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileError(data?.message || "Мэдээлэл хадгалахад алдаа гарлаа");
        return;
      }
      updateUser(data);
      setForm(createProfileFormState(data));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setProfileError("Сервертэй холбогдоход алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    setProfileError("");
    try {
      const body = new FormData();
      body.append("avatar", file);
      const res = await authFetch(`${API_BASE}/auth/web/profile/avatar`, {
        method: "POST",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.avatarUrl) {
        setProfileError(data?.message || "Зураг upload хийхэд алдаа гарлаа");
        return;
      }
      updateForm({ avatarUrl: data.avatarUrl });
      updateUser({ avatarUrl: data.avatarUrl });
    } catch {
      setProfileError("Зураг upload хийхэд алдаа гарлаа");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Бүх талбарыг бөглөнө үү");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Шинэ нууц үг дор хаяж 6 тэмдэгт байх ёстой");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Шинэ нууц үгүүд таарахгүй байна");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await authFetch(`${API_BASE}/auth/web/change-password`, {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordError(data?.message || "Нууц үг солиход алдаа гарлаа");
        return;
      }
      setPasswordSuccess(data.message || "Нууц үг амжилттай солигдлоо");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(""), 4000);
    } catch {
      setPasswordError("Сервертэй холбогдоход алдаа гарлаа");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_44%,#f8fafc_100%)] px-4 py-8 text-slate-950 md:py-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <ProfileHero
          user={{ ...user, avatarUrl: form.avatarUrl }}
          purchases={purchases}
          orders={orders}
          points={points}
          onLogout={handleLogout}
        />
        <ProfileTabs active={tab} onChange={setTab} />

        {tab === "library" && (
          <AccountLibraryPanel
            purchases={purchases}
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

        {tab === "profile" && (
          <ProfileInfoPanel
            form={form}
            saving={saving}
            uploading={uploadingAvatar}
            saved={saved}
            error={profileError}
            onChange={updateForm}
            onAvatarUpload={uploadAvatar}
            onSubmit={saveProfile}
          />
        )}

        {tab === "address" && (
          <AddressConsentPanel
            form={form}
            saving={saving}
            saved={saved}
            error={profileError}
            onChange={updateForm}
            onSubmit={saveProfile}
          />
        )}

        {tab === "security" && (
          <SecurityPanel
            currentPassword={currentPassword}
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            showCurrent={showCurrent}
            showNew={showNew}
            loading={changingPassword}
            success={passwordSuccess}
            error={passwordError}
            onCurrentPassword={setCurrentPassword}
            onNewPassword={setNewPassword}
            onConfirmPassword={setConfirmPassword}
            onToggleCurrent={() => setShowCurrent((value) => !value)}
            onToggleNew={() => setShowNew((value) => !value)}
            onSubmit={changePassword}
          />
        )}
      </div>
    </main>
  );
}
