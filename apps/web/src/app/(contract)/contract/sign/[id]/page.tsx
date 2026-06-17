"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { CheckCircle2, PenTool, Eraser, Loader2, Download, ChevronDown } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { ContractPayment } from "../../../../../components/organisms/ContractPayment";
import { DEFAULT_ORG_CONTACT, OrgInfoTable } from "../../../../../components/organisms/OrgInfoTable";
import type { OrgContactInfo } from "../../../../../components/organisms/OrgInfoTable";
import { LoginModal } from "../../../../../components/organisms/auth/LoginModal";
import { useAuth } from "@/lib/auth-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";
const API = `${API_BASE}/api`;

// Fallback text only used when contract has no saved content
const DEFAULT_CONTRACT_TEXT = `ХОЁР. ГЭРЭЕНИЙ ЗОРИЛГО
2.1. Энэхүү гэрээний зорилго нь Гишүүн байгууллагыг Холбооны бүрэлдэхүүнд элсүүлэх, гишүүнчлэлийн эрх, үүрэг, хариуцлагыг тодорхойлж, талуудын харилцааг зохицуулахад оршино.`;

type ContractInfo = {
  isPaid: boolean;
  feePlan: string | null;
  adminSignature?: string;
  adminName?: string;
  adminTitle?: string;
  adminStamp?: string;
  isTemplate?: boolean;
  memberSignature?: string;
  contractContent?: string;
  contentIsHtml?: boolean;
  orgContact?: OrgContactInfo | null;
  headerData?: {
    title?: string;
    subtitle?: string;
    contractTitle?: string;
    hasDuration?: boolean;
    feePlans?: { key: string; label: string; sublabel: string; price: number }[];
    defaultFeePlan?: string;
    memberFields?: { key: string; label: string; required: boolean; enabled: boolean }[];
    content?: string;
    contentIsHtml?: boolean;
    orgContact?: OrgContactInfo | null;
    systemQr?: { enabled: boolean; username?: string; password?: string; merchantCode?: string } | null;
  } | null;
};

const stripDuplicatedPrintSections = (html: string) => {
  let nextHtml = html;

  const bodyStart = nextHtml.search(/<h2[^>]*>\s*ХОЁР\.|<p><strong>\s*ХОЁР\./i);
  if (bodyStart > 0) {
    nextHtml = nextHtml.slice(bodyStart);
  }

  const signatureStart = nextHtml.search(/Энэхүү гэрээг уншиж танилцан|<table><tbody>\s*<tr><td><strong>ХОЛБОО/i);
  if (signatureStart > 0) {
    nextHtml = nextHtml.slice(0, signatureStart);
  }

  return nextHtml.trim();
};

const getFeePlanLabel = (
  plans: { key: string; label: string; sublabel?: string; price?: number }[],
  selectedFeePlan: string,
) => {
  const plan = plans.find((item) => item.key === selectedFeePlan);
  if (!plan) return "—";
  const price = plan.price ? ` · ${Number(plan.price).toLocaleString()}₮` : "";
  const sublabel = plan.sublabel ? ` · ${plan.sublabel}` : "";
  return `${plan.label}${sublabel}${price}`;
};

