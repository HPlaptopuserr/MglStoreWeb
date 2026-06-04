"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  CheckCircle2, PenTool, Eraser, Loader2, History, Edit,
  Check, Link as LinkIcon, Eye, Plus, Download,
  Upload, ToggleLeft, ToggleRight, Users, ClipboardList, XCircle, FileText, Building, Phone, Mail, Globe, X, Trash2
} from "lucide-react";
import { adminFetch, API } from "@/lib/api";
import { DEFAULT_CONTRACT_TEXT, DEFAULT_FEE_PLANS } from "./contract-defaults";
import { OrgInfoEditor, DEFAULT_ORG_CONTACT, type OrgContactInfo } from "./OrgInfoFields";
import {
  CONTRACT_PAYMENT_ACCOUNTS_KEY,
  ContractPaymentAccountSelect,
  DEFAULT_SYSTEMQR_LOCATION,
  PaymentAccountsSettingsPanel,
  parseContractPaymentAccounts,
  toSystemQrConfig,
  type ContractPaymentAccount,
  type SystemQrCategory,
  type SystemQrCity,
  type SystemQrKhoroo,
} from "./PaymentAccountPanels";

const MANUAL_SYSTEMQR_CODE_ERROR =
  'Merchant Code/Sub-merchant code-г гараар хадгалахын өмнө Minu дээр шалгагдсан байх ёстой. Регистр эсвэл дансны дугаар оруулахгүй. Шинээр бүртгэх бол энэ талбарыг хоосон үлдээгээд "Minu данс холбох" дарна уу.';

type PaymentAccountUpsertOptions = {
  trustedMerchantCode?: boolean;
};


