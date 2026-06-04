"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Shield,
  Save,
  Loader2,
  Check,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  ChevronRight,
  AlertCircle,
  ShoppingBag,
  Coins,
  Download,
  FileText,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/api";

type ProfileTab = "info" | "security" | "files" | "points";

type AccountPurchase = {
  id: string;
  sourceType: "PROJECT" | "FRANCHISE" | "SERVICE";
  title: string;
  fileUrl?: string | null;
  fileName?: string | null;
  amount: number;
  purchasedAt: string;
};

type MPointHistory = {
  id: string;
  description: string;
  amount: string;
  rawAmount: number;
  balanceAfter?: number | null;
  date: string;
};

export default function ProfilePage() {
  const { user, loading, logout, updateUser, refreshUser, authFetch } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<ProfileTab>("info");

  // Profile form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [purchases, setPurchases] = useState<AccountPurchase[]>([]);
  const [points, setPoints] = useState(0);
  const [pointHistory, setPointHistory] = useState<MPointHistory[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  // Fetch fresh user data from server
  useEffect(() => {
    if (user) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Populate form from user
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchAccountAssets = async () => {
      setAccountLoading(true);
      try {
        const [purchaseRes, pointRes, historyRes] = await Promise.all([
          authFetch(`${API_BASE}/customer/purchases`),
          authFetch(`${API_BASE}/customer/loyalty/points`),
          authFetch(`${API_BASE}/customer/loyalty/history`),
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
        console.error("Failed to fetch account assets", error);
      } finally {
        setAccountLoading(false);
      }
    };

    fetchAccountAssets();
  }, [authFetch, user]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user) return null;

  const initials =
    user.fullName?.trim()?.[0]?.toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    "?";

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setSaved(false);
    setSaving(true);

    try {
      const res = await authFetch(`${API_BASE}/auth/web/profile`, {
        method: "PUT",
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileError(data?.message || "Алдаа гарлаа");
        return;
      }

      updateUser(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setProfileError("Сервертэй холбогдоход алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data?.message || "Алдаа гарлаа");
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
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      {/* Profile Header */}
      <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/20 text-3xl font-black backdrop-blur-sm ring-4 ring-white/30">
            {initials}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-black md:text-3xl">
              {user.fullName?.trim() || "Хэрэглэгч"}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              {user.email || user.phone || ""}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Shield size={12} />
              {user.role === "USER" ? "Хэрэглэгч" : user.role}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            <LogOut size={16} />
            Гарах
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 grid gap-1 rounded-xl bg-gray-100 p-1 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setTab("info")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
            tab === "info"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <User size={16} />
          Хувийн мэдээлэл
        </button>
        <button
          type="button"
          onClick={() => setTab("security")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
            tab === "security"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Lock size={16} />
          Нууцлал
        </button>
        <button
          type="button"
          onClick={() => setTab("files")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
            tab === "files"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ShoppingBag size={16} />
          Файлууд
        </button>
        <button
          type="button"
          onClick={() => setTab("points")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
            tab === "points"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Coins size={16} />
          M point
        </button>
      </div>

      {/* Profile Info Tab */}
      {tab === "info" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Хувийн мэдээлэл</h2>
            <p className="mt-1 text-sm text-gray-500">
              Та өөрийн мэдээллийг энд засварлах боломжтой
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Овог нэр
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Таны овог нэр"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                И-мэйл
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@mail.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Утасны дугаар
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="99112233"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>

            {profileError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                <AlertCircle size={16} className="shrink-0" />
                {profileError}
              </div>
            )}

            {saved && (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                <Check size={16} className="shrink-0" />
                Мэдээлэл амжилттай хадгалагдлаа
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-sm font-bold text-white transition-all hover:shadow-lg hover:from-amber-600 hover:to-orange-700 disabled:opacity-70"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : saved ? (
                <Check size={16} />
              ) : (
                <Save size={16} />
              )}
              {saving ? "Хадгалж байна..." : saved ? "Хадгалагдсан" : "Хадгалах"}
            </button>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {tab === "security" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Нууц үг солих</h2>
            <p className="mt-1 text-sm text-gray-500">
              Аюулгүй байдлаа хангахын тулд нууц үгээ тогтмол солиорой
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-5">
            {/* Current Password */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Одоогийн нууц үг
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-11 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Шинэ нууц үг
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Дор хаяж 6 тэмдэгт"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-11 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Шинэ нууц үг давтах
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                <AlertCircle size={16} className="shrink-0" />
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                <Check size={16} className="shrink-0" />
                {passwordSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={changingPassword}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-sm font-bold text-white transition-all hover:shadow-lg hover:from-amber-600 hover:to-orange-700 disabled:opacity-70"
            >
              {changingPassword ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Shield size={16} />
              )}
              {changingPassword ? "Солиж байна..." : "Нууц үг солих"}
            </button>
          </form>
        </div>
      )}

      {tab === "files" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Худалдан авсан файлууд
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Төсөл, franchise болон төлбөртэй материалууд энд хадгалагдана.
              </p>
            </div>
            <span className="w-fit rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600">
              {purchases.length} файл
            </span>
          </div>

          {accountLoading ? (
            <div className="flex min-h-40 items-center justify-center rounded-2xl bg-gray-50">
              <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
              <FileText className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-4 text-sm font-bold text-gray-500">
                Одоогоор худалдан авсан файл алга байна.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {purchases.map((purchase) => (
                <article
                  key={purchase.id}
                  className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-orange-50/40 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <FileText size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                        {purchase.sourceType}
                      </span>
                      <span className="text-xs font-semibold text-gray-400">
                        {new Date(purchase.purchasedAt).toLocaleDateString("mn-MN")}
                      </span>
                    </div>
                    <h3 className="mt-2 line-clamp-1 text-base font-black text-gray-900">
                      {purchase.title}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-gray-500">
                      ₮{Number(purchase.amount || 0).toLocaleString("mn-MN")}
                    </p>
                  </div>
                  {purchase.fileUrl ? (
                    <a
                      href={purchase.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-sm font-black text-white transition hover:shadow-lg"
                    >
                      <Download size={16} />
                      Нээх
                    </a>
                  ) : (
                    <span className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-400">
                      Файл оруулаагүй
                    </span>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "points" && (
        <div className="space-y-5">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-700 p-6 text-white shadow-lg md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-200">
                  M point wallet
                </p>
                <h2 className="mt-3 text-4xl font-black">
                  {points.toLocaleString("mn-MN")} M
                </h2>
                <p className="mt-2 text-sm font-semibold text-white/65">
                  Худалдан авалт бүрээс 2% автоматаар нэмэгдэнэ.
                </p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/12">
                <Coins size={34} className="text-orange-200" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="mb-5 text-lg font-bold text-gray-900">
              Онооны түүх
            </h2>
            {accountLoading ? (
              <div className="flex min-h-32 items-center justify-center rounded-2xl bg-gray-50">
                <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
              </div>
            ) : pointHistory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm font-bold text-gray-500">
                Одоогоор онооны log алга байна.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pointHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-bold text-gray-900">
                        {entry.description}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-gray-400">
                        {new Date(entry.date).toLocaleString("mn-MN")}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-sm font-black ${
                        entry.rawAmount >= 0
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {entry.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut size={18} />
          <span className="flex-1 text-left">Системээс гарах</span>
          <ChevronRight size={16} className="text-gray-300" />
        </button>
      </div>
    </div>
  );
}
