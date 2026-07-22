"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  CheckCircle2,
  PenTool,
  Eraser,
  Loader2,
  History,
  Edit,
  Check,
  Link as LinkIcon,
  Eye,
  Plus,
  Download,
  Upload,
  ToggleLeft,
  ToggleRight,
  Users,
  ClipboardList,
  XCircle,
  FileText,
  Building,
  Phone,
  Mail,
  Globe,
  X,
  Trash2,
} from "lucide-react";
import { adminFetch, API } from "@/lib/api";
import {
  ACTIVE_MEMBERSHIP_HEADER,
  DEFAULT_ACTIVE_MEMBERSHIP_CONTRACT_HTML,
  DEFAULT_FEE_PLANS,
} from "./contract-defaults";
import {
  OrgInfoEditor,
  DEFAULT_ORG_CONTACT,
  type OrgContactInfo,
} from "./OrgInfoFields";
import {
  CONTRACT_PAYMENT_ACCOUNTS_KEY,
  ContractPaymentAccountSelect,
  DEFAULT_SYSTEMQR_LOCATION,
  parseContractPaymentAccounts,
  toSystemQrConfig,
  type ContractPaymentAccount,
} from "./PaymentAccountPanels";
import {
  DEFAULT_MEMBER_FIELDS,
  SignatureInput,
  useSignatureCanvas,
} from "./SignatureInput";
import { ContractPreviewTab } from "./ContractPreviewTab";
import { ContractDetailModal } from "./ContractDetailModal";
import type { ContractSettings } from "./contract.types";
const getMinuPaymentConfigError = (settings: ContractSettings) => {
  if (!settings?.isPaid) return "";
  if (!settings.systemQr?.enabled)
    return "Төлбөртэй гэрээ тул Minu төлбөрийн дансаа идэвхжүүлж сонгоно уу.";
  if (!settings.systemQr?.merchantCode)
    return "Minu merchantCode сонгогдоогүй байна. Дансны сангаас Minu дансаа сонгоно уу.";
  if (!settings.systemQr?.selectedAccountId)
    return "Minu дансны сангаас энэ гэрээнд ашиглах дансаа сонгоно уу.";
  return "";
};

// ─── Settings mapping helpers ────────────────────────────────────────────────
const emptySystemQr = (prevSystemQr: any = {}) => ({
  ...prevSystemQr,
  enabled: false,
  selectedAccountId: "",
  label: "",
  merchantName: "",
  accountNumber: "",
  bankCode: "050000",
  registerNumber: "",
  phone: "",
  email: "",
  merchantCode: "",
  username: "",
  password: "",
  ...DEFAULT_SYSTEMQR_LOCATION,
  firstName: "",
  lastName: "",
  corporateName: "",
});

const settingsFromContract = (
  contract: any,
  paymentAccounts: ContractPaymentAccount[],
  prev: any,
) => {
  const hd = (contract.headerData || {}) as any;
  const accountBackedSystemQr = hd?.systemQr?.merchantCode
    ? (() => {
        const matchedAccount = paymentAccounts.find(
          (account) =>
            (hd.systemQr.selectedAccountId &&
              account.id === hd.systemQr.selectedAccountId) ||
            account.merchantCode === hd.systemQr.merchantCode,
        );

        return matchedAccount
          ? toSystemQrConfig(matchedAccount, hd.systemQr)
          : emptySystemQr(prev.systemQr);
      })()
    : hd?.systemQr || prev.systemQr;

  return {
    ...prev,
    adminSignature: contract.adminSignature || "",
    adminStamp: contract.adminStamp || null,
    presidentName: contract.adminName || "",
    presidentTitle: contract.adminTitle || "",
    isPaid: contract.isPaid ?? prev.isPaid,
    hasDuration: hd?.hasDuration ?? prev.hasDuration,
    headerTitle: hd?.title || prev.headerTitle,
    headerSubtitle: hd?.subtitle || prev.headerSubtitle,
    headerContractTitle: hd?.contractTitle || prev.headerContractTitle,
    defaultFeePlan:
      hd?.defaultFeePlan || contract.feePlan || prev.defaultFeePlan,
    feePlans:
      Array.isArray(hd?.feePlans) && hd.feePlans.length > 0
        ? hd.feePlans
        : prev.feePlans,
    memberFields:
      Array.isArray(hd?.memberFields) && hd.memberFields.length > 0
        ? hd.memberFields
        : prev.memberFields,
    content: hd?.content || prev.content,
    contentIsHtml: hd?.contentIsHtml ?? prev.contentIsHtml,
    orgContact: hd?.orgContact || prev.orgContact,
    paymentAccounts,
    systemQr: accountBackedSystemQr,
  };
};

