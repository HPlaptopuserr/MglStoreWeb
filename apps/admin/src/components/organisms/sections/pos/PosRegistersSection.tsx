"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Monitor,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CreditCard,
  QrCode,
  CheckCircle2,
  XCircle,
  X,
  Save,
  ChevronDown,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import { OrgSearchDropdown } from "@/components/molecules/OrgSearchDropdown";

/* ─── types ──────────────────────────────────────────────────────────── */
type Org = { id: string; name: string; slug: string };
type Branch = { id: string; name: string; address: string };

type PosRegister = {
  id: string;
  name: string;
  label: string | null;
  branchId: string;
  organizationId: string;
  branch: { id: string; name: string };
  cardEnabled: boolean;
  cardProviderType: string | null;
  cardTerminalId: string | null;
  terminalBridgeUrl: string | null;
  qpayEnabled: boolean;
  qpayMerchantId: string | null;
  qpayTerminalId: string | null;
  isActive: boolean;
  activationStatus: string;
  createdAt: string;
};

type FormState = {
  name: string;
  label: string;
  branchId: string;
  cardEnabled: boolean;
  cardProviderType: string;
  cardTerminalId: string;
  terminalBridgeUrl: string;
  qpayEnabled: boolean;
  qpayMerchantId: string;
  qpayTerminalId: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  label: "",
  branchId: "",
  cardEnabled: false,
  cardProviderType: "",
  cardTerminalId: "",
  terminalBridgeUrl: "",
  qpayEnabled: false,
  qpayMerchantId: "",
  qpayTerminalId: "",
};

const CARD_PROVIDERS = ["PUSH_ECR", "QPOSLANE", "GANTIGO", "IDPAY"];
const getPosVisibilityKey = (organizationId: string) =>
  `pos-enabled-${organizationId}`;


