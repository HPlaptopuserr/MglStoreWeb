"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Save, Loader2, RotateCcw, Eye, EyeOff, Check,
  Settings2, AlertCircle, ArrowLeft, Plus,
} from "lucide-react";
import Link from "next/link";
import { API, adminFetch } from "@/lib/api";
import { DEFAULT_CONFIG, type AssociationConfig, type MembershipType } from "./_types";
import { AssociationFormPreview } from "./AssociationFormPreview";
import { MembershipTypeEditor } from "./MembershipTypeEditor";
import { createMembershipType } from "./membershipTypeUtils";
import {
  CONTRACT_PAYMENT_ACCOUNTS_KEY,
  type ContractPaymentAccount,
  getBankLabel,
  parseContractPaymentAccounts,
} from "@/components/organisms/sections/contract/PaymentAccountPanels";

const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white";

function mergePaymentAccounts(...groups: ContractPaymentAccount[][]) {
  const map = new Map<string, ContractPaymentAccount>();
  groups.flat().forEach((account) => {
    const key =
      account.id ||
      account.merchantCode ||
      `${account.bankCode}:${account.accountNumber}`;
    if (!key) return;
    map.set(key, { ...map.get(key), ...account });
  });
  return Array.from(map.values()).filter(
    (account) => account.merchantCode || account.accountNumber,
  );
}

function getPaymentAccountKey(account: Partial<ContractPaymentAccount>) {
  return (
    account.id ||
    account.merchantCode ||
    `${account.bankCode || ""}:${account.accountNumber || ""}`
  );
}