// ─── Signature Input: draw or upload PNG ────────────────────────────────────
function SignatureInput({
  label,
  required,
  onReady,
  onClear,
}: {
  label?: string;
  required?: boolean;
  onReady: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fsCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initCtx = (canvas: HTMLCanvasElement | null) => {
    const ctx = canvas?.getContext("2d");
    if (ctx) { ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1e3a5f"; }
    return ctx;
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
  };

  type CanvasRef = React.RefObject<HTMLCanvasElement | null>;

  const onStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, ref: CanvasRef) => {
    e.preventDefault();
    const canvas = ref.current; if (!canvas) return;
    const ctx = initCtx(canvas);
    if (!ctx) return;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(x, y);
    drawing.current = true;
  };

  const onMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, ref: CanvasRef) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y); ctx.stroke();
    setHasDrawing(true);
  };

  const onEnd = (ref: CanvasRef, otherRef: CanvasRef) => {
    drawing.current = false;
    const src = ref.current;
    const dst = otherRef.current;
    if (src && dst) {
      const ctx = dst.getContext("2d");
      if (ctx) { ctx.clearRect(0, 0, dst.width, dst.height); ctx.drawImage(src, 0, 0, dst.width, dst.height); }
    }
    if (ref.current) onReady(ref.current.toDataURL("image/png"));
  };

  const clearDraw = () => {
    [canvasRef, fsCanvasRef].forEach(r => {
      if (r.current) r.current.getContext("2d")?.clearRect(0, 0, r.current.width, r.current.height);
    });
    setHasDrawing(false);
    onClear();
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setUploadedUrl(url);
      onReady(url);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-neutral-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg w-max">
        <button type="button" onClick={() => { setMode("draw"); onClear(); setUploadedUrl(null); }}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${mode === "draw" ? "bg-white text-blue-700 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}>
          <PenTool className="w-3.5 h-3.5" /> Гараар зурах
        </button>
        <button type="button" onClick={() => { setMode("upload"); onClear(); clearDraw(); }}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${mode === "upload" ? "bg-white text-blue-700 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}>
          <Upload className="w-3.5 h-3.5" /> PNG upload
        </button>
      </div>

      {mode === "draw" && (
        <div className="relative">
          <div className="border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50 relative" style={{ height: 140 }}>
            <canvas
              ref={canvasRef} width={800} height={140}
              className="absolute inset-0 w-full h-full touch-none"
              style={{ cursor: "crosshair" }}
              onMouseDown={e => onStart(e, canvasRef)}
              onMouseMove={e => onMove(e, canvasRef)}
              onMouseUp={() => onEnd(canvasRef, fsCanvasRef)}
              onMouseLeave={() => onEnd(canvasRef, fsCanvasRef)}
              onTouchStart={e => onStart(e, canvasRef)}
              onTouchMove={e => onMove(e, canvasRef)}
              onTouchEnd={() => onEnd(canvasRef, fsCanvasRef)}
            />
            {!hasDrawing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-neutral-400 pointer-events-none select-none">
                <PenTool className="w-5 h-5" />
                <span className="text-xs">Энд гарын үсэг зурна уу</span>
              </div>
            )}
            <div className="absolute top-2 right-2 flex gap-1.5">
              {hasDrawing && (
                <button type="button" onClick={clearDraw}
                  className="flex items-center gap-1 px-2 py-1 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-500 hover:text-red-500 shadow-sm">
                  <Eraser className="w-3 h-3" /> Арилгах
                </button>
              )}
              <button type="button" onClick={() => setFullscreen(true)}
                className="flex items-center gap-1 px-2 py-1 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-500 hover:text-blue-600 shadow-sm">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
                Томруулах
              </button>
            </div>
          </div>
          {!hasDrawing && <p className="text-xs text-red-500 mt-1">Гарын үсэг зурахгүйгээр хадгалах боломжгүй</p>}
        </div>
      )}

      {mode === "upload" && (
        <div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} />
          {uploadedUrl ? (
            <div className="border-2 border-neutral-200 rounded-xl bg-neutral-50 p-4 flex items-center gap-4">
              <img src={uploadedUrl} alt="Гарын үсэг" className="h-16 max-w-[200px] object-contain mix-blend-multiply" />
              <button type="button" onClick={() => { setUploadedUrl(null); onClear(); }}
                className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-1">
                Хасах
              </button>
            </div>
          ) : (
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50 h-24 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors gap-2">
              <Upload className="w-6 h-6 text-neutral-400" />
              <span className="text-sm text-neutral-500">PNG / JPG файл сонгох</span>
              <span className="text-xs text-neutral-400">Гарын үсгийн зургийг энд дарж upload хийнэ үү</span>
            </div>
          )}
          {!uploadedUrl && <p className="text-xs text-red-500 mt-1">Гарын үсэг оруулахгүйгээр хадгалах боломжгүй</p>}
        </div>
      )}

      {/* Fullscreen drawing modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-200 bg-neutral-50">
            <span className="font-semibold text-neutral-800">Гарын үсэг зурах</span>
            <div className="flex gap-2">
              {hasDrawing && (
                <button type="button" onClick={clearDraw}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm text-neutral-600 hover:text-red-500">
                  <Eraser className="w-4 h-4" /> Арилгах
                </button>
              )}
              <button type="button" onClick={() => { onEnd(fsCanvasRef, canvasRef); setFullscreen(false); }}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                <Check className="w-4 h-4" /> Хадгалах
              </button>
            </div>
          </div>
          <div className="flex-1 relative bg-neutral-50">
            <canvas
              ref={fsCanvasRef} width={2000} height={800}
              className="absolute inset-0 w-full h-full touch-none"
              style={{ cursor: "crosshair" }}
              onMouseDown={e => onStart(e, fsCanvasRef)}
              onMouseMove={e => onMove(e, fsCanvasRef)}
              onMouseUp={() => {}}
              onMouseLeave={() => {}}
              onTouchStart={e => onStart(e, fsCanvasRef)}
              onTouchMove={e => onMove(e, fsCanvasRef)}
              onTouchEnd={() => {}}
            />
            {!hasDrawing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-300 pointer-events-none select-none">
                <PenTool className="w-16 h-16" />
                <span className="text-xl">Энд гарын үсэг зурна уу</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// legacy hook kept for ContractPreviewTab
function useSignatureCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = ref.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
  };

  const initCtx = () => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) { ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1e3a5f"; }
    return ctx;
  };

  const start = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = initCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath(); ctx.moveTo(x, y);
    drawing.current = true;
  };

  const move = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!drawing.current) return;
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y); ctx.stroke();
    setHasSignature(true);
  };

  const end = () => { drawing.current = false; };

  const clear = () => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const getDataUrl = () => ref.current?.toDataURL("image/png") || "";

  return { ref, start, move, end, clear, hasSignature, getDataUrl };
}

export const DEFAULT_MEMBER_FIELDS = [
  { key: "name", label: "Байгууллагын нэр:", required: true, enabled: true },
  { key: "register", label: "Байгууллагын регистр", required: true, enabled: true },
  { key: "field", label: "Үйл ажиллагааны чиглэл:", required: false, enabled: true },
  { key: "address", label: "Хаяг:", required: false, enabled: true },
  { key: "phone", label: "Утас:", required: true, enabled: true },
  { key: "email", label: "И-мэйл:", required: false, enabled: true },
  { key: "website", label: "Вэбсайт:", required: false, enabled: true },
  { key: "director", label: "Нэр:", required: true, enabled: true },
  { key: "bank", label: "Банк:", required: false, enabled: true },
  { key: "accountNumber", label: "Дансны дугаар:", required: false, enabled: true },
];

// ─── Root component ──────────────────────────────────────────────────────────
export function Contract() {
  const [activeTab, setActiveTab] = useState<"history" | "editor" | "preview">("history");
  const [settings, setSettings] = useState({
    presidentName: "",
    presidentTitle: "",
    orgName: "",
    headerTitle: "",
    headerSubtitle: "",
    headerContractTitle: "",
    content: DEFAULT_CONTRACT_TEXT,
    contentIsHtml: false,
    isPaid: false,
    hasDuration: true,
    defaultFeePlan: "",
    feePlans: DEFAULT_FEE_PLANS as { key: string; label: string; sublabel: string; price: number }[],
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

  useEffect(() => {
    Promise.all([
      adminFetch(`${API}/contracts`).then(r => r.json()),
      adminFetch(`${API}/contracts/stats`).then(r => r.json()),
      adminFetch(`${API}/site-settings/admin`).then(r => r.ok ? r.json() : {}),
    ]).then(([cd, sd, siteSettings]) => {
      const siteSettingMap = siteSettings as Record<string, string>;
      const storedPaymentAccounts = parseContractPaymentAccounts(siteSettingMap?.[CONTRACT_PAYMENT_ACCOUNTS_KEY]);
      if (cd.success) {
        setContracts(cd.contracts);

        // Load settings from the most recent template
        if (cd.contracts.length > 0) {
          const latestTemplateId = cd.contracts[0]?.id;
          if (latestTemplateId) {
            adminFetch(`${API}/contracts/${latestTemplateId}`)
              .then(r => r.json())
              .then(detail => {
                if (detail.success && detail.contract) {
                  const c = detail.contract;
                  const hd = c.headerData as any;
                  setSettings(prev => ({
                    ...prev,
                    presidentName: c.adminName || prev.presidentName,
                    presidentTitle: c.adminTitle || prev.presidentTitle,
                    isPaid: c.isPaid ?? prev.isPaid,
                    hasDuration: hd?.hasDuration ?? prev.hasDuration,
                    headerTitle: hd?.title || prev.headerTitle,
                    headerSubtitle: hd?.subtitle || prev.headerSubtitle,
                    headerContractTitle: hd?.contractTitle || prev.headerContractTitle,
                    defaultFeePlan: hd?.defaultFeePlan || prev.defaultFeePlan,
                    feePlans: (hd?.feePlans?.length > 0 ? hd.feePlans : prev.feePlans),
                    memberFields: (hd?.memberFields?.length > 0 ? hd.memberFields : prev.memberFields),
                    content: hd?.content || prev.content,
                    contentIsHtml: hd?.contentIsHtml ?? prev.contentIsHtml,
                    orgContact: hd?.orgContact || prev.orgContact,
                    paymentAccounts: storedPaymentAccounts,
                    systemQr: hd?.systemQr?.merchantCode
                      ? (() => {
                          const matchedAccount = storedPaymentAccounts.find((account) =>
                            (hd.systemQr.selectedAccountId && account.id === hd.systemQr.selectedAccountId)
                            || account.merchantCode === hd.systemQr.merchantCode
                          );
                          return matchedAccount
                            ? toSystemQrConfig(matchedAccount, hd.systemQr)
                            : {
                                ...prev.systemQr,
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
                              };
                        })()
                      : (hd?.systemQr || prev.systemQr),
                  }));
                }
              })
              .catch(() => {});
          }
        }
      }
      if (storedPaymentAccounts.length > 0) {
        setSettings(prev => ({ ...prev, paymentAccounts: storedPaymentAccounts }));
      }
      if (sd.success) setStats({ total: sd.total, signed: sd.signed, pending: sd.pending });
    }).catch(() => { }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Цахим гэрээний удирдлага</h1>
          <p className="text-neutral-500 mt-1">Гэрээ үүсгэх, илгээх линк авах, загвар өөрчлөх.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Нийт гэрээ", value: stats.total, icon: ClipboardList, color: "text-blue-600 bg-blue-50" },
          { label: "Баталгаажсан", value: stats.signed, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
          { label: "Хүлээгдэж буй", value: stats.pending, icon: Users, color: "text-amber-600 bg-amber-50" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-neutral-200 rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-900">{s.value}</div>
              <div className="text-sm text-neutral-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 bg-neutral-100 p-1.5 rounded-xl w-max">
        {([["history", History, "Илгээсэн гэрээнүүд"], ["editor", Edit, "Гэрээний загвар засах"], ["preview", Eye, "Урьдчилан харах"]] as const).map(([tab, Icon, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? "bg-white text-blue-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {activeTab === "history" && <ContractHistoryTab contracts={contracts} setContracts={setContracts} loading={loading} setStats={setStats} settings={settings} />}
      {activeTab === "editor" && <ContractEditorTab settings={settings} setSettings={setSettings} setContracts={setContracts} setActiveTab={setActiveTab} setStats={setStats} />}
      {activeTab === "preview" && <ContractPreviewTab settings={settings} />}
    </div>
  );
}

// ─── Contract Detail Modal ────────────────────────────────────────────────────
function ContractDetailModal({ contractId, onClose, settings }: { contractId: string; onClose: () => void; settings: any }) {
  const [detail, setDetail] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  useEffect(() => {
    adminFetch(`${API}/contracts/${contractId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setDetail(d.contract);
          // If template → fetch submissions
          if (d.contract.isTemplate) {
            setLoadingSubs(true);
            adminFetch(`${API}/contracts/${contractId}/submissions`)
              .then(r2 => r2.json())
              .then(d2 => { if (d2.success) setSubmissions(d2.submissions); })
              .catch(() => {})
              .finally(() => setLoadingSubs(false));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contractId]);

  const member = detail?.memberData as any;
  const feePlanLabel = (key: string | null) => {
    const storedPlans: any[] = (detail?.headerData as any)?.feePlans ?? settings.feePlans;
    const p = storedPlans.find((f: any) => f.key === key);
    return p ? `${p.label} — ${Number(p.price).toLocaleString()}₮` : key ?? "—";
  };
  const base = process.env.NEXT_PUBLIC_WEB_URL || "https://mglstore.mn";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-[#1e4e8c]">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-white" />
            <div>
              <h2 className="font-bold text-white text-lg">{member?.name || "Гэрээний дэлгэрэнгүй"}</h2>
              <p className="text-blue-200 text-xs">MGL-{contractId.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>
        ) : !detail ? (
          <div className="flex-1 flex items-center justify-center text-neutral-500">Мэдээлэл олдсонгүй</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

            {/* Status + actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {detail.status === "SIGNED" && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">✓ Баталгаажсан</span>}
                {detail.status === "PENDING" && <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">⏳ Хүлээгдэж буй</span>}
                {detail.isPaid && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Төлбөртэй</span>}
              </div>
              <div className="flex gap-2">
                {detail.status === "SIGNED" && (
                  <button onClick={() => window.open(`${base}/contract/sign/${contractId}?print=1`, "_blank")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                    <Download className="w-4 h-4" /> PDF татах
                  </button>
                )}
                {detail.status === "PENDING" && (
                  <button onClick={() => { navigator.clipboard.writeText(`${base}/contract/sign/${contractId}`); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
                    <LinkIcon className="w-4 h-4" /> Линк хуулах
                  </button>
                )}
              </div>
            </div>

            {/* Contract meta */}
            <div className="grid grid-cols-2 gap-3">
              {[[
                "Гэрээний дугаар", `MGL-${contractId.slice(0, 8).toUpperCase()}`
              ], [
                "Хураамж", feePlanLabel(detail.feePlan)
              ], [
                "Баталгаажсан огноо", detail.signedAt ? new Date(detail.signedAt).toLocaleString("mn-MN") : "—"
              ], [
                "Гэрээний хугацаа", settings.feePlans.find((f: any) => f.key === detail.feePlan)?.label ?? "—"
              ]].map(([label, value]) => (
                <div key={label} className="bg-neutral-50 border border-neutral-100 rounded-xl p-4">
                  <div className="text-xs text-neutral-500 mb-1">{label}</div>
                  <div className="font-semibold text-neutral-800 text-sm">{value}</div>
                </div>
              ))}
            </div>

            {/* Member info */}
            {member && (
              <div className="bg-white border border-[#b4c6e7] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#f0f4ff] border-b border-[#b4c6e7] flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#1e4e8c]" />
                  <span className="font-semibold text-[#1e4e8c] text-sm">Гишүүн байгууллагын мэдээлэл</span>
                </div>
                <div className="divide-y divide-neutral-100">
                  {([
                    ["Байгууллагын нэр", member.name],
                    ["Регистрийн дугаар", member.register],
                    ["Үйл ажиллагааны чиглэл", member.field],
                    ["Хаяг", member.address],
                    ["Утас", member.phone],
                    ["И-мэйл", member.email],
                    ["Вэбсайт", member.website],
                    ["Нэр", member.director],
                  ] as [string, string][]).filter(([, v]) => v).map(([label, value]) => (
                    <div key={label} className="flex px-4 py-2.5 gap-4">
                      <span className="text-xs text-neutral-500 w-40 flex-shrink-0 pt-0.5">{label}</span>
                      <span className="text-sm text-neutral-800 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signatures — only for non-template submissions */}
            {!detail.isTemplate && (
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-[#b4c6e7] rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-[#f0f4ff] border-b border-[#b4c6e7] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1e4e8c]">ХОЛБООНЫ ГАРЫН ҮСЭГ</span>
                    {detail.adminSignature && (
                      <a href={detail.adminSignature} download="admin-signature.png" className="text-xs text-[#1e4e8c] hover:underline flex items-center gap-1">
                        <Download className="w-3 h-3" /> PNG
                      </a>
                    )}
                  </div>
                  <div className="p-3 bg-neutral-50 h-24 flex items-center justify-center">
                    {detail.adminSignature
                      ? <img src={detail.adminSignature} alt="Admin гарын үсэг" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                      : <span className="text-xs text-neutral-400">Байхгүй</span>}
                  </div>
                  {detail.adminTitle && <div className="px-3 py-2 text-xs text-center text-[#c00000] border-t border-[#b4c6e7]">{detail.adminTitle}</div>}
                </div>
                <div className="border border-[#b4c6e7] rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-[#f0f4ff] border-b border-[#b4c6e7] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1e4e8c]">ГИШҮҮНИЙ ГАРЫН ҮСЭГ</span>
                    {detail.memberSignature && (
                      <a href={detail.memberSignature} download={`signature-${member?.name || contractId}.png`} className="text-xs text-[#1e4e8c] hover:underline flex items-center gap-1">
                        <Download className="w-3 h-3" /> PNG
                      </a>
                    )}
                  </div>
                  <div className="p-3 bg-neutral-50 h-24 flex items-center justify-center">
                    {detail.memberSignature
                      ? <img src={detail.memberSignature} alt="Member гарын үсэг" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                      : <span className="text-xs text-neutral-400">{detail.status === "PENDING" ? "Гарын үсэг зураагүй" : "Байхгүй"}</span>}
                  </div>
                  {member?.director && <div className="px-3 py-2 text-xs text-center text-neutral-600 border-t border-[#b4c6e7]">{member.director}</div>}
                </div>
              </div>
            )}

            {/* Submissions list — shown when viewing a template */}
            {detail.isTemplate && (
              <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                  <span className="font-semibold text-neutral-800 text-sm">Бөглөсөн гишүүд</span>
                  <div className="flex gap-3 text-xs">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                      {submissions.filter(s => s.status === "SIGNED").length} баталгаажсан
                    </span>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                      {submissions.filter(s => s.status === "PENDING").length} хүлээгдэж буй
                    </span>
                  </div>
                </div>
                {loadingSubs ? (
                  <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>
                ) : submissions.length === 0 ? (
                  <div className="py-8 text-center text-neutral-400 text-sm">Одоогоор бөглөсөн хүн байхгүй байна.</div>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {submissions.map(s => (
                      <div key={s.id}>
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
                          onClick={() => setExpandedSub(expandedSub === s.id ? null : s.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === "SIGNED" ? "bg-green-500" : "bg-amber-400"}`} />
                            <div>
                              <div className="font-medium text-neutral-800 text-sm">{(s.memberData as any)?.name || "Тодорхойгүй"}</div>
                              <div className="text-xs text-neutral-400">{s.date}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {s.status === "SIGNED"
                              ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Баталгаажсан</span>
                              : <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Хүлээгдэж буй</span>}
                            <Eye className="w-3.5 h-3.5 text-neutral-400" />
                          </div>
                        </button>
                        {expandedSub === s.id && (
                          <div className="px-4 pb-3 bg-neutral-50/50 border-t border-neutral-100">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 text-xs">
                              {([
                                ["Байгууллагын нэр", (s.memberData as any)?.name],
                                ["Регистр", (s.memberData as any)?.register],
                                ["Утас", (s.memberData as any)?.phone],
                                ["И-мэйл", (s.memberData as any)?.email],
                                ["Хаяг", (s.memberData as any)?.address],
                                ["Үйл ажиллагаа", (s.memberData as any)?.field],
                              ] as [string, string][]).filter(([, v]) => v).map(([label, value]) => (
                                <div key={label}>
                                  <span className="text-neutral-400">{label}: </span>
                                  <span className="font-medium text-neutral-700">{value}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => { const base = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3001"; window.open(`${base}/contract/sign/${s.id}?print=1`, "_blank"); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" /> PDF
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}


// ─── History tab ─────────────────────────────────────────────────────────────
function ContractHistoryTab({
  contracts, setContracts, loading, setStats, settings
}: {
  contracts: any[],
  setContracts: React.Dispatch<React.SetStateAction<any[]>>,
  loading: boolean,
  setStats: React.Dispatch<React.SetStateAction<any>>,
  settings: any,
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Энэ гэрээг устгах уу? Бүх submissions мөн устана.")) return;
    setDeletingId(id);
    try {
      const res = await adminFetch(`${API}/contracts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setContracts(prev => prev.filter(c => c.id !== id));
        setStats((s: any) => ({ ...s, total: Math.max(0, s.total - 1) }));
      } else {
        alert(data.error || "Устгахад алдаа гарлаа");
      }
    } catch { alert("Устгахад алдаа гарлаа"); }
    finally { setDeletingId(null); }
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
        <ContractDetailModal contractId={detailId} onClose={() => setDetailId(null)} settings={settings} />
      )}

      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-neutral-200 flex justify-between items-center bg-neutral-50/50">
          <h3 className="font-bold text-lg text-neutral-800">Бүртгэлтэй гэрээнүүд</h3>
          <NewContractButton settings={settings} setContracts={setContracts} setStats={setStats} />
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
                <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-neutral-400" /></td></tr>
              ) : contracts.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-neutral-500">Одоогоор илгээсэн гэрээ байхгүй байна.</td></tr>
              ) : contracts.map(c => (
                <tr key={c.id} className="hover:bg-neutral-50 transition-colors cursor-pointer" onClick={() => setDetailId(c.id)}>
                  <td className="px-6 py-4 font-medium text-neutral-900 max-w-[180px] truncate">{c.org}</td>
                  <td className="px-6 py-4">
                    {c.status === "PENDING" && <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">Хүлээгдэж буй</span>}
                    {c.status === "SIGNED" && <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Баталгаажсан</span>}
                    {c.status === "TAMPERED" && <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Алдаатай</span>}
                    {c.isPaid && <span className="ml-1.5 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Төлбөртэй</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{feePlanLabel(c)}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{c.createdBy}</td>
                  <td className="px-6 py-4 text-sm text-neutral-500">{c.date}</td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setDetailId(c.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 transition-colors">
                        <Eye className="w-4 h-4" /> Дэлгэрэнгүй
                      </button>
                      {c.status === "SIGNED" && (
                        <button onClick={() => handleDownloadPdf(c)} title="PDF татах"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-green-200 rounded-lg text-sm text-green-700 hover:bg-green-50 transition-colors">
                          <Download className="w-4 h-4" /> PDF
                        </button>
                      )}
                      {c.status === "PENDING" && (
                        <button onClick={() => handleCopy(c.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 transition-colors">
                          {copiedId === c.id ? <Check className="w-4 h-4 text-green-600" /> : <LinkIcon className="w-4 h-4" />}
                          {copiedId === c.id ? <span className="text-green-600 font-medium">Хуулсан</span> : "Link"}
                        </button>
                      )}
                      <button onClick={() => handleDelete(c.id)} disabled={deletingId === c.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors">
                        {deletingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── New contract button with signature modal ─────────────────────────────────
function NewContractButton({ settings, setContracts, setStats }: {
  settings: any,
  setContracts: React.Dispatch<React.SetStateAction<any[]>>,
  setStats: React.Dispatch<React.SetStateAction<any>>,
}) {
  const [open, setOpen] = useState(false);
  const [feePlan, setFeePlan] = useState(settings.defaultFeePlan || settings.feePlans?.[0]?.key || "6m");
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

    setCreating(true);

    try {
      const selectedPlan = (settings.hasDuration || settings.isPaid)
        ? (settings.isPaid ? feePlan : settings.defaultFeePlan)
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
        setContracts(prev => [data.contract, ...prev]);
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
          onClick={e => e.target === e.currentTarget && setOpen(false)}
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
                  {settings.hasDuration ? "Гэрээний хугацаа" : "Төлбөрийн сонголт"}
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {settings.feePlans.map((p: any) => (
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
                        {p.label || (settings.hasDuration ? "Нэргүй хугацаа" : "Сонголт")}
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
  settings, setSettings, setContracts, setActiveTab, setStats
}: {
  settings: any,
  setSettings: any,
  setContracts: React.Dispatch<React.SetStateAction<any[]>>,
  setActiveTab: React.Dispatch<React.SetStateAction<"history" | "editor" | "preview">>,
  setStats: React.Dispatch<React.SetStateAction<any>>,
}) {
  const [saving, setSaving] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [adminStamp, setAdminStamp] = useState<string | null>(null);
  const [adminSignature, setAdminSignature] = useState("");
  const [editorTab, setEditorTab] = useState<"general" | "header" | "fields" | "payment" | "content" | "signature">("general");
  const [connectingMinuAccount, setConnectingMinuAccount] = useState(false);
  const [checkingMinuAccounts, setCheckingMinuAccounts] = useState(false);
  const [systemQrCities, setSystemQrCities] = useState<SystemQrCity[]>([]);
  const [systemQrKhoroos, setSystemQrKhoroos] = useState<SystemQrKhoroo[]>([]);
  const [systemQrCategories, setSystemQrCategories] = useState<SystemQrCategory[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      adminFetch(`${API}/vendor/merchant/systemqr/cities`).then((res) => (res.ok ? res.json() : { cities: [] })),
      adminFetch(`${API}/vendor/merchant/systemqr/categories`).then((res) => (res.ok ? res.json() : { categories: [] })),
    ])
      .then(([cityData, categoryData]) => {
        if (cancelled) return;
        const categories = Array.isArray(categoryData.categories) ? categoryData.categories : [];
        setSystemQrCities(Array.isArray(cityData.cities) ? cityData.cities : []);
        setSystemQrCategories(categories);
        setSettings((prev: any) => {
          const current = String(prev.systemQr?.subCategoryId || DEFAULT_SYSTEMQR_LOCATION.subCategoryId);
          if (categories.length === 0 || categories.some((item: SystemQrCategory) => item.code === current)) return prev;
          const fallback = categories.find((item: SystemQrCategory) => item.code === DEFAULT_SYSTEMQR_LOCATION.subCategoryId) || categories[0];
          return {
            ...prev,
            systemQr: {
              ...prev.systemQr,
              subCategoryId: fallback.code,
            },
          };
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSystemQrCities([]);
          setSystemQrCategories([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settings.isPaid) return;
    const districtId = String(settings.systemQr?.districtId || DEFAULT_SYSTEMQR_LOCATION.districtId).trim();
    if (!districtId) return;

    let cancelled = false;
    adminFetch(`${API}/vendor/merchant/systemqr/khoroo/${encodeURIComponent(districtId)}`)
      .then((res) => (res.ok ? res.json() : { khoroos: [] }))
      .then((data) => {
        if (!cancelled) setSystemQrKhoroos(Array.isArray(data.khoroos) ? data.khoroos : []);
      })
      .catch(() => {
        if (!cancelled) setSystemQrKhoroos([]);
      });

    return () => {
      cancelled = true;
    };
  }, [settings.isPaid, settings.systemQr?.districtId]);

  useEffect(() => {
    if (systemQrCities.length === 0) return;

    setSettings((prev: any) => {
      const current = prev.systemQr || {};
      const rawCityId = current.cityId === "11000" ? DEFAULT_SYSTEMQR_LOCATION.cityId : current.cityId;
      const city = systemQrCities.find((item) => item.code === rawCityId)
        || systemQrCities.find((item) => item.code === DEFAULT_SYSTEMQR_LOCATION.cityId)
        || systemQrCities[0];
      const districts = city?.districts || [];
      const rawDistrictId = current.districtId === "110400" ? DEFAULT_SYSTEMQR_LOCATION.districtId : current.districtId;
      const district = districts.find((item) => item.code === rawDistrictId) || districts[0];
      const nextCityId = city?.code || DEFAULT_SYSTEMQR_LOCATION.cityId;
      const nextDistrictId = district?.code || rawDistrictId || DEFAULT_SYSTEMQR_LOCATION.districtId;

      if (current.cityId === nextCityId && current.districtId === nextDistrictId) {
        return prev;
      }

      return {
        ...prev,
        systemQr: {
          ...current,
          cityId: nextCityId,
          districtId: nextDistrictId,
          khorooId: current.districtId === nextDistrictId ? current.khorooId : "",
        },
      };
    });
  }, [systemQrCities, setSettings]);

  useEffect(() => {
    if (systemQrKhoroos.length === 0) return;

    setSettings((prev: any) => {
      const current = prev.systemQr || {};
      if (systemQrKhoroos.some((item) => item.code === current.khorooId)) return prev;

      return {
        ...prev,
        systemQr: {
          ...current,
          khorooId: systemQrKhoroos[0].code,
        },
      };
    });
  }, [systemQrKhoroos, setSettings]);


  const updateFeePlan = (index: number, field: "label" | "sublabel" | "price", value: string) => {
    setSettings((prev: any) => {
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
    setSettings((prev: any) => {
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
    setSettings((prev: any) => {
      const removedKey = prev.feePlans[index]?.key;
      const nextPlans = prev.feePlans.filter((_: any, i: number) => i !== index);

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
    const account = (settings.paymentAccounts || []).find((item: ContractPaymentAccount) => item.id === accountId);
    if (!account) {
      setSettings((prev: any) => ({
        ...prev,
        systemQr: {
          ...prev.systemQr,
          selectedAccountId: "",
        },
      }));
      return;
    }

    setSettings((prev: any) => ({
      ...prev,
      systemQr: toSystemQrConfig(account, prev.systemQr),
    }));
  };

  const persistPaymentAccounts = async (accounts: ContractPaymentAccount[]) => {
    const res = await adminFetch(`${API}/site-settings/${CONTRACT_PAYMENT_ACCOUNTS_KEY}`, {
      method: "PUT",
      body: JSON.stringify({ value: JSON.stringify(accounts) }),
    });

    if (!res.ok) {
      throw new Error("Дансны сан хадгалахад алдаа гарлаа");
    }
  };

  const updateSystemQr = (field: string, value: string | boolean) => {
    setSettings((prev: any) => ({
      ...prev,
      systemQr: {
        ...prev.systemQr,
        [field]: value,
      },
    }));
  };

  const handleSystemQrCityChange = (cityId: string) => {
    const city = systemQrCities.find((item) => item.code === cityId);
    const districtId = city?.districts?.[0]?.code || "";

    setSettings((prev: any) => ({
      ...prev,
      systemQr: {
        ...prev.systemQr,
        cityId,
        districtId,
        khorooId: "",
      },
    }));
  };

  const handleSystemQrDistrictChange = (districtId: string) => {
    setSettings((prev: any) => ({
      ...prev,
      systemQr: {
        ...prev.systemQr,
        districtId,
        khorooId: "",
      },
    }));
  };

  const findExactMinuSubMerchant = async (merchantCode: string) => {
    const expectedCode = String(merchantCode || "").trim().toLowerCase();
    if (!expectedCode) return null;

    const res = await adminFetch(`${API}/contracts/minu-dynamic-qr/sub-merchants?query=${encodeURIComponent(merchantCode)}`);
    const data = await res.json();
    if (!data.success || data.fallback) return null;

    const rows = Array.isArray(data.subMerchants) ? data.subMerchants : [];
    return rows.find((item: any) =>
      String(item.merchantCode || "").trim().toLowerCase() === expectedCode
    ) || null;
  };

  const upsertCurrentPaymentAccount = async (
    overrides: Partial<ContractPaymentAccount> = {},
    options: PaymentAccountUpsertOptions = {},
  ) => {
    const config = settings.systemQr || {};
    let nextMerchantName = String(overrides.merchantName || config.merchantName || "").trim();
    let nextMerchantCode = String(overrides.merchantCode || config.merchantCode || "").trim();
    if (!nextMerchantName || !nextMerchantCode) {
      alert("Дансны санд хадгалахын тулд мерчант нэр болон merchant code шаардлагатай");
      return null;
    }

    let verifiedSubMerchant: any = null;
    if (!options.trustedMerchantCode) {
      verifiedSubMerchant = await findExactMinuSubMerchant(nextMerchantCode).catch(() => null);
      if (!verifiedSubMerchant?.merchantCode) {
        alert(MANUAL_SYSTEMQR_CODE_ERROR);
        return null;
      }

      nextMerchantName = String(verifiedSubMerchant.merchantName || nextMerchantName).trim();
      nextMerchantCode = String(verifiedSubMerchant.merchantCode || nextMerchantCode).trim();
    }

    const existingId = config.selectedAccountId || overrides.id;
    const now = new Date().toISOString();
    const accountCorporateFlag = String(overrides.corporateFlag || config.corporateFlag || DEFAULT_SYSTEMQR_LOCATION.corporateFlag).trim();
    const account: ContractPaymentAccount = {
      id: String(existingId || `account_${Date.now()}`),
      label: String(overrides.label || config.label || nextMerchantName || "Minu данс").trim(),
      merchantName: nextMerchantName,
      merchantCode: nextMerchantCode,
      username: String(overrides.username || verifiedSubMerchant?.username || config.username || nextMerchantCode).trim(),
      password: String(overrides.password || verifiedSubMerchant?.password || config.password || "").trim(),
      bankCode: String(overrides.bankCode || config.bankCode || "050000").trim(),
      accountNumber: String(overrides.accountNumber || config.accountNumber).trim(),
      registerNumber: String(overrides.registerNumber || config.registerNumber).trim(),
      phone: String(overrides.phone || config.phone).trim(),
      email: String(overrides.email || config.email || "").trim(),
      cityId: String(overrides.cityId || config.cityId || DEFAULT_SYSTEMQR_LOCATION.cityId).trim(),
      districtId: String(overrides.districtId || config.districtId || DEFAULT_SYSTEMQR_LOCATION.districtId).trim(),
      khorooId: String(overrides.khorooId || config.khorooId || DEFAULT_SYSTEMQR_LOCATION.khorooId).trim(),
      building: String(overrides.building || config.building || DEFAULT_SYSTEMQR_LOCATION.building).trim(),
      doorNo: String(overrides.doorNo || config.doorNo || DEFAULT_SYSTEMQR_LOCATION.doorNo).trim(),
      firstName: String(overrides.firstName || config.firstName || "").trim(),
      lastName: String(overrides.lastName || config.lastName || "").trim(),
      corporateFlag: accountCorporateFlag,
      corporateName: accountCorporateFlag === "1"
        ? String(overrides.corporateName || config.corporateName || config.merchantName || "").trim()
        : String(overrides.corporateName || config.corporateName || "").trim(),
      gender: String(overrides.gender || config.gender || DEFAULT_SYSTEMQR_LOCATION.gender).trim(),
      subCategoryId: String(overrides.subCategoryId || config.subCategoryId || DEFAULT_SYSTEMQR_LOCATION.subCategoryId).trim(),
      createdAt: overrides.createdAt || now,
      updatedAt: now,
    };

    const currentAccounts: ContractPaymentAccount[] = Array.isArray(settings.paymentAccounts)
      ? settings.paymentAccounts
      : [];
    const nextAccounts = currentAccounts.some((item) => item.id === account.id)
      ? currentAccounts.map((item) => item.id === account.id ? { ...item, ...account, createdAt: item.createdAt || account.createdAt } : item)
      : [...currentAccounts, account];

    await persistPaymentAccounts(nextAccounts);
    setSettings((prev: any) => ({
      ...prev,
      paymentAccounts: nextAccounts,
      systemQr: toSystemQrConfig(account, prev.systemQr),
    }));

    return account;
  };

  const deletePaymentAccount = async (accountId: string) => {
    if (!confirm("Энэ дансыг сангаас устгах уу? Өмнө нь үүссэн гэрээний template доторх merchantCode хэвээр үлдэнэ.")) return;

    const removedAccount = (settings.paymentAccounts || []).find((item: ContractPaymentAccount) => item.id === accountId);
    const nextAccounts = (settings.paymentAccounts || []).filter((item: ContractPaymentAccount) => item.id !== accountId);
    try {
      await persistPaymentAccounts(nextAccounts);
      setSettings((prev: any) => ({
        ...prev,
        paymentAccounts: nextAccounts,
        systemQr: prev.systemQr?.selectedAccountId === accountId
          || (removedAccount?.merchantCode && prev.systemQr?.merchantCode === removedAccount.merchantCode)
          ? {
              ...prev.systemQr,
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
            }
          : prev.systemQr,
      }));
    } catch (error) {
      console.error("delete payment account error", error);
      alert("Данс устгахад алдаа гарлаа");
    }
  };

  const withSystemQrDefaults = (config: any) => ({
    ...config,
    cityId: String(config.cityId || DEFAULT_SYSTEMQR_LOCATION.cityId).trim(),
    districtId: String(config.districtId || DEFAULT_SYSTEMQR_LOCATION.districtId).trim(),
    khorooId: String(config.khorooId || DEFAULT_SYSTEMQR_LOCATION.khorooId).trim(),
    building: String(config.building || DEFAULT_SYSTEMQR_LOCATION.building).trim(),
    doorNo: String(config.doorNo || DEFAULT_SYSTEMQR_LOCATION.doorNo).trim(),
    corporateFlag: String(config.corporateFlag || DEFAULT_SYSTEMQR_LOCATION.corporateFlag).trim(),
    gender: String(config.gender || DEFAULT_SYSTEMQR_LOCATION.gender).trim(),
    subCategoryId: String(config.subCategoryId || DEFAULT_SYSTEMQR_LOCATION.subCategoryId).trim(),
  });

  const handleConnectMinuAccount = async () => {
    const config = withSystemQrDefaults(settings.systemQr || {});
    const isCorporateMerchant = String(config.corporateFlag || DEFAULT_SYSTEMQR_LOCATION.corporateFlag).trim() === "1";
    if (config.merchantName && config.merchantCode) {
      setConnectingMinuAccount(true);
      try {
        const account = await upsertCurrentPaymentAccount();
        if (account) alert("Minu merchant code дансны санд хадгалагдлаа.");
      } finally {
        setConnectingMinuAccount(false);
      }
      return;
    }

    if (config.merchantName && !config.merchantCode) {
      setConnectingMinuAccount(true);
      try {
        const res = await adminFetch(`${API}/contracts/minu-dynamic-qr/sub-merchants?query=${encodeURIComponent(config.merchantName)}`);
        const data = await res.json();
        const existing = Array.isArray(data.subMerchants)
          ? data.subMerchants.find((item: any) =>
              String(item.merchantName || "").trim().toLowerCase() === config.merchantName.toLowerCase()
              || String(item.merchantCode || "").trim().toLowerCase() === config.merchantName.toLowerCase()
            )
          : null;
        if (data.success && !data.fallback && existing?.merchantCode) {
          await upsertCurrentPaymentAccount({
            merchantName: existing.merchantName || config.merchantName,
            merchantCode: existing.merchantCode,
            username: existing.username || existing.merchantCode,
            password: existing.password || "",
          }, { trustedMerchantCode: true });
          alert("Minu дээр бүртгэлтэй merchant code-г авч хадгаллаа.");
          return;
        }
      } catch {
        // Continue to full registration validation below.
      } finally {
        setConnectingMinuAccount(false);
      }
    }

    if (
      !config.merchantName ||
      !config.accountNumber ||
      !config.bankCode ||
      !config.registerNumber ||
      !config.phone ||
      !config.cityId ||
      !config.districtId ||
      !config.khorooId ||
      !config.building ||
      !config.doorNo ||
      (!isCorporateMerchant && (!config.firstName || !config.lastName)) ||
      !config.subCategoryId
    ) {
      alert("Minu данс холбохын тулд мерчант, данс, регистр, утас, эзэмшигч, хаяг, үйл ажиллагааны чиглэлээ бүрэн бөглөнө үү");
      return;
    }

    setConnectingMinuAccount(true);
    try {
      const res = await adminFetch(`${API}/contracts/minu-dynamic-qr/register`, {
        method: "POST",
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Minu Dynamic QR данс холбох үед алдаа гарлаа");
        return;
      }

      await upsertCurrentPaymentAccount({
        merchantCode: data.merchantCode,
        username: data.username || data.merchantCode,
        password: data.password || "",
      }, { trustedMerchantCode: true });
      alert("Minu Dynamic QR данс холбогдлоо. Энэ гэрээний template дээр сонгож ашиглаж болно.");
    } catch (error) {
      console.error("connect minu account error", error);
      alert("Minu Dynamic QR данс холбох үед серверийн алдаа гарлаа");
    } finally {
      setConnectingMinuAccount(false);
    }
  };

  const checkMinuSubMerchants = async () => {
    const query = String(settings.systemQr?.merchantName || settings.systemQr?.merchantCode || "").trim();
    if (!query) {
      alert("Шалгахын тулд мерчант нэр эсвэл Merchant Code оруулна уу");
      return;
    }

    setCheckingMinuAccounts(true);
    try {
      const res = await adminFetch(`${API}/contracts/minu-dynamic-qr/sub-merchants?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Minu бүртгэл шалгахад алдаа гарлаа");
        return;
      }

      const rows = Array.isArray(data.subMerchants) ? data.subMerchants : [];
      if (rows.length === 0) {
        alert(`"${query}" нэр/code-той бүртгэл олдсонгүй`);
        return;
      }

      const prefix = data.fallback
        ? "Minu шалгалт түр боломжгүй тул дансны сангаас харуулж байна:\n"
        : "";
      alert(prefix + rows.slice(0, 5).map((item: any) =>
        `${item.merchantName || "-"} — ${item.merchantCode || "-"}`
      ).join("\n"));
    } catch (error) {
      console.error("check minu sub merchants error", error);
      alert("Minu бүртгэл шалгахад серверийн алдаа гарлаа");
    } finally {
      setCheckingMinuAccounts(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      if (file.name.endsWith(".txt")) {
        const text = await file.text();
        setSettings((prev: any) => ({ ...prev, content: text, contentIsHtml: false }));
      } else if (file.name.endsWith(".docx")) {
        const buf = await file.arrayBuffer();
        const mammoth = (await import("mammoth/mammoth.browser.js" as any)) as any;
        const result = await mammoth.convertToHtml({ arrayBuffer: buf }, {
          styleMap: [
            "p[style-name='Heading 1'] => h2:fresh",
            "p[style-name='Heading 2'] => h3:fresh",
            "b => strong",
            "i => em",
          ],
        });
        setSettings((prev: any) => ({ ...prev, content: result.value, contentIsHtml: true }));
      } else {
        alert(".txt эсвэл .docx файл сонгоно уу");
      }
    } catch (err) {
      console.error("import error", err);
      alert("Файл уншихад алдаа гарлаа. .txt эсвэл .docx файл сонгоно уу.");
    }
    finally { setImportLoading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const handleSave = async () => {
    if (!adminSignature) {
      alert("Гэрээ байгуулагчийн гарын үсэг оруулна уу");
      return;
    }

    setSaving(true);

    try {
      const selectedPlan = (settings.hasDuration || settings.isPaid)
        ? settings.defaultFeePlan
        : null;

      const res = await adminFetch(`${API}/contracts`, {
        method: "POST",
        body: JSON.stringify({
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
        }),
      });

      const data = await res.json();

      if (data.success) {
        setContracts(prev => [data.contract, ...prev]);
        setStats((s: any) => ({
          ...s,
          total: s.total + 1,
          pending: s.pending + 1,
        }));

        alert("Гэрээний тохиргоо хадгалагдаж, шинэ линк үүслээ!");
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
          <Edit className="w-5 h-5 text-blue-600" /> Гэрээний тохиргоо & Загвар
        </h3>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Хадгалж байна...</> : "Хадгалах & Линк үүсгэх"}
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 bg-neutral-100 p-1.5 border-b border-neutral-200 overflow-x-auto">
        {([
          ["general", "⚙️ Ерөнхий"],
          ["header", "📄 Толгой хэсэг"],
          ["fields", "📋 Гишүүний мэдээлэл"],
          ["payment", "💳 Төлбөр & Хугацаа"],
          ["content", "📝 Гэрээний агуулга"],
          ["signature", "✍️ Гарын үсэг"],
        ] as const).map(([tab, label]) => (
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
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Овог нэр</label>
            <input type="text" value={settings.presidentName} onChange={e => setSettings({ ...settings, presidentName: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Албан тушаал</label>
            <input type="text" value={settings.presidentTitle} onChange={e => setSettings({ ...settings, presidentTitle: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Байгууллагын нэр</label>
            <input type="text" value={settings.orgName} onChange={e => setSettings({ ...settings, orgName: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      )}

      {/* Header Tab */}
      {editorTab === "header" && (
        <div className="p-6 border-b border-neutral-100 bg-neutral-50/20">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-4">Гэрээний толгой хэсэг</div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Байгууллагын нэр (толгой)</label>
              <textarea rows={2} value={settings.headerTitle} onChange={e => setSettings({ ...settings, headerTitle: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Дэд гарчиг (англи)</label>
              <input type="text" value={settings.headerSubtitle} onChange={e => setSettings({ ...settings, headerSubtitle: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Гэрээний нэр</label>
              <input type="text" value={settings.headerContractTitle} onChange={e => setSettings({ ...settings, headerContractTitle: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Холбооны тамга (зураг)</label>
            <input ref={stampRef} type="file" accept="image/*" className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => setAdminStamp(ev.target?.result as string);
                reader.readAsDataURL(file);
              }}
            />
            <div
              onClick={() => stampRef.current?.click()}
              className="w-full border-2 border-dashed border-neutral-300 rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
            >
              {adminStamp ? (
                <>
                  <img src={adminStamp} alt="Тамга" className="h-16 max-w-[160px] object-contain mix-blend-multiply" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-neutral-700">Тамга upload хийгдсэн</div>
                    <button type="button" onClick={e => { e.stopPropagation(); setAdminStamp(null); }}
                      className="text-xs text-red-400 hover:text-red-500 mt-1">Хасах</button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-neutral-400">Тамганы зураг энд дарна upload хийх (PNG / JPG)</div>
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
            {settings.memberFields.map((field: any, idx: number) => (
              <div key={field.key} className="flex items-center gap-3 bg-white p-3 border border-neutral-200 rounded-xl shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    setSettings((prev: any) => ({
                      ...prev,
                      memberFields: prev.memberFields.map((f: any, i: number) =>
                        i === idx ? { ...f, enabled: !f.enabled } : f
                      ),
                    }));
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${field.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-400'}`}
                >
                  {field.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <input
                  type="text"
                  value={field.label}
                  onChange={e => {
                    const val = e.target.value;
                    setSettings((prev: any) => ({
                      ...prev,
                      memberFields: prev.memberFields.map((f: any, i: number) =>
                        i === idx ? { ...f, label: val } : f
                      ),
                    }));
                  }}
                  disabled={!field.enabled}
                  className="flex-1 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:blue-500 disabled:opacity-50 disabled:bg-neutral-50"
                />
                <label className={`flex items-center gap-2 text-sm font-medium ${field.enabled ? 'text-neutral-700' : 'text-neutral-400'}`}>
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={e => {
                      const checked = e.target.checked;
                      setSettings((prev: any) => ({
                        ...prev,
                        memberFields: prev.memberFields.map((f: any, i: number) =>
                          i === idx ? { ...f, required: checked } : f
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
                    {settings.hasDuration ? "Гэрээний хугацаа" : "Төлбөрийн сонголт"}
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
                {settings.feePlans.map((plan: any, index: number) => (
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
                        onChange={e => updateFeePlan(index, "label", e.target.value)}
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
                        onChange={e => updateFeePlan(index, "sublabel", e.target.value)}
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
                        value={plan.price ? Number(plan.price).toLocaleString() : ""}
                        onChange={e => updateFeePlan(index, "price", e.target.value)}
                        placeholder="жш: 1800000"
                        className="px-3 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 bg-white transition-colors placeholder:text-neutral-300"
                      />
                    </div>

                    <div className="md:col-span-3 flex items-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSettings((prev: any) => ({
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
                        {settings.defaultFeePlan === plan.key ? "Үндсэн" : "Үндсэн болгох"}
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
                  Dropdown дээр сонгогдох үндсэн {settings.hasDuration ? "хугацаа" : "сонголт"}
                </label>

                <select
                  value={settings.defaultFeePlan}
                  onChange={e => {
                    const val = e.target.value;
                    setSettings((prev: any) => ({
                      ...prev,
                      defaultFeePlan: val,
                    }));
                  }}
                  className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {settings.feePlans.map((plan: any) => (
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

          {settings.isPaid && (
            <PaymentAccountsSettingsPanel
              settings={settings}
              setSettings={setSettings}
              selectPaymentAccount={selectPaymentAccount}
              connectingMinuAccount={connectingMinuAccount}
              checkingMinuAccounts={checkingMinuAccounts}
              checkMinuSubMerchants={checkMinuSubMerchants}
              deletePaymentAccount={deletePaymentAccount}
              handleConnectMinuAccount={handleConnectMinuAccount}
              onSystemQrCityChange={handleSystemQrCityChange}
              onSystemQrDistrictChange={handleSystemQrDistrictChange}
              systemQrCategories={systemQrCategories}
              systemQrCities={systemQrCities}
              systemQrKhoroos={systemQrKhoroos}
              updateSystemQr={updateSystemQr}
              upsertCurrentPaymentAccount={upsertCurrentPaymentAccount}
            />
          )}
        </div>
      )}

      {/* Content Tab */}
      {editorTab === "content" && (
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">Доорх текст шинэ гэрээнүүдэд тусгагдана.</p>
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept=".txt,.docx" className="hidden" onChange={handleImport} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={importLoading}
                className="flex items-center gap-2 px-3 py-1.5 border border-neutral-300 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">
                {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
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
                onClick={() => setSettings({ ...settings, contentIsHtml: false, content: "" })}
                className="absolute top-2 right-2 px-2 py-1 bg-white border border-neutral-200 rounded text-xs text-red-400 hover:text-red-600 shadow-sm"
              >
                Цэвэрлэх
              </button>
            </div>
          ) : (
            <textarea value={settings.content} onChange={e => setSettings({ ...settings, content: e.target.value })}
              className="w-full p-4 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-serif text-sm leading-relaxed resize-none bg-neutral-50 min-h-[400px]" />
          )}
        </div>
      )}

      {/* Signature Tab */}
      {editorTab === "signature" && (
        <div className="p-6 border-t border-neutral-100">
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
function ContractPreviewTab({ settings }: { settings: any }) {
  const sig = useSignatureCanvas();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [memberData, setMemberData] = useState<Record<string, string>>({});
  const [memberSignature, setMemberSignature] = useState("");
  const [memberHasSignature, setMemberHasSignature] = useState(false);
  const memberSigRef = useRef<HTMLCanvasElement>(null);
  const memberSigDrawing = useRef(false);

  const memberSigGetPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = memberSigRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
  };

  const memberSigInitCtx = () => {
    const ctx = memberSigRef.current?.getContext("2d");
    if (ctx) { ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1e4e8c"; }
    return ctx;
  };

  const memberSigStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = memberSigInitCtx();
    if (!ctx) return;
    const { x, y } = memberSigGetPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    memberSigDrawing.current = true;
  };

  const memberSigMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!memberSigDrawing.current) return;
    const ctx = memberSigRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = memberSigGetPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setMemberHasSignature(true);
  };

  const memberSigEnd = () => {
    memberSigDrawing.current = false;
    if (memberSigRef.current) {
      setMemberSignature(memberSigRef.current.toDataURL("image/png"));
    }
  };

  const memberSigClear = () => {
    const canvas = memberSigRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setMemberHasSignature(false);
    setMemberSignature("");
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-2xl shadow-sm border border-neutral-100">
        <CheckCircle2 className="w-20 h-20 text-green-500" />
        <h2 className="text-2xl font-semibold text-neutral-800">Гэрээ амжилттай баталгаажлаа</h2>
        <button onClick={() => setSubmitted(false)} className="mt-4 px-6 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 font-medium">Буцах</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden w-full max-w-4xl mx-auto">
      <div className="p-8 md:p-12 text-sm leading-relaxed text-black font-serif border-b border-neutral-200">
        <div className="text-center font-bold text-lg mb-1 leading-snug text-[#1e4e8c]">
          {settings.headerTitle ? (
            <>
              {settings.headerTitle}<br />
              {settings.headerSubtitle && <span className="font-normal text-sm italic text-neutral-600">{settings.headerSubtitle}</span>}
            </>
          ) : (
            <>
              МОНГОЛ ЭЗЭНТЭЙ ЖИЖИГ ДУНД БИЗНЕС<br />ЭРХЛЭГЧДИЙН НЭГДСЭН ХОЛБОО<br />
              <span className="font-normal text-sm italic text-neutral-600">Mongolian SME United Association</span>
            </>
          )}
        </div>
        <div className="border-b-2 border-[#1e4e8c] my-4"></div>
        <div className="text-center font-bold text-[#1e4e8c] mb-4 text-base">
          {settings.headerContractTitle || "УДИРДАХ ЗӨВЛӨЛИЙН ГИШҮҮНЧЛЭЛИЙН ГЭРЭЭ"}
        </div>
        {settings.contentIsHtml ? (
          <div
            className="mt-6 contract-html-content
              [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-neutral-300 [&_td]:p-2 [&_th]:border [&_th]:border-neutral-300 [&_th]:p-2 [&_th]:bg-neutral-100"
            dangerouslySetInnerHTML={{ __html: settings.content }}
          />
        ) : (
          <div className="whitespace-pre-wrap mt-6">{settings.content}</div>
        )}

        <div className="mt-8 overflow-hidden">
          <table className="w-full border-collapse border border-[#b4c6e7] text-sm">
            <thead>
              <tr>
                <th className="border border-[#b4c6e7] bg-[#f8f9fc] p-4 text-center w-1/2">
                  <div className="text-[#1e4e8c] font-bold text-base mb-1">ХОЛБОО</div>
                  <div className="text-[#c00000] font-normal">{settings.orgName || "Байгууллагын нэр"}</div>
                </th>
                <th className="border border-[#b4c6e7] bg-[#f8f9fc] p-4 text-center w-1/2">
                  <div className="text-[#1e4e8c] font-bold text-base mb-1">ГИШҮҮН</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-[#b4c6e7] p-4 bg-[#f8f9fc] align-top">
                  <div className="border-b-2 border-[#1e4e8c] h-16 mb-1 flex items-end justify-center">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Signature_of_John_Hancock.svg" alt="" className="h-12 opacity-40 mix-blend-multiply" />
                  </div>
                  <div className="text-xs text-[#c00000] mb-1">Гарын үсэг / Албан тушаал</div>
                  <div className="border-b-2 border-[#1e4e8c] h-8 mt-3 mb-1 flex items-end justify-center">
                    <span className="text-sm font-medium">{settings.presidentName || "Овог нэр"}</span>
                  </div>
                  <div className="text-xs text-neutral-500 mb-1">Овог нэр</div>
                  <div className="border-b-2 border-[#1e4e8c] h-8 mt-3 mb-1 flex items-end justify-center">
                    <span className="text-sm font-medium text-[#c00000]">{settings.presidentTitle || "Албан тушаал"}</span>
                  </div>
                  <div className="text-xs text-neutral-500">Албан тушаал</div>
                </td>
                <td className="border border-[#b4c6e7] p-4 bg-[#f8f9fc] align-top">
                  <div className="flex flex-col gap-3">
                    {settings.memberFields && settings.memberFields.filter((f: any) => f.enabled).map((field: any) => (
                      <div key={field.key} className="flex flex-col">
                        <label className="text-xs text-neutral-600 mb-1.5 font-medium">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        <input
                          type="text"
                          placeholder={`${field.label}ыг оруулна уу`}
                          value={memberData[field.key] || ""}
                          onChange={e => setMemberData(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="border-b-2 border-[#1e4e8c] px-1 py-1.5 text-sm bg-transparent focus:outline-none focus:bg-blue-50/20 rounded-sm transition-colors"
                        />
                      </div>
                    ))}
                    <div className="flex flex-col mt-2">
                      <label className="text-xs text-[#c00000] font-medium mb-1.5">Гарын үсэг</label>
                      <div className="border-2 border-dashed border-[#1e4e8c]/40 rounded-lg bg-blue-50/20 relative" style={{ height: 80 }}>
                        <canvas ref={memberSigRef} width={400} height={80}
                          className="absolute inset-0 w-full h-full touch-none" style={{ cursor: "crosshair" }}
                          onMouseDown={memberSigStart} onMouseMove={memberSigMove} onMouseUp={memberSigEnd} 
                          onMouseLeave={memberSigEnd}
                          onTouchStart={memberSigStart} onTouchMove={memberSigMove} 
                          onTouchEnd={memberSigEnd}
                        />
                        {!memberHasSignature && (
                          <div className="absolute inset-0 flex items-center justify-center gap-2 text-blue-300/70 pointer-events-none text-xs">
                            <PenTool className="w-4 h-4" /> Гарын үсэг зурна уу
                          </div>
                        )}
                        {memberHasSignature && (
                          <button type="button" onClick={memberSigClear} 
                            className="absolute top-1 right-1 px-2 py-0.5 bg-white border border-neutral-200 rounded text-xs text-neutral-400 hover:text-red-500 z-10">
                            <Eraser className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="border-b-2 border-[#1e4e8c] h-8 mt-3 mb-1"></div>
                    <div className="text-xs text-neutral-500 mb-1">Овог нэр</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-6 bg-neutral-50 flex flex-col md:flex-row items-center justify-between gap-6">
        <label className="flex items-start gap-3 cursor-pointer flex-1">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-5 h-5 mt-0.5 text-blue-600 rounded border-gray-300" />
          <span className="text-sm text-neutral-600">Би дээрх гэрээний нөхцөлүүдийг уншиж танилцсан бөгөөд бүрэн хүлээн зөвшөөрч байна.</span>
        </label>
        <button 
          disabled={!agreed || submitting || !memberSignature} 
          title={!memberSignature ? "Гарын үсэг зураагүйгээр хадгалах боломжгүй" : ""}
          onClick={() => { setSubmitting(true); setTimeout(() => { setSubmitting(false); setSubmitted(true); }, 1500); }}
          className="w-full md:w-auto px-8 py-3.5 bg-[#1e4e8c] text-white rounded-xl font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Боловсруулж байна...</> : <><CheckCircle2 className="w-5 h-5" /> Гэрээг баталгаажуулах</>}
        </button>
      </div>
    </div>
  );
}