// ─── Root component ──────────────────────────────────────────────────────────
export function Contract() {
  const [activeTab, setActiveTab] = useState<"history" | "editor" | "preview">(
    "history",
  );
  const [settings, setSettings] = useState<ContractSettings>({
    adminSignature: "",
    adminStamp: null as string | null,
    presidentName: "",
    presidentTitle: "",
    orgName: "",
    headerTitle: ACTIVE_MEMBERSHIP_HEADER.title,
    headerSubtitle: ACTIVE_MEMBERSHIP_HEADER.subtitle,
    headerContractTitle: ACTIVE_MEMBERSHIP_HEADER.contractTitle,
    content: DEFAULT_ACTIVE_MEMBERSHIP_CONTRACT_HTML,
    contentIsHtml: true,
    isPaid: true,
    hasDuration: true,
    defaultFeePlan: DEFAULT_FEE_PLANS[0]?.key || "",
    feePlans: DEFAULT_FEE_PLANS as {
      key: string;
      label: string;
      sublabel: string;
      price: number;
    }[],
    memberFields: DEFAULT_MEMBER_FIELDS,
    orgContact: { ...DEFAULT_ORG_CONTACT } as OrgContactInfo,
    paymentAccounts: [] as ContractPaymentAccount[],
    systemQr: {
      enabled: false,
      selectedAccountId: "",
      username: "",
      password: "",
      merchantCode: "",
      merchantName: "",
      accountNumber: "",
      accountName: "",
      bankCode: "050000",
      registerNumber: "",
      phone: "",
      email: "",
      ...DEFAULT_SYSTEMQR_LOCATION,
      firstName: "",
      lastName: "",
      corporateName: "",
    },
  });
  const [contracts, setContracts] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, signed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [editingContractId, setEditingContractId] = useState<string | null>(
    null,
  );
  const [loadingEditorId, setLoadingEditorId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      adminFetch(`${API}/contracts`).then((r) => r.json()),
      adminFetch(`${API}/contracts/stats`).then((r) => r.json()),
      adminFetch(`${API}/site-settings/admin`).then((r) =>
        r.ok ? r.json() : {},
      ),
    ])
      .then(([cd, sd, siteSettings]) => {
        const siteSettingMap = siteSettings as Record<string, string>;
        const storedPaymentAccounts = parseContractPaymentAccounts(
          siteSettingMap?.[CONTRACT_PAYMENT_ACCOUNTS_KEY],
        );
        if (cd.success) {
          setContracts(cd.contracts);

          // Load settings from the most recent template
          if (cd.contracts.length > 0) {
            const latestTemplateId = cd.contracts[0]?.id;
            if (latestTemplateId) {
              adminFetch(`${API}/contracts/${latestTemplateId}`)
                .then((r) => r.json())
                .then((detail) => {
                  if (detail.success && detail.contract) {
                    const c = detail.contract;
                    setSettings((prev) =>
                      settingsFromContract(c, storedPaymentAccounts, prev),
                    );
                  }
                })
                .catch(() => {});
            }
          }
        }
        if (storedPaymentAccounts.length > 0) {
          setSettings((prev) => ({
            ...prev,
            paymentAccounts: storedPaymentAccounts,
          }));
        }
        if (sd.success)
          setStats({ total: sd.total, signed: sd.signed, pending: sd.pending });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleEditContract = async (contractId: string) => {
    setLoadingEditorId(contractId);
    try {
      const res = await adminFetch(`${API}/contracts/${contractId}`);
      const data = await res.json();

      if (!data.success || !data.contract) {
        alert(data.error || "Гэрээний тохиргоо ачаалахад алдаа гарлаа");
        return;
      }

      setSettings((prev) =>
        settingsFromContract(data.contract, prev.paymentAccounts || [], prev),
      );
      setEditingContractId(contractId);
      setActiveTab("editor");
    } catch {
      alert("Гэрээний тохиргоо ачаалахад алдаа гарлаа");
    } finally {
      setLoadingEditorId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Цахим гэрээний удирдлага
          </h1>
          <p className="text-neutral-500 mt-1">
            Гэрээ үүсгэх, илгээх линк авах, загвар өөрчлөх.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Нийт гэрээ",
            value: stats.total,
            icon: ClipboardList,
            color: "text-blue-600 bg-blue-50",
          },
          {
            label: "Баталгаажсан",
            value: stats.signed,
            icon: CheckCircle2,
            color: "text-green-600 bg-green-50",
          },
          {
            label: "Хүлээгдэж буй",
            value: stats.pending,
            icon: Users,
            color: "text-amber-600 bg-amber-50",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-neutral-200 rounded-2xl p-5 flex items-center gap-4"
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}
            >
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-900">
                {s.value}
              </div>
              <div className="text-sm text-neutral-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 bg-neutral-100 p-1.5 rounded-xl w-max">
        {(
          [
            ["history", History, "Илгээсэн гэрээнүүд"],
            ["editor", Edit, "Гэрээний загвар засах"],
            ["preview", Eye, "Урьдчилан харах"],
          ] as const
        ).map(([tab, Icon, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? "bg-white text-blue-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {activeTab === "history" && (
        <ContractHistoryTab
          contracts={contracts}
          setContracts={setContracts}
          loading={loading}
          setStats={setStats}
          settings={settings}
          onEdit={handleEditContract}
          loadingEditorId={loadingEditorId}
        />
      )}
      {activeTab === "editor" && (
        <ContractEditorTab
          settings={settings}
          setSettings={setSettings}
          setContracts={setContracts}
          setActiveTab={setActiveTab}
          setStats={setStats}
          editingContractId={editingContractId}
          setEditingContractId={setEditingContractId}
        />
      )}
      {activeTab === "preview" && <ContractPreviewTab settings={settings} />}
    </div>
  );
}

// ─── Contract Detail Modal ────────────────────────────────────────────────────
// Detail drawer is isolated to keep contract orchestration focused on state and tab routing.
function ContractHistoryTab({
  contracts,
  setContracts,
  loading,
  setStats,
  settings,
  onEdit,
  loadingEditorId,
}: {
  contracts: any[];
  setContracts: React.Dispatch<React.SetStateAction<any[]>>;
  loading: boolean;
  setStats: React.Dispatch<React.SetStateAction<any>>;
  settings: ContractSettings;
  onEdit: (contractId: string) => void;
  loadingEditorId: string | null;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Энэ гэрээг устгах уу? Бүх submissions мөн устана.")) return;
    setDeletingId(id);
    try {
      const res = await adminFetch(`${API}/contracts/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setContracts((prev) => prev.filter((c) => c.id !== id));
        setStats((s: any) => ({ ...s, total: Math.max(0, s.total - 1) }));
      } else {
        alert(data.error || "Устгахад алдаа гарлаа");
      }
    } catch {
      alert("Устгахад алдаа гарлаа");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = (id: string) => {
    const base = process.env.NEXT_PUBLIC_WEB_URL || "https://mglstore.mn";
    navigator.clipboard.writeText(`${base}/contract/sign/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadPdf = (c: any) => {
    if (c.pdfUrl) {
      window.open(c.pdfUrl, "_blank");
    } else {
      const base = process.env.NEXT_PUBLIC_WEB_URL || "https://mglstore.mn";
      window.open(`${base}/contract/sign/${c.id}?print=1`, "_blank");
    }
  };

  const feePlanLabel = (c: any) => c.feePlanLabel || c.feePlan || "—";

  return (
    <>
      {detailId && (
        <ContractDetailModal
          contractId={detailId}
          onClose={() => setDetailId(null)}
          settings={settings}
        />
      )}

      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-neutral-200 flex justify-between items-center bg-neutral-50/50">
          <h3 className="font-bold text-lg text-neutral-800">
            Бүртгэлтэй гэрээнүүд
          </h3>
          <NewContractButton
            settings={settings}
            setContracts={setContracts}
            setStats={setStats}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Байгууллага</th>
                <th className="px-6 py-4 font-semibold">Төлөв</th>
                <th className="px-6 py-4 font-semibold">Хураамж</th>
                <th className="px-6 py-4 font-semibold">Үүсгэсэн хүн</th>
                <th className="px-6 py-4 font-semibold">Огноо</th>
                <th className="px-6 py-4 font-semibold text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-neutral-400" />
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-neutral-500"
                  >
                    Одоогоор илгээсэн гэрээ байхгүй байна.
                  </td>
                </tr>
              ) : (
                contracts.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-neutral-50 transition-colors cursor-pointer"
                    onClick={() => setDetailId(c.id)}
                  >
                    <td className="px-6 py-4 font-medium text-neutral-900 max-w-[180px] truncate">
                      {c.org}
                    </td>
                    <td className="px-6 py-4">
                      {c.status === "PENDING" && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                          Хүлээгдэж буй
                        </span>
                      )}
                      {c.status === "SIGNED" && (
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          Баталгаажсан
                        </span>
                      )}
                      {c.status === "TAMPERED" && (
                        <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                          Алдаатай
                        </span>
                      )}
                      {c.isPaid && (
                        <span className="ml-1.5 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          Төлбөртэй
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {feePlanLabel(c)}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {c.createdBy}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500">
                      {c.date}
                    </td>
                    <td
                      className="px-6 py-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setDetailId(c.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" /> Дэлгэрэнгүй
                        </button>
                        <button
                          onClick={() => onEdit(c.id)}
                          disabled={loadingEditorId === c.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-40 transition-colors"
                        >
                          {loadingEditorId === c.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Edit className="w-4 h-4" />
                          )}
                          Засах
                        </button>
                        {c.status === "SIGNED" && (
                          <button
                            onClick={() => handleDownloadPdf(c)}
                            title="PDF татах"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-green-200 rounded-lg text-sm text-green-700 hover:bg-green-50 transition-colors"
                          >
                            <Download className="w-4 h-4" /> PDF
                          </button>
                        )}
                        {c.status === "PENDING" && (
                          <button
                            onClick={() => handleCopy(c.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 transition-colors"
                          >
                            {copiedId === c.id ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <LinkIcon className="w-4 h-4" />
                            )}
                            {copiedId === c.id ? (
                              <span className="text-green-600 font-medium">
                                Хуулсан
                              </span>
                            ) : (
                              "Link"
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                        >
                          {deletingId === c.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── New contract button with signature modal ─────────────────────────────────
function NewContractButton({
  settings,
  setContracts,
  setStats,
}: {
  settings: ContractSettings;
  setContracts: React.Dispatch<React.SetStateAction<any[]>>;
  setStats: React.Dispatch<React.SetStateAction<any>>;
}) {
  const [open, setOpen] = useState(false);
  const [feePlan, setFeePlan] = useState(
    settings.defaultFeePlan || settings.feePlans?.[0]?.key || "6m",
  );
  const [creating, setCreating] = useState(false);
  const [adminSignature, setAdminSignature] = useState("");

  useEffect(() => {
    setFeePlan(settings.defaultFeePlan || settings.feePlans?.[0]?.key || "6m");
  }, [settings.defaultFeePlan, settings.feePlans]);

  const handleCreate = async () => {
    if (!adminSignature) {
      alert("Гарын үсэг оруулна уу");
      return;
    }

    const paymentConfigError = getMinuPaymentConfigError(settings);
    if (paymentConfigError) {
      alert(paymentConfigError);
      return;
    }

    setCreating(true);

    try {
      const selectedPlan =
        settings.hasDuration || settings.isPaid
          ? settings.isPaid
            ? feePlan
            : settings.defaultFeePlan
          : null;

      const res = await adminFetch(`${API}/contracts`, {
        method: "POST",
        body: JSON.stringify({
          feePlan: selectedPlan,
          isPaid: settings.isPaid,
          adminSignature,
          adminName: settings.presidentName,
          adminTitle: settings.presidentTitle,
          headerData: {
            title: settings.headerTitle || null,
            subtitle: settings.headerSubtitle || null,
            contractTitle: settings.headerContractTitle || null,
            hasDuration: settings.hasDuration,
            feePlans: settings.feePlans,
            defaultFeePlan: settings.defaultFeePlan,
            memberFields: settings.memberFields,
            content: settings.content || null,
            contentIsHtml: settings.contentIsHtml || false,
            orgContact: settings.orgContact,
            systemQr: settings.systemQr,
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        setContracts((prev) => [data.contract, ...prev]);
        setStats((s: any) => ({
          ...s,
          total: s.total + 1,
          pending: s.pending + 1,
        }));
        setOpen(false);
        setAdminSignature("");
      } else {
        alert(data.error || "Алдаа гарлаа");
      }
    } catch {
      alert("Гэрээ үүсгэхэд алдаа гарлаа");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
      >
        <Plus className="w-4 h-4" />
        Шинэ гэрээ үүсгэх
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-neutral-900">
                Шинэ гэрээ үүсгэх
              </h3>

              <button
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {(settings.hasDuration || settings.isPaid) && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {settings.hasDuration
                    ? "Гэрээний хугацаа"
                    : "Төлбөрийн сонголт"}
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {settings.feePlans.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setFeePlan(p.key)}
                      className={`flex flex-col items-center p-4 border-2 rounded-xl text-sm transition-colors ${
                        feePlan === p.key
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <span className="font-bold text-base">
                        {p.label ||
                          (settings.hasDuration ? "Нэргүй хугацаа" : "Сонголт")}
                      </span>

                      <span className="text-xs text-neutral-500">
                        {p.sublabel || "Тайлбаргүй"}
                      </span>

                      {settings.isPaid && (
                        <span className="font-semibold mt-1">
                          {Number(p.price || 0).toLocaleString()}₮
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <SignatureInput
              label="Гарын үсэг"
              required
              onReady={setAdminSignature}
              onClear={() => setAdminSignature("")}
            />

            <button
              onClick={handleCreate}
              disabled={creating || !adminSignature}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Үүсгэж байна...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Гэрээ үүсгэх
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Editor tab ───────────────────────────────────────────────────────────────
function ContractEditorTab({
  settings,
  setSettings,
  setContracts,
  setActiveTab,
  setStats,
  editingContractId,
  setEditingContractId,
}: {
  settings: ContractSettings;
  setSettings: React.Dispatch<React.SetStateAction<ContractSettings>>;
  setContracts: React.Dispatch<React.SetStateAction<any[]>>;
  setActiveTab: React.Dispatch<
    React.SetStateAction<"history" | "editor" | "preview">
  >;
  setStats: React.Dispatch<React.SetStateAction<any>>;
  editingContractId: string | null;
  setEditingContractId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const [saving, setSaving] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [adminStamp, setAdminStamp] = useState<string | null>(null);
  const [adminSignature, setAdminSignature] = useState("");
  const [editorTab, setEditorTab] = useState<
    "general" | "header" | "fields" | "payment" | "content" | "signature"
  >("general");
  const fileRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAdminSignature(settings.adminSignature || "");
    setAdminStamp(settings.adminStamp || null);
  }, [editingContractId, settings.adminSignature, settings.adminStamp]);

  const updateFeePlan = (
    index: number,
    field: "label" | "sublabel" | "price",
    value: string,
  ) => {
    setSettings((prev) => {
      const nextPlans = [...prev.feePlans];

      nextPlans[index] = {
        ...nextPlans[index],
        [field]: field === "price" ? Number(value.replace(/\D/g, "")) : value,
      };

      return {
        ...prev,
        feePlans: nextPlans,
        defaultFeePlan: prev.defaultFeePlan || nextPlans[0]?.key || "",
      };
    });
  };

  const addFeePlan = () => {
    setSettings((prev) => {
      const newKey = `plan_${Date.now()}`;

      return {
        ...prev,
        feePlans: [
          ...prev.feePlans,
          {
            key: newKey,
            label: "",
            sublabel: "",
            price: 0,
          },
        ],
        defaultFeePlan: prev.defaultFeePlan || newKey,
      };
    });
  };

  const removeFeePlan = (index: number) => {
    setSettings((prev) => {
      const removedKey = prev.feePlans[index]?.key;
      const nextPlans = prev.feePlans.filter((_, i) => i !== index);

      return {
        ...prev,
        feePlans: nextPlans,
        defaultFeePlan:
          prev.defaultFeePlan === removedKey
            ? nextPlans[0]?.key || ""
            : prev.defaultFeePlan,
      };
    });
  };

  const selectPaymentAccount = (accountId: string) => {
    const account = (settings.paymentAccounts || []).find(
      (item: ContractPaymentAccount) => item.id === accountId,
    );
    if (!account) {
      setSettings((prev) => ({
        ...prev,
        systemQr: {
          ...prev.systemQr,
          selectedAccountId: "",
        },
      }));
      return;
    }

    setSettings((prev) => ({
      ...prev,
      systemQr: toSystemQrConfig(account, prev.systemQr),
    }));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      if (file.name.endsWith(".txt")) {
        const text = await file.text();
        setSettings((prev) => ({
          ...prev,
          content: text,
          contentIsHtml: false,
        }));
      } else if (file.name.endsWith(".docx")) {
        const buf = await file.arrayBuffer();
        const mammoth = (await import(
          "mammoth/mammoth.browser.js" as any
        )) as any;
        const result = await mammoth.convertToHtml(
          { arrayBuffer: buf },
          {
            styleMap: [
              "p[style-name='Heading 1'] => h2:fresh",
              "p[style-name='Heading 2'] => h3:fresh",
              "b => strong",
              "i => em",
            ],
          },
        );
        setSettings((prev) => ({
          ...prev,
          content: result.value,
          contentIsHtml: true,
        }));
      } else {
        alert(".txt эсвэл .docx файл сонгоно уу");
      }
    } catch (err) {
      console.error("import error", err);
      alert("Файл уншихад алдаа гарлаа. .txt эсвэл .docx файл сонгоно уу.");
    } finally {
      setImportLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const applyActiveMembershipContract = () => {
    setSettings((prev) => ({
      ...prev,
      headerTitle: ACTIVE_MEMBERSHIP_HEADER.title,
      headerSubtitle: ACTIVE_MEMBERSHIP_HEADER.subtitle,
      headerContractTitle: ACTIVE_MEMBERSHIP_HEADER.contractTitle,
      content: DEFAULT_ACTIVE_MEMBERSHIP_CONTRACT_HTML,
      contentIsHtml: true,
      isPaid: true,
      hasDuration: true,
      defaultFeePlan: DEFAULT_FEE_PLANS[0]?.key || "",
      feePlans: DEFAULT_FEE_PLANS,
    }));
  };

  const handleSave = async () => {
    if (!adminSignature) {
      alert("Гэрээ байгуулагчийн гарын үсэг оруулна уу");
      return;
    }

    const paymentConfigError = getMinuPaymentConfigError(settings);
    if (paymentConfigError) {
      alert(paymentConfigError);
      return;
    }

    setSaving(true);

    try {
      const selectedPlan =
        settings.hasDuration || settings.isPaid
          ? settings.defaultFeePlan
          : null;

      const payload = {
        feePlan: selectedPlan,
        isPaid: settings.isPaid,
        adminSignature,
        adminName: settings.presidentName || null,
        adminTitle: settings.presidentTitle || null,
        adminStamp: adminStamp || null,
        headerData: {
          title: settings.headerTitle || null,
          subtitle: settings.headerSubtitle || null,
          contractTitle: settings.headerContractTitle || null,
          hasDuration: settings.hasDuration,
          feePlans: settings.feePlans,
          defaultFeePlan: settings.defaultFeePlan,
          memberFields: settings.memberFields,
          content: settings.content || null,
          contentIsHtml: settings.contentIsHtml || false,
          orgContact: settings.orgContact,
          paymentAccounts: settings.paymentAccounts,
          systemQr: settings.systemQr,
        },
      };
      const res = await adminFetch(
        editingContractId
          ? `${API}/contracts/${editingContractId}`
          : `${API}/contracts`,
        {
          method: editingContractId ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );

      const data = await res.json();

      if (data.success) {
        if (editingContractId) {
          setContracts((prev) =>
            prev.map((contract) =>
              contract.id === editingContractId
                ? { ...contract, ...data.contract }
                : contract,
            ),
          );
          setEditingContractId(null);
        } else {
          setContracts((prev) => [data.contract, ...prev]);
          setStats((s: any) => ({
            ...s,
            total: s.total + 1,
            pending: s.pending + 1,
          }));
        }

        alert(
          editingContractId
            ? "Гэрээний тохиргоо шинэчлэгдлээ!"
            : "Гэрээний тохиргоо хадгалагдаж, шинэ линк үүслээ!",
        );
        setActiveTab("history");
      } else {
        alert(data.error || "Алдаа гарлаа");
      }
    } catch {
      alert("Алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm flex flex-col">
      <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
        <h3 className="font-bold text-neutral-800 flex items-center gap-2">
          <Edit className="w-5 h-5 text-blue-600" />
          {editingContractId
            ? "Гэрээний тохиргоо засах"
            : "Гэрээний тохиргоо & Загвар"}
        </h3>
        <div className="flex items-center gap-2">
          {editingContractId && (
            <button
              type="button"
              onClick={() => setEditingContractId(null)}
              className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-lg text-sm font-medium hover:bg-white transition-colors"
            >
              Засахаас гарах
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Хадгалж байна...
              </>
            ) : editingContractId ? (
              "Өөрчлөлт хадгалах"
            ) : (
              "Хадгалах & Линк үүсгэх"
            )}
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 bg-neutral-100 p-1.5 border-b border-neutral-200 overflow-x-auto">
        {(
          [
            ["general", "⚙️ Ерөнхий"],
            ["header", "📄 Толгой хэсэг"],
            ["fields", "📋 Гишүүний мэдээлэл"],
            ["payment", "💳 Төлбөр & Хугацаа"],
            ["content", "📝 Гэрээний агуулга"],
            ["signature", "✍️ Гарын үсэг"],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setEditorTab(tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              editorTab === tab
                ? "bg-white text-blue-700 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900 bg-transparent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {editorTab === "general" && (
        <div className="p-6 border-b border-neutral-100 grid grid-cols-1 md:grid-cols-3 gap-6 bg-neutral-50/30">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Овог нэр
            </label>
            <input
              type="text"
              value={settings.presidentName}
              onChange={(e) =>
                setSettings({ ...settings, presidentName: e.target.value })
              }
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Албан тушаал
            </label>
            <input
              type="text"
              value={settings.presidentTitle}
              onChange={(e) =>
                setSettings({ ...settings, presidentTitle: e.target.value })
              }
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Байгууллагын нэр
            </label>
            <input
              type="text"
              value={settings.orgName}
              onChange={(e) =>
                setSettings({ ...settings, orgName: e.target.value })
              }
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Header Tab */}
      {editorTab === "header" && (
        <div className="p-6 border-b border-neutral-100 bg-neutral-50/20">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-4">
            Гэрээний толгой хэсэг
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Байгууллагын нэр (толгой)
              </label>
              <textarea
                rows={2}
                value={settings.headerTitle}
                onChange={(e) =>
                  setSettings({ ...settings, headerTitle: e.target.value })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Дэд гарчиг (англи)
              </label>
              <input
                type="text"
                value={settings.headerSubtitle}
                onChange={(e) =>
                  setSettings({ ...settings, headerSubtitle: e.target.value })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Гэрээний нэр
              </label>
              <input
                type="text"
                value={settings.headerContractTitle}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    headerContractTitle: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 1.1 Холбооны мэдээлэл — editable org contact info */}
          <div className="mt-6 p-4 bg-white border border-[#b4c6e7] rounded-xl">
            <OrgInfoEditor
              value={settings.orgContact}
              onChange={(v) => setSettings({ ...settings, orgContact: v })}
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Холбооны тамга (зураг)
            </label>
            <input
              ref={stampRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) =>
                  setAdminStamp(ev.target?.result as string);
                reader.readAsDataURL(file);
              }}
            />
            <div
              onClick={() => stampRef.current?.click()}
              className="w-full border-2 border-dashed border-neutral-300 rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
            >
              {adminStamp ? (
                <>
                  <img
                    src={adminStamp}
                    alt="Тамга"
                    className="h-16 max-w-[160px] object-contain mix-blend-multiply"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-neutral-700">
                      Тамга upload хийгдсэн
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAdminStamp(null);
                      }}
                      className="text-xs text-red-400 hover:text-red-500 mt-1"
                    >
                      Хасах
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-neutral-400">
                  Тамганы зураг энд дарна upload хийх (PNG / JPG)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fields Tab */}
      {editorTab === "fields" && (
        <div className="p-6 border-b border-neutral-100 bg-neutral-50/20">
          <div className="font-medium text-neutral-800 mb-4">
            Гишүүний мэдээллийн талбарууд (Хүснэгт)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {settings.memberFields.map((field, idx) => (
              <div
                key={field.key}
                className="flex items-center gap-3 bg-white p-3 border border-neutral-200 rounded-xl shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSettings((prev) => ({
                      ...prev,
                      memberFields: prev.memberFields.map((f, i) =>
                        i === idx ? { ...f, enabled: !f.enabled } : f,
                      ),
                    }));
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${field.enabled ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-400"}`}
                >
                  {field.enabled ? (
                    <ToggleRight className="w-5 h-5" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings((prev) => ({
                      ...prev,
                      memberFields: prev.memberFields.map((f, i) =>
                        i === idx ? { ...f, label: val } : f,
                      ),
                    }));
                  }}
                  disabled={!field.enabled}
                  className="flex-1 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:blue-500 disabled:opacity-50 disabled:bg-neutral-50"
                />
                <label
                  className={`flex items-center gap-2 text-sm font-medium ${field.enabled ? "text-neutral-700" : "text-neutral-400"}`}
                >
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSettings((prev) => ({
                        ...prev,
                        memberFields: prev.memberFields.map((f, i) =>
                          i === idx ? { ...f, required: checked } : f,
                        ),
                      }));
                    }}
                    disabled={!field.enabled}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  Заавал
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment & Duration Tab */}
      {editorTab === "payment" && (
        <div className="p-6 border-b border-neutral-100 bg-neutral-50/20">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-neutral-800">
                Хураамж & Хугацааны тохиргоо
              </div>
              <div className="text-sm text-neutral-500 mt-0.5">
                Гэрээнд төлбөр болон хугацааг тохируулна
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    hasDuration: !settings.hasDuration,
                  })
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                  settings.hasDuration
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-neutral-200 text-neutral-400"
                }`}
              >
                {settings.hasDuration ? (
                  <ToggleRight className="w-5 h-5" />
                ) : (
                  <ToggleLeft className="w-5 h-5" />
                )}
                Хугацаа
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    isPaid: !settings.isPaid,
                  })
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                  settings.isPaid
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-neutral-200 text-neutral-600"
                }`}
              >
                {settings.isPaid ? (
                  <ToggleRight className="w-5 h-5" />
                ) : (
                  <ToggleLeft className="w-5 h-5" />
                )}
                {settings.isPaid ? "Төлбөртэй" : "Төлбөргүй"}
              </button>
            </div>
          </div>

          {(settings.hasDuration || settings.isPaid) && (
            <div className="mt-1 p-4 bg-white border border-emerald-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                  <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    {settings.hasDuration
                      ? "Гэрээний хугацаа"
                      : "Төлбөрийн сонголт"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={addFeePlan}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {settings.hasDuration ? "Хугацаа нэмэх" : "Сонголт нэмэх"}
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {settings.feePlans.map((plan, index) => (
                  <div
                    key={plan.key}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-xl"
                  >
                    <div className="md:col-span-3 flex flex-col gap-1">
                      <label className="text-xs font-medium text-neutral-500 pl-1">
                        {settings.hasDuration ? "Хугацаа" : "Сонголтын нэр"}
                      </label>
                      <input
                        type="text"
                        value={plan.label ?? ""}
                        onChange={(e) =>
                          updateFeePlan(index, "label", e.target.value)
                        }
                        placeholder="жш: 6 сар"
                        className="px-3 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 bg-white transition-colors placeholder:text-neutral-300"
                      />
                    </div>

                    <div className="md:col-span-3 flex flex-col gap-1">
                      <label className="text-xs font-medium text-neutral-500 pl-1">
                        Тайлбар
                      </label>
                      <input
                        type="text"
                        value={plan.sublabel ?? ""}
                        onChange={(e) =>
                          updateFeePlan(index, "sublabel", e.target.value)
                        }
                        placeholder="жш: Хагас жил"
                        className="px-3 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 bg-white transition-colors placeholder:text-neutral-300"
                      />
                    </div>

                    <div className="md:col-span-3 flex flex-col gap-1">
                      <label className="text-xs font-medium text-neutral-500 pl-1">
                        Үнэ
                      </label>
                      <input
                        type="text"
                        value={
                          plan.price ? Number(plan.price).toLocaleString() : ""
                        }
                        onChange={(e) =>
                          updateFeePlan(index, "price", e.target.value)
                        }
                        placeholder="жш: 1800000"
                        className="px-3 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 bg-white transition-colors placeholder:text-neutral-300"
                      />
                    </div>

                    <div className="md:col-span-3 flex items-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            defaultFeePlan: plan.key,
                          }))
                        }
                        className={`flex-1 px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
                          settings.defaultFeePlan === plan.key
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50"
                        }`}
                      >
                        {settings.defaultFeePlan === plan.key
                          ? "Үндсэн"
                          : "Үндсэн болгох"}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeFeePlan(index)}
                        disabled={settings.feePlans.length <= 1}
                        className="px-3 py-2.5 border border-red-200 text-red-500 bg-white rounded-lg text-sm hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Dropdown дээр сонгогдох үндсэн{" "}
                  {settings.hasDuration ? "хугацаа" : "сонголт"}
                </label>

                <select
                  value={settings.defaultFeePlan}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings((prev) => ({
                      ...prev,
                      defaultFeePlan: val,
                    }));
                  }}
                  className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {settings.feePlans.map((plan) => (
                    <option key={plan.key} value={plan.key}>
                      {plan.label || "Нэргүй хугацаа"}
                      {plan.sublabel ? ` — ${plan.sublabel}` : ""}
                      {settings.isPaid && plan.price
                        ? ` — ${Number(plan.price).toLocaleString()}₮`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <ContractPaymentAccountSelect
            settings={settings}
            setSettings={setSettings}
            selectPaymentAccount={selectPaymentAccount}
          />
        </div>
      )}

      {/* Content Tab */}
      {editorTab === "content" && (
        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-neutral-500">
              Доорх текст шинэ гэрээнүүдэд тусгагдана.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={applyActiveMembershipContract}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm shadow-blue-100"
              >
                <FileText className="w-4 h-4" />
                Идэвхтэй гэрээг оруулах
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.docx"
                className="hidden"
                onChange={handleImport}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={importLoading}
                className="flex items-center gap-2 px-3 py-1.5 border border-neutral-300 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
              >
                {importLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Word / TXT импорт
              </button>
            </div>
          </div>
          {settings.contentIsHtml ? (
            <div className="relative">
              <div
                className="w-full p-4 border border-neutral-200 rounded-xl font-serif text-sm leading-relaxed bg-neutral-50 min-h-[400px] contract-html-content overflow-auto
                  [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-neutral-300 [&_td]:p-2 [&_th]:border [&_th]:border-neutral-300 [&_th]:p-2 [&_th]:bg-neutral-100"
                dangerouslySetInnerHTML={{ __html: settings.content }}
              />
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    contentIsHtml: false,
                    content: "",
                  })
                }
                className="absolute top-2 right-2 px-2 py-1 bg-white border border-neutral-200 rounded text-xs text-red-400 hover:text-red-600 shadow-sm"
              >
                Цэвэрлэх
              </button>
            </div>
          ) : (
            <textarea
              value={settings.content}
              onChange={(e) =>
                setSettings({ ...settings, content: e.target.value })
              }
              className="w-full p-4 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-serif text-sm leading-relaxed resize-none bg-neutral-50 min-h-[400px]"
            />
          )}
        </div>
      )}

      {/* Signature Tab */}
      {editorTab === "signature" && (
        <div className="p-6 border-t border-neutral-100">
          {adminSignature && (
            <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                Одоогийн гарын үсэг
              </div>
              <img
                src={adminSignature}
                alt="Гарын үсэг"
                className="h-16 max-w-[240px] object-contain mix-blend-multiply"
              />
            </div>
          )}
          <SignatureInput
            label="Гэрээ байгуулагчийн гарын үсэг"
            required
            onReady={setAdminSignature}
            onClear={() => setAdminSignature("")}
          />
        </div>
      )}
    </div>
  );
}

// ─── Preview tab ──────────────────────────────────────────────────────────────