export default function AssociationSettingsPage() {
  const [config, setConfig] = useState<AssociationConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [paymentAccounts, setPaymentAccounts] = useState<ContractPaymentAccount[]>([]);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [res, settingsRes, contractsRes] = await Promise.all([
        adminFetch(`${API}/admin/association/config`),
        adminFetch(`${API}/site-settings/admin`),
        adminFetch(`${API}/contracts`),
      ]);
      let loadedPaymentAccounts: ContractPaymentAccount[] = [];
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        loadedPaymentAccounts = parseContractPaymentAccounts(
          settings?.[CONTRACT_PAYMENT_ACCOUNTS_KEY],
        );
      }
      if (contractsRes.ok) {
        const contractsData = await contractsRes.json().catch(() => null);
        const latestTemplateId = contractsData?.contracts?.[0]?.id;
        if (latestTemplateId) {
          const detailRes = await adminFetch(`${API}/contracts/${latestTemplateId}`);
          const detail = await detailRes.json().catch(() => null);
          const headerData = detail?.contract?.headerData;
          const templateAccounts = Array.isArray(headerData?.paymentAccounts)
            ? headerData.paymentAccounts
            : [];
          loadedPaymentAccounts = mergePaymentAccounts(
            loadedPaymentAccounts,
            templateAccounts,
          );
        }
      }
      setPaymentAccounts(loadedPaymentAccounts);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setConfig({
            ...DEFAULT_CONFIG,
            ...data,
            upgradeModal: {
              ...DEFAULT_CONFIG.upgradeModal,
              ...(data.upgradeModal ?? {}),
            },
            paymentAccount: {
              ...DEFAULT_CONFIG.paymentAccount,
              ...(data.paymentAccount ?? {}),
            },
            membershipTypes:
              Array.isArray(data.membershipTypes)
                ? data.membershipTypes
                : DEFAULT_CONFIG.membershipTypes,
          });
        }
      }
    } catch { /* use defaults */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    if (config.paymentAccount.selectedAccountId) {
      if (!config.paymentAccount.merchantCode) {
        setSaving(false);
        setError("Сонгосон дансны merchantCode дутуу байна. Minu дансаа дахин холбож хадгална уу.");
        return;
      }
      if (!config.paymentAccount.password) {
        setSaving(false);
        setError("Сонгосон дансны password хадгалагдаагүй байна. Minu дансаа дахин холбож хадгална уу.");
        return;
      }
    }
    try {
      const res = await adminFetch(`${API}/admin/association/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Алдаа гарлаа"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Сүлжээний алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const updateType = (idx: number, updated: MembershipType) =>
    setConfig((c) => ({
      ...c,
      membershipTypes: c.membershipTypes.map((t, i) => (i === idx ? updated : t)),
    }));

  const addMembershipType = () =>
    setConfig((c) => ({
      ...c,
      membershipTypes: [
        ...c.membershipTypes,
        createMembershipType(c.membershipTypes.length),
      ],
    }));

  const removeMembershipType = (idx: number) =>
    setConfig((c) => ({
      ...c,
      membershipTypes: c.membershipTypes.filter((_, i) => i !== idx),
    }));

  const selectPaymentAccount = (accountId: string) => {
    const account = paymentAccounts.find(
      (item) => getPaymentAccountKey(item) === accountId || item.id === accountId,
    );
    setConfig((c) => ({
      ...c,
      paymentAccount: account
        ? {
            ...c.paymentAccount,
            selectedAccountId: getPaymentAccountKey(account),
            bankName: getBankLabel(account.bankCode),
            bankCode: account.bankCode,
            accountNumber: account.accountNumber,
            accountName: account.label || account.merchantName,
            merchantCode: account.merchantCode,
            username: account.username || account.merchantCode,
            password: account.password || c.paymentAccount.password || "",
          }
        : {
            ...c.paymentAccount,
            selectedAccountId: "",
            bankName: "",
            bankCode: "",
            accountNumber: "",
            accountName: "",
            merchantCode: "",
            username: "",
            password: "",
          },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3">
        <Loader2 size={28} className="animate-spin text-violet-400" />
        <p className="text-sm text-slate-400 font-semibold">Тохиргоо ачааллаж байна...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/association"
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors"
          >
            <ArrowLeft size={15} />
          </Link>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-100">
            <Settings2 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">Бүртгэлийн маягт тохиргоо</h1>
            <p className="text-xs text-slate-400 mt-0.5">Гишүүнчлэлийн загвар, үнэ, тайлбарыг засах</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowPreview((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
              showPreview
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            Preview
          </button>
          <button
            onClick={() => { if (confirm("Анхны утгуудаар сэргээх үү?")) setConfig(DEFAULT_CONFIG); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw size={14} />Сэргээх
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-60 shadow-sm ${
              saved
                ? "bg-emerald-600 text-white shadow-emerald-100"
                : "bg-violet-600 hover:bg-violet-700 text-white shadow-violet-100"
            }`}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
            {saving ? "Хадгалж байна..." : saved ? "Хадгалагдлаа!" : "Хадгалах"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Two-column ───────────────────────────────────────── */}
      <div className={`grid gap-6 items-start ${showPreview ? "grid-cols-1 xl:grid-cols-[1fr_360px]" : "grid-cols-1 max-w-2xl"}`}>

        {/* ── Editor panel ──────────────────────────────────── */}
        <div className="space-y-5 min-w-0">

          {/* Page header section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-black">T</span>
              <h2 className="text-sm font-bold text-slate-700">Хуудасны толгой хэсэг</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                  Label (дээд хэсгийн жижиг хаяг)
                </label>
                <input
                  value={config.pageLabel}
                  onChange={(e) => setConfig((c) => ({ ...c, pageLabel: e.target.value }))}
                  className={inp}
                  placeholder="БҮРТГЭЛИЙН ХУУДАС"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Гарчиг</label>
                <textarea
                  value={config.pageTitle}
                  onChange={(e) => setConfig((c) => ({ ...c, pageTitle: e.target.value }))}
                  rows={3}
                  className={`${inp} resize-y min-h-[72px] max-h-[160px] overflow-y-auto`}
                  placeholder="Монгол эзэнтэй жижиг, дунд бизнес эрхлэгчдийн..."
                />
                <p className="text-[9px] text-slate-400 mt-1">Мөр шилжүүлэхийн тулд Enter дарна уу</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Дэд гарчиг</label>
                <input
                  value={config.pageSubtitle}
                  onChange={(e) => setConfig((c) => ({ ...c, pageSubtitle: e.target.value }))}
                  className={inp}
                  placeholder="Төлөөлөн удирдах зөвлөл томилох хурлын бүртгэл"
                />
              </div>
            </div>
          </div>

          {/* Payment account section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black">₮</span>
              <h2 className="text-sm font-bold text-slate-700">Гишүүнчлэлийн төлбөр авах данс</h2>
            </div>
            <div className="px-5 py-4">
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Төлбөр орох данс
                </span>
                <select
                  value={config.paymentAccount?.selectedAccountId ?? ""}
                  onChange={(event) => selectPaymentAccount(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="">Данс сонгоно уу</option>
                  {paymentAccounts.map((account) => (
                    <option key={getPaymentAccountKey(account)} value={getPaymentAccountKey(account)}>
                      {account.label || account.merchantName} · {getBankLabel(account.bankCode)} {account.accountNumber} · {account.merchantCode}
                      {!account.password ? " · password дутуу" : ""}
                    </option>
                  ))}
                </select>
                {paymentAccounts.length === 0 && (
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    Admin → Тохиргоо → Төлбөрийн данс эсвэл Гэрээний төлбөр
                    хэсэгт эхлээд Minu Dynamic QR данс холбоно уу.
                  </p>
                )}
              </label>
              {!config.paymentAccount?.merchantCode && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  Гишүүнчлэлийн QuickQR ажиллуулахын тулд төлбөрийн данс сонгож хадгална уу.
                </div>
              )}
            </div>
          </div>

          {/* Membership types section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-black">
                  G
                </span>
                <h2 className="text-sm font-bold text-slate-700">Гишүүнчлэлийн төрлүүд</h2>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full font-semibold">
                  {config.membershipTypes.length} төрөл
                </span>
              </div>
              <button
                type="button"
                onClick={addMembershipType}
                className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-black text-violet-600 transition hover:bg-violet-50"
              >
                <Plus size={13} />
                Card нэмэх
              </button>
            </div>
            <div className="px-4 py-4 space-y-2">
              {config.membershipTypes.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl">
                  <p className="text-sm text-slate-400">Гишүүнчлэлийн төрөл байхгүй байна</p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={addMembershipType}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-700"
                    >
                      <Plus size={13} />
                      Шинэ card нэмэх
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((c) => ({ ...c, membershipTypes: DEFAULT_CONFIG.membershipTypes }))
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
                    >
                      Үндсэн card-ууд сэргээх
                    </button>
                  </div>
                </div>
              ) : (
                config.membershipTypes.map((t, idx) => (
                  <MembershipTypeEditor
                    key={t.value}
                    type={t}
                    idx={idx}
                    onChange={(u) => updateType(idx, u)}
                    onRemove={() => removeMembershipType(idx)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Save reminder at bottom */}
          <div className="flex items-center justify-end gap-3 pb-4">
            <p className="text-xs text-slate-400">Өөрчлөлтүүдийг хадгалж дуусаарай</p>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-60 ${
                saved
                  ? "bg-emerald-600 text-white"
                  : "bg-violet-600 hover:bg-violet-700 text-white"
              }`}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
              {saving ? "Хадгалж байна..." : saved ? "Хадгалагдлаа!" : "Хадгалах"}
            </button>
          </div>
        </div>

        {/* ── Preview panel ─────────────────────────────────── */}
        {showPreview && (
          <div className="sticky top-6 self-start">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={13} className="text-slate-400" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Preview</p>
              <span className="text-[9px] text-slate-300">хэрэглэгч ийнхүү харна</span>
            </div>
            <AssociationFormPreview config={config} />
          </div>
        )}
      </div>
    </div>
  );
}