/* ─── component ──────────────────────────────────────────────────────── */
export function PosRegistersSection() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [registers, setRegisters] = useState<PosRegister[]>([]);
  const [posVisible, setPosVisible] = useState(false);
  const [loadingPosVisibility, setLoadingPosVisibility] = useState(false);
  const [savingPosVisibility, setSavingPosVisibility] = useState(false);

  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingRegs, setLoadingRegs] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [checkingBridge, setCheckingBridge] = useState(false);
  const [bridgeCheckMessage, setBridgeCheckMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [quickBranchOpen, setQuickBranchOpen] = useState(false);
  const [quickBranchName, setQuickBranchName] = useState("");
  const [quickBranchAddress, setQuickBranchAddress] = useState("");
  const [quickBranchSaving, setQuickBranchSaving] = useState(false);
  const [quickBranchError, setQuickBranchError] = useState("");

  /* fetch orgs on mount */
  useEffect(() => {
    adminFetch(`${API}/partners?minimal=true`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data || data?.partners || [];
        setOrgs(list.map((p: any) => ({ id: p.id, name: p.name, slug: p.slug ?? "" })));
      })
      .catch(() => setError("Байгууллагын жагсаалт авахад алдаа гарлаа."))
      .finally(() => setLoadingOrgs(false));
  }, []);

  /* fetch branches + registers when org changes */
  const reload = useCallback(async (orgId: string) => {
    if (!orgId) return;
    setLoadingRegs(true);
    setLoadingPosVisibility(true);
    setError("");
    try {
      const [branchRes, regRes, settingRes] = await Promise.all([
        adminFetch(`${API}/admin/branches?organizationId=${orgId}`),
        adminFetch(`${API}/admin/pos-registers?organizationId=${orgId}`),
        adminFetch(`${API}/site-settings`),
      ]);
      if (branchRes.ok) setBranches(await branchRes.json());
      if (regRes.ok) setRegisters(await regRes.json());
      if (settingRes.ok) {
        const settings = (await settingRes.json()) as Record<string, string>;
        const raw = settings[getPosVisibilityKey(orgId)];
        const enabled =
          raw === "1" || raw === "true" || raw === "on";
        setPosVisible(enabled);
      } else {
        setPosVisible(false);
      }
    } catch {
      setError("Мэдээлэл авахад алдаа гарлаа.");
      setPosVisible(false);
    } finally {
      setLoadingRegs(false);
      setLoadingPosVisibility(false);
    }
  }, []);

  useEffect(() => {
    if (selectedOrgId) reload(selectedOrgId);
    else { setBranches([]); setRegisters([]); }
  }, [selectedOrgId, reload]);

  /* form helpers */
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(true);
    setError("");
    setBridgeCheckMessage(null);
  };

  const openEdit = (r: PosRegister) => {
    setForm({
      name: r.name,
      label: r.label ?? "",
      branchId: r.branchId,
      cardEnabled: r.cardEnabled,
      cardProviderType: r.cardProviderType ?? "",
      cardTerminalId: r.cardTerminalId ?? "",
      terminalBridgeUrl: r.terminalBridgeUrl ?? "",
      qpayEnabled: r.qpayEnabled,
      qpayMerchantId: r.qpayMerchantId ?? "",
      qpayTerminalId: r.qpayTerminalId ?? "",
    });
    setEditingId(r.id);
    setFormOpen(true);
    setError("");
    setBridgeCheckMessage(null);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setError("");
    setBridgeCheckMessage(null);
  };

  const handleQuickAddBranch = async () => {
    if (!quickBranchName.trim() || !quickBranchAddress.trim()) {
      setQuickBranchError("Нэр болон хаяг шаардлагатай");
      return;
    }
    setQuickBranchSaving(true);
    setQuickBranchError("");
    try {
      const res = await adminFetch(`${API}/partners/${selectedOrgId}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: quickBranchName.trim(), address: quickBranchAddress.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setQuickBranchError(err.message || "Салбар үүсгэхэд алдаа гарлаа");
        return;
      }
      const created: Branch = await res.json();
      setBranches((prev) => [...prev, created]);
      set("branchId", created.id);
      setQuickBranchOpen(false);
      setQuickBranchName("");
      setQuickBranchAddress("");
    } catch {
      setQuickBranchError("Сервертэй холбогдоход алдаа гарлаа");
    } finally {
      setQuickBranchSaving(false);
    }
  };

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const toggleCardEnabled = () => {
    setForm((prev) => {
      const nextEnabled = !prev.cardEnabled;
      if (nextEnabled) return { ...prev, cardEnabled: true };
      return {
        ...prev,
        cardEnabled: false,
        cardProviderType: "",
        cardTerminalId: "",
        terminalBridgeUrl: "",
      };
    });
    setBridgeCheckMessage(null);
  };

  const toggleQpayEnabled = () => {
    setForm((prev) => {
      const nextEnabled = !prev.qpayEnabled;
      if (nextEnabled) return { ...prev, qpayEnabled: true };
      return {
        ...prev,
        qpayEnabled: false,
        qpayMerchantId: "",
        qpayTerminalId: "",
      };
    });
  };

  const checkBridgeHealth = async () => {
    const rawUrl = form.terminalBridgeUrl.trim();

    if (!rawUrl) {
      setBridgeCheckMessage({
        type: "error",
        text: "Bridge URL оруулсны дараа шалгана уу.",
      });
      return;
    }

    let healthUrl = "";
    try {
      const parsed = new URL(rawUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("invalid-protocol");
      }
      healthUrl = `${parsed.origin}/health`;
    } catch {
      setBridgeCheckMessage({
        type: "error",
        text: "Bridge URL буруу байна.",
      });
      return;
    }

    setCheckingBridge(true);
    setBridgeCheckMessage(null);
    try {
      const res = await fetch(healthUrl, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        setBridgeCheckMessage({
          type: "error",
          text: `Bridge health check амжилтгүй (${res.status}).`,
        });
        return;
      }

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        provider?: string;
        port?: number;
      };

      if (!data.ok) {
        setBridgeCheckMessage({
          type: "error",
          text: "Bridge /health endpoint буруу хариу өглөө.",
        });
        return;
      }

      setBridgeCheckMessage({
        type: "success",
        text: `Bridge холболт OK${data.provider ? ` (${data.provider})` : ""}${data.port ? ` :${data.port}` : ""}`,
      });
    } catch {
      setBridgeCheckMessage({
        type: "error",
        text: "Bridge сервертэй холбогдож чадсангүй. URL, сүлжээ, CORS-г шалгана уу.",
      });
    } finally {
      setCheckingBridge(false);
    }
  };

  /* save */
  const handleSave = async () => {
    if (!form.name.trim() || !form.branchId) {
      setError("Нэр болон салбар сонгоно уу.");
      return;
    }
    if (form.cardEnabled && (!form.cardProviderType || !form.cardTerminalId.trim())) {
      setError("Карт идэвхтэй үед Провайдер болон Terminal ID заавал бөглөнө үү.");
      return;
    }
    if (form.qpayEnabled && (!form.qpayMerchantId.trim() || !form.qpayTerminalId.trim())) {
      setError("QPay идэвхтэй үед Merchant ID болон Terminal ID заавал бөглөнө үү.");
      return;
    }
    if (form.terminalBridgeUrl) {
      try {
        const p = new URL(form.terminalBridgeUrl);
        if (!["http:", "https:"].includes(p.protocol)) throw new Error();
      } catch {
        setError("Bridge URL зөвхөн http:// эсвэл https:// байх ёстой.");
        return;
      }
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        organizationId: selectedOrgId,
        branchId: form.branchId,
        name: form.name.trim(),
        label: form.label.trim() || null,
        cardEnabled: form.cardEnabled,
        cardProviderType: form.cardProviderType || null,
        cardTerminalId: form.cardTerminalId.trim() || null,
        terminalBridgeUrl: form.cardProviderType === "PUSH_ECR" ? null : (form.terminalBridgeUrl.trim() || null),
        qpayEnabled: form.qpayEnabled,
        qpayMerchantId: form.qpayMerchantId.trim() || null,
        qpayTerminalId: form.qpayTerminalId.trim() || null,
      };
      const url = editingId
        ? `${API}/admin/pos-registers/${editingId}`
        : `${API}/admin/pos-registers`;
      const res = await adminFetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.message || "Хадгалахад алдаа гарлаа.");
        return;
      }
      closeForm();
      reload(selectedOrgId);
    } catch {
      setError("Сервертэй холбогдоход алдаа гарлаа.");
    } finally {
      setSaving(false);
    }
  };

  /* toggle active */
  const toggleActive = async (r: PosRegister) => {
    try {
      await adminFetch(`${API}/admin/pos-registers/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !r.isActive }),
      });
      reload(selectedOrgId);
    } catch { /* ignore */ }
  };

  /* delete */
  const handleDelete = async (id: string) => {
    if (!confirm("POS касс устгах уу?")) return;
    setDeletingId(id);
    try {
      await adminFetch(`${API}/admin/pos-registers/${id}`, { method: "DELETE" });
      reload(selectedOrgId);
    } finally {
      setDeletingId(null);
    }
  };

  const togglePosVisibility = async () => {
    if (!selectedOrgId) return;
    const next = !posVisible;
    setSavingPosVisibility(true);
    try {
      const res = await adminFetch(
        `${API}/site-settings/${getPosVisibilityKey(selectedOrgId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: next ? "true" : "false" }),
        },
      );
      if (res.ok) {
        setPosVisible(next);
      } else {
        setError("POS нээх/хаах тохиргоо хадгалахад алдаа гарлаа.");
      }
    } catch {
      setError("POS нээх/хаах тохиргоо хадгалахад алдаа гарлаа.");
    } finally {
      setSavingPosVisibility(false);
    }
  };

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-6">
      {/* header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">POS кассын удирдах</h2>
          <p className="text-sm text-slate-400">
            Байгууллага бүрийн POS кассын тохиргоог энд бүртгэж удирдана.
          </p>
        </div>
        {selectedOrgId && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus size={15} />
            Нэмэх
          </button>
        )}
      </div>

      {/* org selector + POS visibility toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <OrgSearchDropdown
          orgs={orgs}
          value={selectedOrgId}
          onChange={setSelectedOrgId}
          loading={loadingOrgs}
          label="Байгууллага сонгох"
          className="w-80"
        />

        {selectedOrgId && (
          <button
            onClick={togglePosVisibility}
            disabled={loadingPosVisibility || savingPosVisibility}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
              posVisible
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {loadingPosVisibility || savingPosVisibility ? (
              <Loader2 size={14} className="animate-spin" />
            ) : posVisible ? (
              <CheckCircle2 size={14} />
            ) : (
              <XCircle size={14} />
            )}
            POS {posVisible ? "НЭЭЛТТЭЙ" : "ХААЛТТАЙ"}
          </button>
        )}
      </div>

      {/* error banner */}
      {error && !formOpen && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* registers list */}
      {selectedOrgId && (
        <>
          {loadingRegs ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
              <Loader2 size={15} className="animate-spin" /> Ачаалж байна...
            </div>
          ) : registers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center">
              <Monitor size={32} className="text-slate-300" />
              <p className="text-sm font-medium text-slate-400">Бүртгэгдээгүй байна</p>
              <button
                onClick={openAdd}
                className="mt-1 inline-flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
              >
                <Plus size={14} /> Нэмэх
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {registers.map((r) => (
                <div
                  key={r.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    r.isActive
                      ? "border-slate-200 bg-white"
                      : "border-slate-100 bg-slate-50 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                        <Monitor size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm">{r.name}</span>
                          {r.label && (
                            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                              {r.label}
                            </span>
                          )}
                          <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                            {r.branch.name}
                          </span>
                          {r.activationStatus === "PENDING" && (
                            <span className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              Хүлээлтэд
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {r.cardEnabled ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              <CreditCard size={11} /> Card{r.cardProviderType ? ` · ${r.cardProviderType}` : ""}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
                              <CreditCard size={11} /> Card идэвхгүй
                            </span>
                          )}
                          {r.qpayEnabled ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                              <QrCode size={11} /> QPay{r.qpayMerchantId ? ` · ${r.qpayMerchantId}` : ""}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
                              <QrCode size={11} /> QPay идэвхгүй
                            </span>
                          )}
                          {r.terminalBridgeUrl && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 max-w-[180px] truncate">
                              Bridge: {r.terminalBridgeUrl}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] font-mono text-slate-300 truncate">{r.id}</p>
                      </div>
                    </div>

                    {/* actions */}
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => toggleActive(r)}
                        title={r.isActive ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                        className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                          r.isActive
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {r.isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {r.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                      </button>
                      <button
                        onClick={() => openEdit(r)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        {deletingId === r.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* form overlay */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
            {/* form header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-bold text-slate-800">
                {editingId ? "POS засах" : "POS нэмэх"}
              </h3>
              <button onClick={closeForm} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4 px-6 py-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* name + label */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Нэр *">
                  <input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Касс 1"
                    className={INPUT}
                  />
                </Field>
                <Field label="Шошго">
                  <input
                    value={form.label}
                    onChange={(e) => set("label", e.target.value)}
                    placeholder="Main counter"
                    className={INPUT}
                  />
                </Field>
              </div>

              {/* branch */}
              <Field label="Салбар *">
                <div className="relative">
                  <select
                    value={form.branchId}
                    onChange={(e) => set("branchId", e.target.value)}
                    className={SELECT}
                    disabled={branches.length === 0}
                  >
                    <option value="">— Салбар сонгох —</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                {branches.length === 0 && !quickBranchOpen && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <p className="text-xs text-amber-600">Салбар бүртгэгдээгүй байна.</p>
                    <button
                      type="button"
                      onClick={() => { setQuickBranchOpen(true); setQuickBranchError(""); }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <Plus size={12} /> Салбар нэмэх
                    </button>
                  </div>
                )}
                {quickBranchOpen && (
                  <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-indigo-700">Шинэ салбар нэмэх</p>
                    {quickBranchError && (
                      <p className="text-xs text-red-600">{quickBranchError}</p>
                    )}
                    <input
                      value={quickBranchName}
                      onChange={(e) => setQuickBranchName(e.target.value)}
                      placeholder="Салбарын нэр *"
                      className={INPUT}
                    />
                    <input
                      value={quickBranchAddress}
                      onChange={(e) => setQuickBranchAddress(e.target.value)}
                      placeholder="Хаяг *"
                      className={INPUT}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setQuickBranchOpen(false); setQuickBranchError(""); }}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Болих
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickAddBranch}
                        disabled={quickBranchSaving}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {quickBranchSaving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                        Нэмэх
                      </button>
                    </div>
                  </div>
                )}
              </Field>

              {/* card section */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={toggleCardEnabled}
                    className={`relative h-5 w-9 rounded-full transition-colors ${form.cardEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.cardEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <CreditCard size={14} /> Картын терминал идэвхжүүлэх
                  </span>
                </label>
                {form.cardEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Провайдер">
                      <div className="relative">
                        <select
                          value={form.cardProviderType}
                          onChange={(e) => {
                            set("cardProviderType", e.target.value);
                            if (e.target.value === "PUSH_ECR") {
                              set("terminalBridgeUrl", "");
                              setBridgeCheckMessage(null);
                            }
                          }}
                          className={SELECT}
                        >
                          <option value="">— сонгох —</option>
                          {CARD_PROVIDERS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </Field>
                    <Field label="Terminal ID / Serial">
                      <input
                        value={form.cardTerminalId}
                        onChange={(e) => set("cardTerminalId", e.target.value)}
                        placeholder="SN1234"
                        className={INPUT}
                      />
                    </Field>
                    {form.cardProviderType !== "PUSH_ECR" && <Field label="Bridge URL" className="col-span-2">
                      <input
                        value={form.terminalBridgeUrl}
                        onChange={(e) => {
                          set("terminalBridgeUrl", e.target.value);
                          setBridgeCheckMessage(null);
                        }}
                        placeholder="http://localhost:7420"
                        className={INPUT}
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={checkBridgeHealth}
                          disabled={checkingBridge || !form.terminalBridgeUrl.trim()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {checkingBridge ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}
                          Bridge шалгах
                        </button>

                        {bridgeCheckMessage && (
                          <span
                            className={`text-xs font-medium ${
                              bridgeCheckMessage.type === "success"
                                ? "text-emerald-700"
                                : "text-rose-700"
                            }`}
                          >
                            {bridgeCheckMessage.text}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Касс дахь локал bridge server хаяг (хоосон бол mock simulation хэрэглэнэ)
                      </p>
                    </Field>}
                  </div>
                )}
              </div>

              {/* QPay section */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={toggleQpayEnabled}
                    className={`relative h-5 w-9 rounded-full transition-colors ${form.qpayEnabled ? "bg-sky-500" : "bg-slate-300"}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.qpayEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <QrCode size={14} /> QPay идэвхжүүлэх
                  </span>
                </label>
                {form.qpayEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Merchant ID">
                      <input
                        value={form.qpayMerchantId}
                        onChange={(e) => set("qpayMerchantId", e.target.value)}
                        placeholder="MERCH_001"
                        className={INPUT}
                      />
                    </Field>
                    <Field label="QPay Terminal ID">
                      <input
                        value={form.qpayTerminalId}
                        onChange={(e) => set("qpayTerminalId", e.target.value)}
                        placeholder="TRM_001"
                        className={INPUT}
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>

            {/* form footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={closeForm}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Цуцлах
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Хадгалах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── tiny helpers ───────────────────────────────────────────────────── */
const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-300";
const SELECT =
  "w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      {children}
    </div>
  );
}
