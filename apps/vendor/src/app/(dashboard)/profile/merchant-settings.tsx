"use client";

import { useState, useEffect } from "react";
import { Copy, RotateCcw, Loader2, Check, AlertCircle, Plus, Trash2, ChevronDown } from "lucide-react";
import { API, authFetch } from "@/lib/api";

/* ── Types ──────────────────────────────────────────────── */
type MerchantStatus = {
  isConnected: boolean;
  merchantId: string | null;
  connectedAt: string | null;
  orgName: string;
};

type MinuAgentStatus = {
  isConnected: boolean;
  username: string | null;
  branchId: string | null;
  passwordSet: boolean;
  connectedAt: string | null;
  orgName: string;
};

type BankAccount = {
  account_bank_code: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
};

type City = { code: string; name: string };
type District = { code: string; name: string };

/* ── Constants ──────────────────────────────────────────── */
const MCC_OPTIONS = [
  { code: "5311", label: "Дэлгүүр (Department Store)" },
  { code: "5411", label: "Хүнсний дэлгүүр (Grocery)" },
  { code: "5812", label: "Хоол, зоогийн газар (Restaurant)" },
  { code: "5999", label: "Бусад худалдаа (Other Retail)" },
  { code: "5045", label: "Компьютер, тоног төхөөрөмж (Electronics)" },
  { code: "5699", label: "Хувцас, бараа (Apparel)" },
  { code: "7011", label: "Зочид буудал (Hotel)" },
  { code: "4121", label: "Такси (Taxi)" },
  { code: "5912", label: "Эмийн сан (Pharmacy)" },
  { code: "7399", label: "Бизнесийн үйлчилгээ (Business Services)" },
];

const BANK_OPTIONS = [
  { code: "050000", name: "Хаан банк" },
  { code: "150000", name: "Голомт банк" },
  { code: "040000", name: "TDB (Худалдаа Хөгжлийн банк)" },
  { code: "020000", name: "Капитал банк" },
  { code: "320000", name: "ХасБанк" },
  { code: "340000", name: "Улсын банк" },
  { code: "010000", name: "Төрийн банк" },
  { code: "300000", name: "Капитрон банк" },
  { code: "190000", name: "Транс банк" },
  { code: "060000", name: "Ариг банк" },
  { code: "290000", name: "Богд банк" },
  { code: "210000", name: "Нэшнл Инвестмент банк" },
  { code: "990000", name: "Мобифинанс" },
];

type MerchantSettingsMode = "qpay" | "terminal";