function PrintContractDocument({
  contractId,
  contractInfo,
  memberData,
  memberPosition,
  selectedFeePlan,
  feePlans,
  memberFields,
  today,
}: {
  contractId: string;
  contractInfo: ContractInfo;
  memberData: Record<string, string>;
  memberPosition: string;
  selectedFeePlan: string;
  feePlans: { key: string; label: string; sublabel: string; price: number }[];
  memberFields: { key: string; label: string; required: boolean; enabled: boolean }[];
  today: string;
}) {
  const cleanedHtml = contractInfo.contentIsHtml && contractInfo.contractContent
    ? stripDuplicatedPrintSections(contractInfo.contractContent)
    : "";
  const orgContact = contractInfo.orgContact || DEFAULT_ORG_CONTACT;
  const orgRows = [
    ["Байгууллагын нэр", orgContact.orgName],
    ...(orgContact.orgRegister ? [["Байгууллагын регистр", orgContact.orgRegister]] : []),
    ["Хаяг", orgContact.orgAddress],
    ["Утас", orgContact.orgPhone],
    ["И-мэйл", orgContact.orgEmail],
    ["Вэбсайт", orgContact.orgWebsite],
  ];

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-5 sm:py-8 print:bg-white print:px-0 print:py-0">
      <article className="contract-print-page mx-auto w-[210mm] min-h-[297mm] max-w-full bg-white px-4 py-5 text-[11px] leading-[1.65] text-slate-950 shadow-2xl sm:px-[18mm] sm:py-[16mm] sm:text-[12px] print:w-auto print:min-h-0 print:px-0 print:py-0 print:shadow-none">
        <header className="border-b-[3px] border-slate-950 pb-5 text-center">
          <div className="whitespace-pre-line text-[16px] font-black uppercase tracking-[0.04em] text-slate-950">
            {contractInfo.headerData?.title ?? "МОНГОЛ ЭЗЭНТЭЙ ЖИЖИГ ДУНД БИЗНЕС\nЭРХЛЭГЧДИЙН НЭГДСЭН ХОЛБОО"}
          </div>
          <div className="mt-1 text-[11px] font-semibold italic tracking-[0.08em] text-slate-500">
            {contractInfo.headerData?.subtitle ?? "Mongolian SME United Association"}
          </div>
          <h1 className="mt-5 text-[20px] font-black uppercase tracking-[0.05em] text-slate-950">
            {contractInfo.headerData?.contractTitle ?? "ГИШҮҮНЧЛЭЛИЙН ГЭРЭЭ"}
          </h1>
        </header>

        <section className="mt-5 grid grid-cols-1 gap-3 text-[11px] sm:grid-cols-2">
          {[
            ["Гэрээний дугаар", `MGL-${contractId.slice(0, 8).toUpperCase()}`],
            ["Огноо", today],
            ["Байршил", "Улаанбаатар хот"],
            ["Гэрээний хугацаа", getFeePlanLabel(feePlans, selectedFeePlan)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</div>
              <div className="mt-0.5 font-bold text-slate-950">{value}</div>
            </div>
          ))}
        </section>

        <section className="mt-6">
          <h2 className="mb-2 border-b border-slate-300 pb-1 text-[13px] font-black uppercase tracking-[0.08em] text-slate-950">
            НЭГ. ТАЛУУДЫН МЭДЭЭЛЭЛ
          </h2>
          <p className="mb-4 text-justify">
            Энэхүү гэрээг нэг талаас Монгол эзэнтэй жижиг дунд бизнес эрхлэгчдийн нэгдсэн холбоо
            (цаашид "Холбоо" гэх) болон нөгөө талаас доор дурдсан байгууллага
            (цаашид "Гишүүн" гэх) хооронд байгуулав.
          </p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-2 text-[11px] font-black uppercase text-slate-700">1.1 Холбооны мэдээлэл</div>
              <div className="contract-table-scroll">
                <table className="w-full border-collapse text-[10.5px]">
                  <tbody>
                    {orgRows.map(([label, value]) => (
                      <tr key={label}>
                        <td className="w-[42%] border border-slate-300 bg-slate-50 px-2 py-1.5 font-bold text-slate-700">
                          {label}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 font-semibold text-slate-950">
                          {value || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <div className="mb-2 text-[11px] font-black uppercase text-slate-700">1.2 Гишүүн байгууллагын мэдээлэл</div>
              <div className="contract-table-scroll">
                <table className="w-full border-collapse text-[10.5px]">
                  <tbody>
                    {memberFields.filter((field) => field.enabled).map((field) => (
                      <tr key={field.key}>
                        <td className="w-[42%] border border-slate-300 bg-slate-50 px-2 py-1.5 font-bold text-slate-700">
                          {field.label}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 font-semibold text-slate-950">
                          {memberData[field.key] || "—"}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="border border-slate-300 bg-slate-50 px-2 py-1.5 font-bold text-slate-700">Албан тушаал</td>
                      <td className="border border-slate-300 px-2 py-1.5 font-semibold text-slate-950">{memberPosition || "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <ContractPrintContent
          contractInfo={contractInfo}
          cleanedHtml={cleanedHtml}
        />

        <section className="mt-8 page-break-inside-avoid">
          <p className="mb-3 text-center font-bold">
            Энэхүү гэрээг уншиж танилцан, бүх нөхцөлийг бүрэн ойлгосны үндсэн дээр эрх бүхий этгээдүүд гарын үсэг зурж, тамгаар баталгаажуулав.
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <SignaturePanel
              title="ХОЛБОО"
              subtitle="Монгол эзэнтэй ЖДБ эрхлэгчдийн нэгдсэн холбоо"
              signature={contractInfo.adminSignature}
              stamp={contractInfo.adminStamp}
              name={contractInfo.adminName || ""}
              position={contractInfo.adminTitle || ""}
              today={today}
            />
            <SignaturePanel
              title="ГИШҮҮН"
              subtitle={memberData.name || "Байгууллагын нэр"}
              signature={contractInfo.memberSignature}
              name={memberData.director || ""}
              position={memberPosition}
              today={today}
            />
          </div>
          <p className="mt-5 text-center text-[11px] italic text-slate-500">
            Энэхүү гэрээг 2 хувь үйлдэж, тус бүр нэг хувийг тал бүр хадгална.
          </p>
        </section>
      </article>
    </main>
  );
}

function ContractPrintContent({
  contractInfo,
  cleanedHtml,
}: {
  contractInfo: ContractInfo;
  cleanedHtml: string;
}) {
  if (contractInfo.contentIsHtml && cleanedHtml) {
    return (
      <section
        className="contract-print-content mt-6 text-justify
          [&_h2]:mt-5 [&_h2]:border-b [&_h2]:border-slate-300 [&_h2]:pb-1 [&_h2]:text-[13px] [&_h2]:font-black [&_h2]:uppercase [&_h2]:tracking-[0.06em]
          [&_h3]:mt-4 [&_h3]:text-[12px] [&_h3]:font-black
          [&_p]:my-2 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse
          [&_td]:border [&_td]:border-slate-300 [&_td]:px-2 [&_td]:py-1.5
          [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1.5 [&_th]:font-black
          [&_ol]:my-2 [&_ol]:pl-5 [&_ul]:my-2 [&_ul]:pl-5 [&_li]:my-1"
        dangerouslySetInnerHTML={{ __html: cleanedHtml }}
      />
    );
  }

  return (
    <section className="mt-6 whitespace-pre-wrap text-justify">
      {contractInfo.contractContent || DEFAULT_CONTRACT_TEXT}
    </section>
  );
}

function SignaturePanel({
  title,
  subtitle,
  signature,
  stamp,
  name,
  position,
  today,
}: {
  title: string;
  subtitle: string;
  signature?: string;
  stamp?: string;
  name: string;
  position: string;
  today: string;
}) {
  return (
    <div className="relative rounded-xl border border-slate-300 p-4 text-center">
      {stamp && (
        <img
          src={stamp}
          alt="Тамга"
          className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rotate-[-5deg] object-contain opacity-70 mix-blend-multiply"
        />
      )}
      <div className="text-[13px] font-black text-slate-950">{title}</div>
      <div className="mt-1 min-h-[32px] text-[11px] font-semibold text-slate-600">{subtitle}</div>
      <div className="relative mt-5 flex h-20 items-end justify-center border-b-2 border-slate-900">
        {signature && <img src={signature} alt="Гарын үсэг" className="max-h-20 max-w-full object-contain mix-blend-multiply" />}
      </div>
      <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">Гарын үсэг</div>
      <div className="mt-4 border-b-2 border-slate-900 pb-1 font-bold">{name || " "}</div>
      <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">Овог нэр</div>
      <div className="mt-4 border-b-2 border-slate-900 pb-1 font-bold">{position || " "}</div>
      <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">Албан тушаал</div>
      <div className="mt-4 border-b-2 border-slate-900 pb-1 font-bold">{today || " "}</div>
      <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">Огноо</div>
    </div>
  );
}

function ContractFeePlanSelect({
  value,
  plans,
  isPaid,
  onChange,
}: {
  value: string;
  plans: { key: string; label: string; sublabel?: string; price?: number }[];
  isPaid?: boolean;
  onChange: (value: string) => void;
}) {
  const selected = plans.find((plan) => plan.key === value);
  const selectedText = selected
    ? `${selected.label || "Төлбөр"}${selected.sublabel ? ` — ${selected.sublabel}` : ""}${isPaid && selected.price ? ` — ${Number(selected.price).toLocaleString()}₮` : ""}`
    : "Хугацаа сонгох";

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Гэрээний хугацаа сонгох"
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      >
        {plans.map((plan) => (
          <option key={plan.key} value={plan.key}>
            {plan.label || "Төлбөр"}
            {plan.sublabel ? ` — ${plan.sublabel}` : ""}
            {isPaid && plan.price ? ` — ${Number(plan.price).toLocaleString()}₮` : ""}
          </option>
        ))}
      </select>

      <div className="flex min-h-[64px] items-center justify-between gap-3 rounded-xl border-2 border-orange-300 bg-orange-50 px-3 py-2 shadow-sm transition peer-focus-within:border-orange-500 peer-focus-within:ring-4 peer-focus-within:ring-orange-100 peer-hover:border-orange-500">
        <div className="min-w-0">
          <div className="mb-1 inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-orange-700 ring-1 ring-orange-200">
            Сонгох
          </div>
          <div className="truncate text-sm font-black text-slate-950">
            {selectedText}
          </div>
          <div className="mt-0.5 text-[11px] font-bold text-orange-700">
            Дарж гэрээний хугацаагаа сонгоно уу
          </div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white shadow-md shadow-orange-200">
          <ChevronDown className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function ContractSignPage() {
  const { user, loading: authLoading, login, register, authFetch } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const isPrintMode = searchParams?.get("print") === "1";
  const contractId = (params?.id as string) || "";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [today, setToday] = useState("");

  const [step, setStep] = useState<"fill" | "qpay" | "success">("fill");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [isContractLoading, setIsContractLoading] = useState(true);
  const [contractError, setContractError] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [memberPosition, setMemberPosition] = useState("");
  const [memberStamp, setMemberStamp] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const stampInputRef = useRef<HTMLInputElement>(null);

  // QPay
  const [qpayData, setQpayData] = useState<{ invoiceId: string; qrImage: string; qrText: string; urls: any[]; amount: number } | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [selectedFeePlan, setSelectedFeePlan] = useState("6m");

  const DEFAULT_FEE_PLANS = [
    { key: "6m", label: "6 сар", sublabel: "Хагас жил", price: 1_800_000 },
    { key: "12m", label: "12 сар", sublabel: "Бүтэн жил", price: 3_000_000 },
  ];
  const FEE_PLANS = (() => {
    const stored: any[] = contractInfo?.headerData?.feePlans ?? [];
    if (stored.length > 0) return stored;
    return DEFAULT_FEE_PLANS;
  })();

  const DEFAULT_MEMBER_FIELDS = [
    { key: "name", label: "Байгууллагын нэр:", required: true, enabled: true },
    { key: "register", label: "Байгууллагын регистр", required: true, enabled: true },
    { key: "field", label: "Үйл ажиллагааны чиглэл:", required: false, enabled: true },
    { key: "address", label: "Хаяг:", required: false, enabled: true },
    { key: "phone", label: "Утас:", required: true, enabled: true },
    { key: "email", label: "И-мэйл:", required: false, enabled: true },
    { key: "website", label: "Вэбсайт:", required: false, enabled: true },
    { key: "director", label: "Нэр:", required: true, enabled: true },
  ];
  const MEMBER_FIELDS = contractInfo?.headerData?.memberFields ?? DEFAULT_MEMBER_FIELDS;

  const [memberData, setMemberData] = useState<Record<string, string>>({
    name: "", register: "", field: "", address: "", phone: "", email: "", website: "", director: ""
  });

  useEffect(() => {
    if (!user || isPrintMode) return;
    setMemberData((prev) => ({
      ...prev,
      phone: prev.phone || user.phone || "",
      email: prev.email || user.email || "",
      director: prev.director || user.fullName || "",
    }));
  }, [user, isPrintMode]);

  useEffect(() => {
    setToday(new Date().toLocaleDateString("mn-MN"));
    setIsContractLoading(true);
    setContractError(null);
    fetch(`${API}/contracts/${contractId}`)
      .then(async r => {
        const data = await r.json().catch(() => null);
        if (!r.ok || !data?.success) {
          throw new Error(data?.error || "Гэрээ олдсонгүй");
        }
        return data;
      })
      .then(d => {
        if (d.success) {
          setContractInfo({
            isPaid: d.contract.isPaid,
            feePlan: d.contract.feePlan,
            adminSignature: d.contract.adminSignature,
            adminName: d.contract.adminName,
            adminTitle: d.contract.adminTitle,
            adminStamp: d.contract.adminStamp,
            isTemplate: d.contract.isTemplate,
            memberSignature: d.contract.memberSignature,
            headerData: d.contract.headerData ?? null,
            contractContent: (d.contract.headerData as any)?.content || null,
            contentIsHtml: (d.contract.headerData as any)?.contentIsHtml || false,
            orgContact: (d.contract.headerData as any)?.orgContact || null,
          });
          const selectedPlanFromContract = isPrintMode
            ? d.contract.feePlan || d.contract.headerData?.defaultFeePlan || "6m"
            : d.contract.headerData?.defaultFeePlan || d.contract.feePlan || "6m";

          setSelectedFeePlan(selectedPlanFromContract);
          // In print mode: pre-fill memberData from stored JSON
          if (isPrintMode && d.contract.memberData) {
            const md = d.contract.memberData as any;
            setMemberData({
              name: md.name || "",
              register: md.register || "",
              field: md.field || "",
              address: md.address || "",
              phone: md.phone || "",
              email: md.email || "",
              website: md.website || "",
              director: md.director || "",
            });
            if (md.position) setMemberPosition(md.position);
            if (md.stamp) setMemberStamp(md.stamp);
          }
          if (d.contract.status === "SIGNED" && !isPrintMode) {
            setStep("success");
          }
          // auto-print after data is ready
          if (isPrintMode) {
            setTimeout(() => window.print(), 2500);
          }
        }
      })
      .catch((error) => {
        setContractError(error instanceof Error ? error.message : "Гэрээ ачаалахад алдаа гарлаа");
      })
      .finally(() => setIsContractLoading(false));
  }, [contractId, isPrintMode]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e3a5f";
    const { x, y } = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.closePath();
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setIsSubmitting(true);
    try {
      if (contractInfo?.isPaid && !contractInfo?.headerData?.systemQr?.enabled) {
        alert("Энэ гэрээний Minu төлбөрийн данс тохируулагдаагүй байна. Admin дээр гэрээний template дээр Minu дансаа сонгоод шинэ link үүсгэнэ үү.");
        return;
      }

      const signature = canvasRef.current?.toDataURL("image/png") || "";
      const payload = {
        memberData: { ...memberData, position: memberPosition, stamp: memberStamp },
        memberSignature: signature,
        feePlan: selectedFeePlan,
      };

      // Template → POST /submit (creates a new submission record)
      // Legacy contract → POST /sign (updates existing record)
      const endpoint = contractInfo?.isTemplate
        ? `${API}/contracts/${contractId}/submit`
        : `${API}/contracts/${contractId}/sign`;

      const signRes = await authFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const signData = await signRes.json();
      if (signRes.status === 401) {
        setAuthOpen(true);
        throw new Error(signData?.error || signData?.message || "Гэрээ хийхийн тулд нэвтэрнэ үү");
      }
      if (!signData.success) throw new Error(signData.error);

      // For template submissions: use the new submissionId for Minu/SystemQR.
      const activeId = signData.submissionId || contractId;
      setSubmissionId(activeId);

      if (contractInfo?.isPaid) {
        const res = await fetch(`${API}/contracts/${activeId}/systemqr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (data.success) {
          setQpayData({ invoiceId: data.invoiceId, qrImage: data.qrImage, qrText: data.qrText, urls: data.urls || [], amount: data.amount });
          setStep("qpay");
        } else {
          alert("Төлбөрийн invoice үүсгэхэд алдаа: " + (data.error || ""));
        }
      } else {
        setStep("success");
      }
    } catch (error) { alert(error instanceof Error ? error.message : "Алдаа гарлаа. Дахин оролдоно уу."); }
    finally { setIsSubmitting(false); }
  };

  const [pollCountdown, setPollCountdown] = useState(5);

  // Auto-poll Minu/SystemQR payment status every 5 seconds.
  useEffect(() => {
    if (step !== "qpay" || !qpayData) return;

    let countdown = 5;
    setPollCountdown(5);

    const checkUrl = `${API}/contracts/${submissionId || contractId}/systemqr/check`;

    const tick = setInterval(() => {
      countdown -= 1;
      setPollCountdown(countdown);

      if (countdown <= 0) {
        countdown = 5;
        setPollCountdown(5);
        // silently check payment
        fetch(checkUrl)
          .then(r => r.json())
          .then(data => {
            if (data.isPaid) {
              clearInterval(tick);
              setStep("success");
            }
          })
          .catch(() => { });
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [step, qpayData, contractId, submissionId]);

  const checkPayment = useCallback(async () => {
    if (!qpayData || checkingPayment) return;
    setCheckingPayment(true);
    try {
      const checkUrl = `${API}/contracts/${submissionId || contractId}/systemqr/check`;

      const res = await fetch(checkUrl);
      const data = await res.json();
      if (data.isPaid) setStep("success");
      else alert("Төлбөр бүртгэгдэх хүртэл түр хүлээнэ үү.");
    } catch { alert("Алдаа гарлаа."); }
    finally { setCheckingPayment(false); }
  }, [qpayData, checkingPayment, contractId, submissionId]);

  if (isContractLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm flex items-center gap-3 text-neutral-700">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span>Гэрээ ачаалж байна...</span>
        </div>
      </div>
    );
  }

  if (contractError) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-100 p-8 shadow-sm text-center">
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Гэрээ олдсонгүй</h1>
          <p className="text-sm text-neutral-600 mb-6">{contractError}</p>
          <button
            type="button"
            onClick={() => window.location.href = "/"}
            className="px-5 py-3 rounded-xl bg-[#1e4e8c] text-white font-medium"
          >
            Нүүр хуудас руу буцах
          </button>
        </div>
      </div>
    );
  }

  if (step === "success") {
    const base = process.env.NEXT_PUBLIC_WEB_URL || window.location.origin;
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-neutral-100 p-10 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">Гэрээ баталгаажлаа</h2>
          <p className="text-neutral-500 mb-8">
            Таны гэрээ албан ёсоор баталгаажлаа. Доорх товчийг дарж PDF хэлбэрээр татаж авна уу.
          </p>
          <button
            onClick={() => window.open(`${base}/contract/sign/${submissionId || contractId}?print=1`, "_blank")}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 mb-3"
          >
            <Download className="w-5 h-5" /> Гэрээ PDF татах
          </button>
          <button
            onClick={() => window.location.href = "/"}
            className="w-full px-6 py-3 bg-[#1e4e8c] text-white rounded-xl font-medium hover:bg-blue-800 transition-colors"
          >
            Нүүр хуудас руу буцах
          </button>
        </div>
      </div>
    );
  }

  if (step === "qpay" && qpayData) {
    return (
      <ContractPayment
        qpayData={qpayData}
        pollCountdown={pollCountdown}
        checkingPayment={checkingPayment}
        onCheckPayment={checkPayment}
      />
    );
  }

  if (isPrintMode && contractInfo) {
    return (
      <PrintContractDocument
        contractId={contractId}
        contractInfo={contractInfo}
        memberData={memberData}
        memberPosition={memberPosition}
        selectedFeePlan={selectedFeePlan}
        feePlans={FEE_PLANS}
        memberFields={MEMBER_FIELDS}
        today={today}
      />
    );
  }


  // Step = "fill"
  return (
    <div className="contract-sign-page min-h-screen bg-neutral-100/50 px-3 py-6 sm:px-6 sm:py-10">

      {!isPrintMode && (
        <div className="max-w-[850px] mx-auto mb-5 flex flex-col gap-2 no-print sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-neutral-900 sm:text-2xl">Гэрээ баталгаажуулах</h1>
            <p className="mt-1 text-sm font-semibold leading-6 text-neutral-500">Доорх мэдээллийг бөглөж гэрээг цахимаар байгуулна уу.</p>
          </div>
        </div>
      )}

      {!isPrintMode && !authLoading && !user && (
        <div className="max-w-[850px] mx-auto mb-4 no-print bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-bold text-amber-900 text-sm">Гэрээ хийхийн тулд бүртгэлээр нэвтэрнэ үү</div>
            <div className="text-xs text-amber-700 mt-1">Таны сонгосон гэрээ бүртгэлтэй хэрэглэгчийн нэр дээр хадгалагдана.</div>
          </div>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="px-4 py-2.5 bg-[#1e4e8c] text-white rounded-lg text-sm font-bold hover:bg-blue-800 transition-colors"
          >
            Нэвтрэх / Бүртгүүлэх
          </button>
        </div>
      )}

      <form onSubmit={handleProceedToPayment} className="mx-auto max-w-[850px]">
        {/* A4 Paper container */}
        <div className="contract-paper relative mb-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl sm:mb-6 sm:rounded-sm sm:border-neutral-300">

          <div className="px-4 py-6 text-sm leading-relaxed text-black sm:px-16 sm:py-20">

            {/* HEADER */}
            <div className="text-center text-base font-black leading-snug text-[#1e4e8c] sm:text-lg whitespace-pre-line">
              {contractInfo?.headerData?.title ?? "МОНГОЛ ЭЗЭНТЭЙ ЖИЖИГ ДУНД БИЗНЕС\nЭРХЛЭГЧДИЙН НЭГДСЭН ХОЛБОО"}
              <br />
              <span className="font-normal text-sm italic text-neutral-600">
                {contractInfo?.headerData?.subtitle ?? "Mongolian SME United Association"}
              </span>
            </div>

            <div className="border-b-2 border-[#1e4e8c] my-4 max-w-4xl mx-auto"></div>

            <div className="text-center font-bold text-[#1e4e8c] mb-4 text-base">
              {contractInfo?.headerData?.contractTitle ?? "УДИРДАХ ЗӨВЛӨЛИЙН ГИШҮҮНЧЛЭЛИЙН ГЭРЭЭ"}
            </div>

            <table className="contract-mobile-stack-table mb-6 w-full border-collapse border border-[#b4c6e7] text-sm">
              <tbody>
                <tr>
                  <td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c] w-[150px]">Гэрээний дугаар:</td>
                  <td className="border border-[#b4c6e7] p-2 font-mono font-medium text-neutral-600 bg-amber-50/50">MGL-{contractId.slice(0, 8).toUpperCase()}</td>
                  <td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c] w-[100px]">Огноо:</td>
                  <td className="border border-[#b4c6e7] p-2">{today}</td>
                </tr>
                <tr>
                  <td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c]">Байршил:</td>
                  <td className="border border-[#b4c6e7] p-2">Улаанбаатар хот</td>
                  <td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c]">
                      {contractInfo?.headerData?.hasDuration !== false ? "Гэрээний хугацаа:" : contractInfo?.isPaid ? "Төлбөрийн сонголт:" : "Сонголт:"}
                    </td>

                    <td className="border border-[#b4c6e7] p-0">
                      {contractInfo?.headerData?.hasDuration === false && !contractInfo?.isPaid ? (
                        <span className="block px-2 py-2">—</span>
                      ) : isPrintMode ? (
                        <span className="block px-2 py-2">
                          {FEE_PLANS.find(p => p.key === selectedFeePlan)?.label ?? "—"}
                        </span>
                      ) : (
                        <div className="p-2">
                          <ContractFeePlanSelect
                            value={selectedFeePlan}
                            plans={FEE_PLANS}
                            isPaid={contractInfo?.isPaid}
                            onChange={setSelectedFeePlan}
                          />
                        </div>
                      )}
                    </td>
                </tr>
              </tbody>
            </table>

            <div className="text-center font-bold text-[#1e4e8c] mb-2">
              НЭГ. ТАЛУУДЫН МЭДЭЭЛЭЛ
            </div>
            <div className="border-b-2 border-[#1e4e8c] w-full max-w-xs mx-auto mb-4"></div>

            <p className="text-sm mb-4 text-justify font-serif">
              Энэхүү гэрээг нэг талаас Монгол эзэнтэй жижиг дунд бизнес эрхлэгчдийн нэгдсэн холбоо (цаашид "Холбоо" гэх) болон нөгөө талаас доор дурдсан байгууллага (цаашид "Гишүүн" гэх) хооронд байгуулав.
            </p>

            <OrgInfoTable data={contractInfo?.orgContact} />

            <div className="font-medium mb-2 text-[#c00000]">1.2 Гишүүн байгууллагын мэдээлэл</div>
            <table className="contract-mobile-stack-table mb-8 w-full border-collapse border border-[#b4c6e7] text-sm">
              <tbody>
                {MEMBER_FIELDS.filter((f: any) => f.enabled).map((field: any) => (
                  <tr key={field.key}>
                    <td className="border border-[#b4c6e7] p-2 bg-[#f8f9fc] font-bold text-[#1e4e8c] w-1/3">{field.label}</td>
                    <td className="border border-[#b4c6e7] p-0">
                      {isPrintMode ? (
                        <div className="w-full p-2 text-blue-900 min-h-[36px]">{memberData[field.key as keyof typeof memberData]}</div>
                      ) : (
                        <input
                          required={field.required}
                          type="text"
                          value={memberData[field.key as keyof typeof memberData]}
                          onChange={e => setMemberData({ ...memberData, [field.key]: e.target.value })}
                          className="w-full p-2 border-0 outline-none bg-blue-50/30 focus:bg-white text-blue-900 placeholder:text-blue-300"
                          placeholder="Бичих..."
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {contractInfo?.contentIsHtml && contractInfo?.contractContent ? (
              <div
                className="mb-12 contract-html-content
                  [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-neutral-300 [&_td]:p-2 [&_th]:border [&_th]:border-neutral-300 [&_th]:p-2 [&_th]:bg-neutral-100"
                dangerouslySetInnerHTML={{ __html: contractInfo.contractContent }}
              />
            ) : (
              <div className="whitespace-pre-wrap mb-12">
                {contractInfo?.contractContent || DEFAULT_CONTRACT_TEXT}
              </div>
            )}

            {/* TABLE BASED SIGNATURE BLOCK JUST LIKE IN THE MOCKUP */}
            <div className="page-break-inside-avoid overflow-hidden rounded-xl border border-[#b4c6e7]">
              <table className="contract-signature-table w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-[#b4c6e7] bg-[#f8f9fc] p-4 text-center w-1/2 align-top">
                      <div className="text-[#1e4e8c] font-bold text-base mb-1">ХОЛБОО</div>
                      <div className="text-[#c00000] font-normal">Монгол эзэнтэй ЖДБ эрхлэгчдийн<br />нэгдсэн холбоо</div>
                    </th>
                    <th className="border border-[#b4c6e7] bg-[#f8f9fc] p-4 text-center w-1/2 align-top">
                      <div className="text-[#1e4e8c] font-bold text-base mb-1">ГИШҮҮН</div>
                      <div className="text-[#1e4e8c] font-normal">Байгууллагын нэр:</div>
                      <div className="border-b border-[#1e4e8c] w-3/4 mx-auto mt-2 h-4 text-neutral-800">{memberData.name}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-[#b4c6e7] p-4 bg-[#f8f9fc] align-top relative overflow-visible">
                      {/* Stamp overlaid over entire ХОЛБОО column */}
                      {contractInfo?.adminStamp && (
                        <img
                          src={contractInfo.adminStamp}
                          alt="Тамга"
                          className="absolute object-contain mix-blend-multiply pointer-events-none z-10"
                          style={{
                            width: 180,
                            height: 180,
                            top: "30%",
                            left: "50%",
                            transform: "translate(-50%, -30%) rotate(-4deg)",
                            opacity: 0.85,
                          }}
                        />
                      )}

                      <div className="border-b-2 border-[#1e4e8c] h-16 mb-1 relative flex items-end justify-center">
                        {contractInfo?.adminSignature
                          ? <img src={contractInfo.adminSignature} alt="Гарын үсэг" className="h-14 max-w-full object-contain mix-blend-multiply" />
                          : <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Signature_of_John_Hancock.svg" alt="" className="h-12 opacity-30 mix-blend-multiply" />
                        }
                      </div>
                      <span className="text-[#c00000] font-normal text-xs">Гарын үсэг / Албан тушаал</span>

                      <div className="border-b-2 border-[#1e4e8c] h-8 mb-1 mt-4 relative flex items-end justify-center">
                        <span className="text-sm font-medium text-neutral-800">{contractInfo?.adminName || ""}</span>
                      </div>
                      <span className="text-neutral-500 font-normal text-xs">Овог нэр</span>

                      <div className="border-b-2 border-[#1e4e8c] h-8 mb-1 mt-4 relative flex items-end justify-center">
                        <span className="text-sm font-medium text-[#c00000]">{contractInfo?.adminTitle || ""}</span>
                      </div>
                      <span className="text-neutral-500 font-normal text-xs">Албан тушаал</span>

                      <div className="border-b-2 border-[#1e4e8c] h-8 mb-1 mt-4 relative flex items-end justify-center">
                        <span className="text-sm font-medium text-neutral-800">{today}</span>
                      </div>
                      <span className="text-[#c00000] font-normal text-xs">Огноо (он/сар/өдөр)</span>
                    </td>

                    <td className="border border-[#b4c6e7] p-4 bg-[#f8f9fc] align-top relative group">
                      <div className="relative mb-1">
                        {isPrintMode ? (
                          <div className="border-b-2 border-[#1e4e8c] h-[140px] flex items-end justify-center">
                            {contractInfo?.memberSignature && (
                              <img src={contractInfo.memberSignature} alt="Гарын үсэг" className="h-[130px] max-w-full object-contain mix-blend-multiply" />
                            )}
                          </div>
                        ) : (
                        <div className="border-2 border-dashed border-[#1e4e8c]/40 rounded-lg bg-blue-50/30 relative" style={{ height: 140 }}>
                          <canvas
                            ref={canvasRef}
                            width={600}
                            height={140}
                            className="absolute inset-0 w-full h-full touch-none"
                            style={{ cursor: "crosshair" }}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={endDrawing}
                            onMouseLeave={endDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={endDrawing}
                          />
                          {!isDrawing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-blue-300/70 pointer-events-none select-none">
                              <PenTool className="w-6 h-6" />
                              <span className="text-xs">Энд гарын үсэг зурна уу</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={clearSignature}
                            className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-500 hover:text-red-500 hover:border-red-200 transition-colors z-10 shadow-sm"
                          >
                            <Eraser className="w-3 h-3" /> Арилгах
                          </button>
                        </div>
                        )}
                      </div>
                      <span className="text-[#c00000] font-normal text-xs">Гарын үсэг / Албан тушаал</span>

                      <div className="border-b-2 border-[#1e4e8c] h-8 mb-1 mt-4 flex items-end">
                        <div className="w-full text-center text-neutral-800 font-medium text-sm">{memberData.director}</div>
                      </div>
                      <span className="text-neutral-500 font-normal text-xs">Овог нэр</span>

                      <div className="border-b-2 border-[#1e4e8c] h-8 mb-1 mt-4 flex items-end justify-center">
                        {isPrintMode ? (
                          <span className="text-sm font-medium text-neutral-800">{memberPosition}</span>
                        ) : (
                          <input
                            type="text"
                            value={memberPosition}
                            onChange={e => setMemberPosition(e.target.value)}
                            placeholder="Албан тушаал бичих..."
                            className="w-full h-full bg-transparent border-none focus:ring-0 text-center text-sm text-neutral-800 p-0"
                          />
                        )}
                      </div>
                      <span className="text-neutral-500 font-normal text-xs">Албан тушаал</span>

                      {/* Member stamp upload — TEMPORARILY DISABLED
                      <div className="mt-4">
                        <input
                          ref={stampInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = ev => setMemberStamp(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }}
                        />
                        <div
                          onClick={() => stampInputRef.current?.click()}
                          className="border-2 border-dashed border-[#1e4e8c]/30 rounded-lg bg-neutral-50 h-16 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50/30 transition-colors relative"
                        >
                          {memberStamp ? (
                            <>
                              <img src={memberStamp} alt="Тамга" className="h-14 max-w-full object-contain mix-blend-multiply" />
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setMemberStamp(null); }}
                                className="absolute top-1 right-1 text-xs px-1.5 py-0.5 bg-white border border-neutral-200 rounded text-neutral-400 hover:text-red-400"
                              >✕</button>
                            </>
                          ) : (
                            <span className="text-xs text-neutral-400">Тамга зургийг upload хийх</span>
                          )}
                        </div>
                      </div>
                      */}
                      <div className="border-b-2 border-[#1e4e8c] h-8 mb-1 mt-4"></div>
                      <span className="text-[#c00000] font-normal text-xs">Тамга</span>

                      <div className="border-b-2 border-[#1e4e8c] h-8 mb-1 mt-4 relative flex items-end justify-center">
                        <span className="text-sm font-medium text-neutral-800">{today}</span>
                      </div>
                      <span className="text-[#c00000] font-normal text-xs">Огноо (он/сар/өдөр)</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-center text-sm mt-6 text-[#c00000] italic font-medium">
              Энэхүү гэрээг 2 хувь үйлдэж, тус бүр нэг хувийг тал бүр хадгална.
            </div>

          </div>
        </div>

        {/* Fee plan selector (shown only when contract is paid) */}
{/*         {contractInfo?.isPaid && (
          <div className="no-print bg-white rounded-xl shadow-lg border border-neutral-200 p-5 mb-3">
            <div className="font-semibold text-neutral-800 mb-3">Хөрөнгө оруулалтын сонголт <span className="text-red-500">*</span></div>
            <div className="grid grid-cols-2 gap-3">
              {FEE_PLANS.map(p => (
                <button key={p.key} type="button" onClick={() => setSelectedFeePlan(p.key)}
                  className={`flex flex-col items-center p-4 border-2 rounded-xl text-sm transition-colors ${selectedFeePlan === p.key ? "border-blue-500 bg-blue-50 text-blue-700" : "border-neutral-200 hover:border-neutral-300"}`}>
                  <span className="font-bold text-base">{p.label}</span>
                  <span className="font-semibold mt-1">{p.price.toLocaleString()}₮</span>
                </button>
              ))}
            </div>
          </div>
        )}
 */}
        {/* Action Bar */}
        {!isPrintMode && (
          <div className="no-print bg-white rounded-xl shadow-lg border border-neutral-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <label className="flex items-start gap-3 cursor-pointer group flex-1">
              <div className="flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <div className="text-sm text-neutral-600 group-hover:text-neutral-900 transition-colors leading-relaxed">
                Би дээрх гэрээний нөхцөлүүдийг уншиж танилцсан бөгөөд бүрэн хүлээн зөвшөөрч цахим гарын үсэг зурж баталгаажуулж байна.
              </div>
            </label>

            <div className="flex flex-col items-end gap-2">
              {(!memberData.director || !memberPosition) && (
                <p className="text-xs text-amber-600 font-medium">
                  {!memberData.director ? "Овог нэр оруулна уу · " : ""}
                  {!memberPosition ? "Албан тушаал оруулна уу" : ""}
                </p>
              )}
              <button
                type="submit"
                disabled={!agreed || isSubmitting || authLoading || !memberData.name || !memberData.register || !memberData.director || !memberPosition}
                className="w-full md:w-auto px-8 py-3.5 bg-[#1e4e8c] text-white rounded-xl font-medium hover:bg-blue-800 focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Уншиж байна...</>
                ) : !user ? (
                  <><CheckCircle2 className="w-5 h-5" /> Нэвтэрч үргэлжлүүлэх</>
                ) : (
                  <><CheckCircle2 className="w-5 h-5" /> Дараагийн</>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
      {authOpen && (
        <LoginModal
          open={authOpen}
          onClose={() => { setAuthOpen(false); setAuthError(""); }}
          onLogin={async (identifier, password, options) => {
            setAuthError("");
            setAuthBusy(true);
            try {
              const result = await login(identifier, password, options);
              if (result?.requiresEmailOtp) return result;
              setAuthOpen(false);
            } catch (err: unknown) {
              setAuthError(err instanceof Error ? err.message : "Нэвтрэхэд алдаа гарлаа.");
            } finally {
              setAuthBusy(false);
            }
          }}
          onRegister={async (fullName, identifier, password, options) => {
            setAuthError("");
            setAuthBusy(true);
            try {
              await register(fullName, identifier, password, options);
              setAuthOpen(false);
            } catch (err: unknown) {
              setAuthError(err instanceof Error ? err.message : "Бүртгүүлэхэд алдаа гарлаа.");
            } finally {
              setAuthBusy(false);
            }
          }}
          isLoading={authBusy}
          error={authError}
        />
      )}
    </div>
  );
}