/* ── Component ──────────────────────────────────────────── */
export function MerchantSettingsSection({
  organizationId,
  mode = "qpay",
}: {
  organizationId?: string;
  mode?: MerchantSettingsMode;
}) {
  const [merchantStatus, setMerchantStatus] = useState<MerchantStatus | null>(null);
  const [minuStatus, setMinuStatus] = useState<MinuAgentStatus | null>(null);
  const [isQpayLoading, setIsQpayLoading] = useState(true);
  const [isMinuLoading, setIsMinuLoading] = useState(true);
  const [tab, setTab] = useState<"register" | "manual">("register");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedBankAccounts, setSavedBankAccounts] = useState<BankAccount[]>([]);
  const [editingBankAccounts, setEditingBankAccounts] = useState(false);
  const [connectedBankAccounts, setConnectedBankAccounts] = useState<BankAccount[]>([
    { account_bank_code: "050000", account_number: "", account_name: "", is_default: true },
  ]);
  const [confirmNumbers, setConfirmNumbers] = useState<string[]>([""]);

  // Registration form state
  const [merchantType, setMerchantType] = useState<"company" | "person">("company");
  const [registerNumber, setRegisterNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mccCode, setMccCode] = useState("5311");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    { account_bank_code: "050000", account_number: "", account_name: "", is_default: true },
  ]);

  const [regConfirmNumbers, setRegConfirmNumbers] = useState<string[]>([""]);

  // City / district
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  // Manual connect form
  const [merchantId, setMerchantId] = useState("");
  const [merchantKey, setMerchantKey] = useState("");
  const [invoiceCode, setInvoiceCode] = useState("");
  const [recoveryRegNum, setRecoveryRegNum] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [minuUsername, setMinuUsername] = useState("");
  const [minuPassword, setMinuPassword] = useState("");
  const [minuBranchId, setMinuBranchId] = useState("");

  useEffect(() => {
    if (!organizationId) return;

    if (mode === "terminal") {
      loadMinuStatus();
      return;
    }

    loadMerchantStatus();
    loadCities();
    loadBankAccounts();
  }, [mode, organizationId]);

  useEffect(() => {
    if (city) loadDistricts(city);
    else setDistricts([]);
    setDistrict("");
  }, [city]);

  const orgQuery = organizationId ? `?organizationId=${organizationId}` : "";

  const loadBankAccounts = async () => {
    try {
      const res = await authFetch(`${API}/vendor/merchant/bank-accounts${orgQuery}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.bank_accounts) && data.bank_accounts.length > 0) {
          setSavedBankAccounts(data.bank_accounts);
          setConnectedBankAccounts(data.bank_accounts);
        }
      }
    } catch {}
  };

  const loadMerchantStatus = async () => {
    setIsQpayLoading(true);
    try {
      const res = await authFetch(`${API}/vendor/merchant/status${orgQuery}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setMerchantStatus(data);
      }
    } finally {
      setIsQpayLoading(false);
    }
  };

  const loadMinuStatus = async () => {
    setIsMinuLoading(true);
    try {
      const res = await authFetch(`${API}/vendor/merchant/minu/status${orgQuery}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMinuStatus(data);
          setMinuUsername(data.username || "");
          setMinuBranchId(data.branchId || "");
        }
      }
    } catch {} finally {
      setIsMinuLoading(false);
    }
  };

  const loadCities = async () => {
    setCitiesLoading(true);
    try {
      const res = await authFetch(`${API}/vendor/merchant/cities`);
      if (res.ok) {
        const data = await res.json();
        setCities(data.cities || []);
      }
    } finally {
      setCitiesLoading(false);
    }
  };

  const loadDistricts = async (cityCode: string) => {
    try {
      const res = await authFetch(`${API}/vendor/merchant/districts/${cityCode}`);
      if (res.ok) {
        const data = await res.json();
        setDistricts(data.districts || []);
      }
    } catch {}
  };

  /* ── Register ─────────────────────────────────────────── */
  const handleRegister = async () => {
    if (!registerNumber || !displayName || !mccCode || !address || !phone || !email) {
      setMessage({ type: "error", text: "Бүх шаардлагатай талбарыг бөглөнө үү" });
      return;
    }
    if (merchantType === "company" && !companyName) {
      setMessage({ type: "error", text: "Байгууллагын нэр шаардлагатай" });
      return;
    }
    const validBanks = bankAccounts.filter((b) => b.account_number && b.account_name);
    if (validBanks.length === 0) {
      setMessage({ type: "error", text: "Дор хаяж нэг банкны данс бүрэн бөглөнө үү" });
      return;
    }
    for (let i = 0; i < bankAccounts.length; i++) {
      const b = bankAccounts[i];
      if (!b.account_number) continue;
      if ((regConfirmNumbers[i] ?? "") !== b.account_number) {
        setMessage({ type: "error", text: `Данс ${i + 1}-н дугаар баталгаажаагүй байна. Дугаарыг давтан оруулна уу.` });
        return;
      }
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const body =
        merchantType === "company"
          ? {
              type: "company",
              register_number: registerNumber,
              company_name: companyName,
              name: displayName,
              mcc_code: mccCode,
              city,
              district,
              address,
              phone,
              email,
              owner_first_name: ownerFirstName || undefined,
              owner_last_name: ownerLastName || undefined,
              bank_accounts: validBanks.length > 0 ? validBanks : undefined,
            }
          : {
              type: "person",
              register_number: registerNumber,
              business_name: companyName || displayName,
              name: displayName,
              first_name: ownerFirstName || undefined,
              last_name: ownerLastName || undefined,
              mcc_code: mccCode,
              city,
              district,
              address,
              phone,
              email,
              bank_accounts: validBanks.length > 0 ? validBanks : undefined,
            };

      const res = await authFetch(`${API}/vendor/merchant/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, ...(organizationId ? { organizationId } : {}) }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "QPay мерчант амжилттай бүртгэгдлээ!" });
        await loadMerchantStatus();
      } else if (data.alreadyRegistered) {
        // Auto-switch to manual tab so the user can connect with existing credentials
        setTab("manual");
        setMessage({
          type: "error",
          text: data.message,
        });
      } else {
        setMessage({ type: "error", text: data.message || "Бүртгэхэд алдаа гарлаа" });
      }
    } catch {
      setMessage({ type: "error", text: "Серверийн алдаа" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Manual connect ───────────────────────────────────── */
  const handleManualConnect = async () => {
    if (!merchantId || !merchantKey) {
      setMessage({ type: "error", text: "Мерчант ID ба key шаардлагатай" });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await authFetch(`${API}/vendor/merchant/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          merchantKey,
          ...(invoiceCode ? { invoiceCode } : {}),
          ...(organizationId ? { organizationId } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setMerchantId(""); setMerchantKey(""); setInvoiceCode("");
        await loadMerchantStatus();
      } else {
        setMessage({ type: "error", text: data.message || "Алдаа гарлаа" });
      }
    } catch {
      setMessage({ type: "error", text: "Серверийн алдаа" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Recover ──────────────────────────────────────────── */
  const handleRecover = async () => {
    if (!recoveryRegNum) {
      setMessage({ type: "error", text: "Регистрийн дугаараа оруулна уу" });
      return;
    }
    setRecoveryLoading(true);
    setMessage(null);
    try {
      const res = await authFetch(`${API}/vendor/merchant/recover/${encodeURIComponent(recoveryRegNum)}${orgQuery}`);
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        await loadMerchantStatus();
      } else {
        setMessage({ type: "error", text: data.message || "Мэдээлэл олдсонгүй" });
      }
    } catch {
      setMessage({ type: "error", text: "Серверийн алдаа" });
    } finally {
      setRecoveryLoading(false);
    }
  };

  /* ── Disconnect ───────────────────────────────────────── */
  const handleDisconnect = async () => {
    if (!confirm("Мерчант данс салгахыг зөвшөөрч байна уу?")) return;
    setIsSubmitting(true);
    try {
      const res = await authFetch(`${API}/vendor/merchant/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(organizationId ? { organizationId } : {}),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        await loadMerchantStatus();
      } else {
        setMessage({ type: "error", text: data.message || "Алдаа гарлаа" });
      }
    } catch {
      setMessage({ type: "error", text: "Серверийн алдаа" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMinuConnect = async () => {
    if (!minuUsername.trim() || !minuBranchId.trim()) {
      setMessage({ type: "error", text: "Minu username болон branchId шаардлагатай" });
      return;
    }
    if (!minuPassword.trim() && !minuStatus?.passwordSet) {
      setMessage({ type: "error", text: "Minu password шаардлагатай" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await authFetch(`${API}/vendor/merchant/minu/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: minuUsername.trim(),
          ...(minuPassword.trim() ? { password: minuPassword.trim() } : {}),
          branchId: minuBranchId.trim(),
          ...(organizationId ? { organizationId } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setMinuPassword("");
        await loadMinuStatus();
      } else {
        setMessage({ type: "error", text: data.message || "Minu Agent холбоход алдаа гарлаа" });
      }
    } catch {
      setMessage({ type: "error", text: "Серверийн алдаа" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMinuDisconnect = async () => {
    if (!confirm("Minu Agent merchant салгахыг зөвшөөрч байна уу?")) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await authFetch(`${API}/vendor/merchant/minu/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(organizationId ? { organizationId } : {}),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setMinuUsername("");
        setMinuPassword("");
        setMinuBranchId("");
        await loadMinuStatus();
      } else {
        setMessage({ type: "error", text: data.message || "Minu Agent салгахад алдаа гарлаа" });
      }
    } catch {
      setMessage({ type: "error", text: "Серверийн алдаа" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Bank account helpers ─────────────────────────────── */
  const addBankAccount = () => {
    setBankAccounts((prev) => [
      ...prev,
      { account_bank_code: "050000", account_number: "", account_name: "", is_default: false },
    ]);
    setRegConfirmNumbers((prev) => [...prev, ""]);
  };

  const removeBankAccount = (i: number) => {
    setBankAccounts((prev) => prev.filter((_, idx) => idx !== i));
    setRegConfirmNumbers((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateBankAccount = (i: number, field: keyof BankAccount, value: string | boolean) => {
    setBankAccounts((prev) =>
      prev.map((b, idx) => {
        if (idx !== i) return field === "is_default" && value ? { ...b, is_default: false } : b;
        return { ...b, [field]: value };
      }),
    );
  };

  const renderMinuSection = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">Minu POS terminal merchant</p>
          <p className="mt-1 text-sm text-slate-500">
            Картын terminal төлбөр тухайн дэлгүүрийн Minu merchant дээр бүртгэлтэй данс руу орно.
          </p>
        </div>
        {minuStatus?.isConnected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <Check className="h-3.5 w-3.5" />
            Холбогдсон
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            <AlertCircle className="h-3.5 w-3.5" />
            Холбоогүй
          </span>
        )}
      </div>

      {minuStatus?.isConnected && (
        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Username: <span className="font-mono font-bold">{minuStatus.username}</span>
          <span className="mx-2 text-emerald-500">·</span>
          Branch ID: <span className="font-mono font-bold">{minuStatus.branchId}</span>
          {minuStatus.connectedAt && (
            <span className="ml-2 text-xs text-emerald-600">
              {new Date(minuStatus.connectedAt).toLocaleDateString("mn-MN")}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Minu username">
          <input
            type="text"
            value={minuUsername}
            onChange={(e) => setMinuUsername(e.target.value)}
            placeholder="Merchant username"
            className={inputCls}
          />
        </Field>
        <Field label="Minu branchId">
          <input
            type="text"
            value={minuBranchId}
            onChange={(e) => setMinuBranchId(e.target.value)}
            placeholder="Branch ID"
            className={inputCls}
          />
        </Field>
        <Field label="Minu password">
          <input
            type="password"
            value={minuPassword}
            onChange={(e) => setMinuPassword(e.target.value)}
            placeholder={minuStatus?.passwordSet ? "Хадгалагдсан. Солих бол шинээр бичнэ." : "Merchant password"}
            className={inputCls}
          />
        </Field>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={handleMinuConnect}
            disabled={isSubmitting || !minuUsername.trim() || !minuBranchId.trim()}
            className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {minuStatus?.isConnected ? "Minu тохиргоо шинэчлэх" : "Minu холбох"}
          </button>
          {minuStatus?.isConnected && (
            <button
              type="button"
              onClick={handleMinuDisconnect}
              disabled={isSubmitting}
              className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              Салгах
            </button>
          )}
        </div>
      </div>
    </div>
  );

  /* ── Render ───────────────────────────────────────────── */
  const isLoading = mode === "terminal" ? isMinuLoading : isQpayLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">Ачаалж байна...</span>
      </div>
    );
  }

  if (mode === "terminal") {
    return (
      <div className="space-y-6">
        {renderMinuSection()}

        {message && (
          <div className={`rounded-lg p-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {message.text}
          </div>
        )}
      </div>
    );
  }

  /* Connected state */
  if (merchantStatus?.isConnected) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
          <Check className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-900">QPay мерчант холбогдсон</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              Мерчант ID: <span className="font-mono font-bold">{merchantStatus.merchantId}</span>
            </p>
            {merchantStatus.connectedAt && (
              <p className="text-xs text-emerald-600 mt-1">
                {new Date(merchantStatus.connectedAt).toLocaleDateString("mn-MN")} бүртгэгдсэн
              </p>
            )}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(merchantStatus.merchantId || "");
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="ml-auto p-1.5 hover:bg-emerald-100 rounded"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-emerald-600" />}
          </button>
        </div>

        {/* Bank accounts section */}
        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800 text-sm">Банкны данс</p>
            {!editingBankAccounts && (
              <button
                onClick={() => {
                  setEditingBankAccounts(true);
                  setConfirmNumbers(connectedBankAccounts.map(() => ""));
                }}
                className="text-xs text-[#5B4CFF] hover:underline font-medium"
              >
                {savedBankAccounts.length > 0 ? "Засах" : "+ Данс нэмэх"}
              </button>
            )}
          </div>

          {!editingBankAccounts && savedBankAccounts.length === 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              ⚠️ Банкны данс бүртгэгдээгүй байна. QPay QR үүсгэхийн тулд данс нэмнэ үү.
            </div>
          )}

          {!editingBankAccounts && savedBankAccounts.length > 0 && (
            <div className="space-y-2">
              {savedBankAccounts.map((b, i) => {
                const bank = BANK_OPTIONS.find((o) => o.code === b.account_bank_code);
                return (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="font-medium">{bank?.name || b.account_bank_code}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono">{b.account_number}</span>
                    <span className="text-slate-400">·</span>
                    <span>{b.account_name}</span>
                    {b.is_default && <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Үндсэн</span>}
                  </div>
                );
              })}
            </div>
          )}

          {editingBankAccounts && (
            <div className="space-y-3">
              {connectedBankAccounts.map((b, i) => {
                const confirmVal = confirmNumbers[i] ?? "";
                const mismatch = confirmVal.length > 0 && confirmVal !== b.account_number;
                return (
                  <div key={i} className="rounded-lg border border-slate-200 p-3 space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-500">Данс {i + 1}</span>
                      {connectedBankAccounts.length > 1 && (
                        <button onClick={() => {
                          setConnectedBankAccounts((prev) => prev.filter((_, idx) => idx !== i));
                          setConfirmNumbers((prev) => prev.filter((_, idx) => idx !== i));
                        }} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <select
                      value={b.account_bank_code}
                      onChange={(e) => setConnectedBankAccounts((prev) => prev.map((x, idx) => idx === i ? { ...x, account_bank_code: e.target.value } : x))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/30"
                    >
                      {BANK_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
                    </select>
                    <input
                      placeholder="Дансны дугаар"
                      value={b.account_number}
                      onChange={(e) => {
                        setConnectedBankAccounts((prev) => prev.map((x, idx) => idx === i ? { ...x, account_number: e.target.value } : x));
                        setConfirmNumbers((prev) => { const n = [...prev]; n[i] = ""; return n; });
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/30"
                    />
                    <input
                      placeholder="Дансны дугаар давтан оруулах (баталгаажуулах)"
                      value={confirmVal}
                      onChange={(e) => setConfirmNumbers((prev) => { const n = [...prev]; n[i] = e.target.value; return n; })}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${mismatch ? "border-red-400 focus:ring-red-200" : confirmVal && !mismatch ? "border-emerald-400 focus:ring-emerald-200" : "border-slate-200 focus:ring-[#5B4CFF]/30"}`}
                    />
                    {mismatch && <p className="text-xs text-red-500">Дансны дугаар таарахгүй байна</p>}
                    {confirmVal && !mismatch && <p className="text-xs text-emerald-600">✓ Дансны дугаар таарч байна</p>}
                    <input
                      placeholder="Дансны нэр (эзэмшигч)"
                      value={b.account_name}
                      onChange={(e) => setConnectedBankAccounts((prev) => prev.map((x, idx) => idx === i ? { ...x, account_name: e.target.value } : x))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/30"
                    />
                  </div>
                );
              })}
              <button
                onClick={() => {
                  setConnectedBankAccounts((prev) => [...prev, { account_bank_code: "050000", account_number: "", account_name: "", is_default: false }]);
                  setConfirmNumbers((prev) => [...prev, ""]);
                }}
                className="flex items-center gap-1 text-xs text-[#5B4CFF] hover:underline"
              >
                <Plus className="h-3 w-3" /> Данс нэмэх
              </button>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={async () => {
                    const valid = connectedBankAccounts.filter((b) => b.account_number && b.account_name);
                    if (valid.length === 0) {
                      setMessage({ type: "error", text: "Дор хаяж нэг данс бүрэн бөглөнө үү" });
                      return;
                    }
                    // Баталгаажуулалт шалгах
                    for (let i = 0; i < connectedBankAccounts.length; i++) {
                      const b = connectedBankAccounts[i];
                      if (!b.account_number) continue;
                      if ((confirmNumbers[i] ?? "") !== b.account_number) {
                        setMessage({ type: "error", text: `Данс ${i + 1}-н дугаар баталгаажаагүй байна. Дугаарыг давтан оруулна уу.` });
                        return;
                      }
                    }
                    setIsSubmitting(true);
                    setMessage(null);
                    try {
                      const res = await authFetch(`${API}/vendor/merchant/bank-accounts`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ bank_accounts: valid, organizationId: organizationId || undefined }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setSavedBankAccounts(valid);
                        setEditingBankAccounts(false);
                        setMessage({ type: "success", text: "Банкны данс хадгалагдлаа" });
                      } else {
                        setMessage({ type: "error", text: data.message || "Алдаа гарлаа" });
                      }
                    } catch {
                      setMessage({ type: "error", text: "Алдаа гарлаа" });
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded-lg bg-[#5B4CFF] text-white text-sm font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? "Хадгалж байна..." : "Хадгалах"}
                </button>
                <button
                  onClick={() => {
                    setEditingBankAccounts(false);
                    setConnectedBankAccounts(savedBankAccounts.length > 0 ? savedBankAccounts : [{ account_bank_code: "050000", account_number: "", account_name: "", is_default: true }]);
                    setConfirmNumbers(savedBankAccounts.map(() => ""));
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold"
                >
                  Болих
                </button>
              </div>
            </div>
          )}
        </div>

        {message && (
          <div className={`rounded-lg p-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {message.text}
          </div>
        )}

        <button
          onClick={handleDisconnect}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Мерчант данс салгах
        </button>
      </div>
    );
  }

  /* Registration / connect form */
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-amber-900">QPay данс холбоогүй байна</p>
          <p className="text-sm text-amber-700">Кассын болон онлайн төлбөр хүлээн авахын тулд QPay данс бүртгүүлэх шаардлагатай.</p>
        </div>
      </div>

      {message && (
        <div className={`rounded-lg p-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => setTab("register")}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${tab === "register" ? "bg-[#5B4CFF] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          Шинээр бүртгүүлэх
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${tab === "manual" ? "bg-[#5B4CFF] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          Данс аль хэдийн байна
        </button>
      </div>

      {/* ── REGISTER TAB ── */}
      {tab === "register" && (
        <div className="space-y-5">
          {/* Merchant type */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Мерчант төрөл</label>
            <div className="flex gap-3">
              {(["company", "person"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setMerchantType(t)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${merchantType === t ? "border-[#5B4CFF] bg-indigo-50 text-[#5B4CFF]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  {t === "company" ? "Байгууллага (ААН)" : "Хувь хүн"}
                </button>
              ))}
            </div>
          </div>

          {/* Register number */}
          <Field label={merchantType === "company" ? "ААН-ийн улсын бүртгэлийн дугаар *" : "Регистрийн дугаар *"}>
            <input
              type="text"
              value={registerNumber}
              onChange={(e) => setRegisterNumber(e.target.value)}
              placeholder={merchantType === "company" ? "9323472" : "АМ05321712"}
              className={inputCls}
            />
          </Field>

          {/* Company/business name */}
          <Field label={merchantType === "company" ? "Байгууллагын нэр *" : "Бизнесийн нэр *"}>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={merchantType === "company" ? "ХХК нэр" : "Дэлгүүрийн нэр"}
              className={inputCls}
            />
          </Field>

          {/* Display name */}
          <Field label="Харуулах нэр (QPay дээр харагдах) *">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="MYSHOP_MN"
              className={inputCls}
            />
          </Field>

          {/* Owner name */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Эзэмшигчийн овог">
              <input type="text" value={ownerLastName} onChange={(e) => setOwnerLastName(e.target.value)} placeholder="Батбаяр" className={inputCls} />
            </Field>
            <Field label="Эзэмшигчийн нэр">
              <input type="text" value={ownerFirstName} onChange={(e) => setOwnerFirstName(e.target.value)} placeholder="Оюунбаяр" className={inputCls} />
            </Field>
          </div>

          {/* MCC */}
          <Field label="Үйл ажиллагааны төрөл (MCC) *">
            <div className="relative">
              <select value={mccCode} onChange={(e) => setMccCode(e.target.value)} className={inputCls + " appearance-none pr-8"}>
                {MCC_OPTIONS.map((m) => (
                  <option key={m.code} value={m.code}>{m.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </Field>

          {/* City */}
          <Field label="Аймаг/Хот *">
            {cities.length > 0 ? (
              <div className="relative">
                <select value={city} onChange={(e) => setCity(e.target.value)} className={inputCls + " appearance-none pr-8"}>
                  <option value="">Сонгоно уу</option>
                  {cities.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            ) : (
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={citiesLoading ? "Ачаалж байна..." : "11000 (Улаанбаатар)"}
                disabled={citiesLoading}
                className={inputCls}
              />
            )}
          </Field>

          {/* District */}
          <Field label="Дүүрэг/Сум *">
            {districts.length > 0 ? (
              <div className="relative">
                <select value={district} onChange={(e) => setDistrict(e.target.value)} className={inputCls + " appearance-none pr-8"}>
                  <option value="">Сонгоно уу</option>
                  {districts.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            ) : (
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="12000 (Хан-Уул)"
                className={inputCls}
              />
            )}
          </Field>

          {/* Address */}
          <Field label="Дэлгэрэнгүй хаяг *">
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="6 хороо, 14-10 тоот" className={inputCls} />
          </Field>

          {/* Phone & email */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Утас *">
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="99112210" className={inputCls} />
            </Field>
            <Field label="И-мэйл *">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@shop.mn" className={inputCls} />
            </Field>
          </div>

          {/* Bank accounts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Банкны данс</label>
              <button onClick={addBankAccount} className="flex items-center gap-1 text-xs text-[#5B4CFF] hover:underline font-semibold">
                <Plus className="h-3.5 w-3.5" /> Данс нэмэх
              </button>
            </div>
            <div className="space-y-3">
              {bankAccounts.map((b, i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="relative flex-1 mr-2">
                      <select
                        value={b.account_bank_code}
                        onChange={(e) => updateBankAccount(i, "account_bank_code", e.target.value)}
                        className={inputCls + " appearance-none pr-8"}
                      >
                        {BANK_OPTIONS.map((bk) => <option key={bk.code} value={bk.code}>{bk.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                    {bankAccounts.length > 1 && (
                      <button onClick={() => removeBankAccount(i)} className="p-1.5 text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={b.account_number}
                    onChange={(e) => {
                      updateBankAccount(i, "account_number", e.target.value);
                      setRegConfirmNumbers((prev) => { const n = [...prev]; n[i] = ""; return n; });
                    }}
                    placeholder="Дансны дугаар"
                    className={inputCls}
                  />
                  {(() => {
                    const confirmVal = regConfirmNumbers[i] ?? "";
                    const mismatch = confirmVal.length > 0 && confirmVal !== b.account_number;
                    return (
                      <>
                        <input
                          type="text"
                          value={confirmVal}
                          onChange={(e) => setRegConfirmNumbers((prev) => { const n = [...prev]; n[i] = e.target.value; return n; })}
                          placeholder="Дансны дугаар давтан оруулах (баталгаажуулах)"
                          className={inputCls + (mismatch ? " border-red-400" : confirmVal && !mismatch ? " border-emerald-400" : "")}
                        />
                        {mismatch && <p className="text-xs text-red-500">Дансны дугаар таарахгүй байна</p>}
                        {confirmVal && !mismatch && <p className="text-xs text-emerald-600">✓ Таарч байна</p>}
                      </>
                    );
                  })()}
                  <input
                    type="text"
                    value={b.account_name}
                    onChange={(e) => updateBankAccount(i, "account_name", e.target.value)}
                    placeholder="Дансны эзэмшигчийн нэр"
                    className={inputCls}
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      name="defaultBank"
                      checked={b.is_default}
                      onChange={() => updateBankAccount(i, "is_default", true)}
                      className="accent-[#5B4CFF]"
                    />
                    Үндсэн данс
                  </label>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleRegister}
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg bg-[#5B4CFF] hover:bg-[#4A3CDB] text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            QPay мерчант бүртгүүлэх
          </button>
        </div>
      )}

      {/* ── MANUAL TAB ── */}
      {tab === "manual" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-2 border-b pb-2 border-slate-100">
              Мэдээллээ сэргээх (Мартсан үед)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Та QPay мерчант бүртгэлтэй ч ID/Key-ээ мартсан бол регистрийн дугаараараа хайж олох боломжтой.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={recoveryRegNum}
                onChange={(e) => setRecoveryRegNum(e.target.value)}
                placeholder="Регистрийн дугаар (Ж: АМ12345678)"
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/30 focus:border-[#5B4CFF] focus:bg-white transition-all"
              />
              <button
                onClick={handleRecover}
                disabled={recoveryLoading || !recoveryRegNum}
                className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                {recoveryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Хайх & Холбох
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold tracking-wider">Эсвэл гараар оруулах</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <Field label="Мерчант ID *">
              <input type="text" value={merchantId} onChange={(e) => setMerchantId(e.target.value)} placeholder="Жишээ: MYSHOP_MN" className={inputCls} />
            </Field>
            <Field label="Мерчант Key *">
              <input type="password" value={merchantKey} onChange={(e) => setMerchantKey(e.target.value)} placeholder="•••••••••" className={inputCls} />
            </Field>
            <Field label="Invoice Code (заавал биш)">
              <input type="text" value={invoiceCode} onChange={(e) => setInvoiceCode(e.target.value)} placeholder="Хоосон орхивол Мерчант ID ашиглагдана" className={inputCls} />
            </Field>
            <button
              onClick={handleManualConnect}
              disabled={isSubmitting || !merchantId || !merchantKey}
              className="w-full py-3 rounded-lg bg-[#5B4CFF] hover:bg-[#4A3CDB] text-white font-semibold shadow-md shadow-[#5B4CFF]/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 transition-all"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Холбох
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helper components ──────────────────────────────────── */
const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/30 focus:border-[#5B4CFF]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
