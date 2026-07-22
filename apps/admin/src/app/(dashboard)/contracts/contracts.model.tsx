import { Building2, FileText } from "lucide-react";

export type Submission = {
  id: string;
  templateId: string;
  org: string;
  register: string | null;
  phone: string | null;
  email: string | null;
  status: "SIGNED" | "PENDING";
  isPaid: boolean;
  feePlan: string | null;
  feePlanLabel: string;
  signedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  memberData: any;
  headerData: any;
  pdfUrl: string | null;
  contractNumber: string | null;
  contractName: string | null;
};

export type SortKey = "org" | "status" | "signedAt" | "expiresAt" | "createdAt";

export function getContractDisplayName(sub: Submission) {
  return (
    sub.contractName ||
    sub.headerData?.contractTitle ||
    sub.headerData?.title ||
    "Нэргүй гэрээ"
  );
}

export function getContractCode(sub: Submission) {
  return sub.contractNumber || `MGL-${sub.id.slice(0, 8).toUpperCase()}`;
}

export function ContractNameCell({ sub }: { sub: Submission }) {
  return (
    <div className="min-w-[260px] max-w-[360px]">
      <div className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
        <FileText className="h-3 w-3 shrink-0" />
        <span className="truncate">{getContractCode(sub)}</span>
      </div>
      <div className="line-clamp-2 text-[15px] font-black leading-snug text-slate-950 transition-colors group-hover:text-blue-700">
        {getContractDisplayName(sub)}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
        <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate">{sub.org}</span>
      </div>
    </div>
  );
}

export function statusDays(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

export function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="text-slate-400 text-xs">—</span>;
  const days = statusDays(expiresAt);
  if (days === null) return <span className="text-slate-400 text-xs">—</span>;
  const date = new Date(expiresAt).toLocaleDateString("mn-MN");

  if (days < 0) {
    return (
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-rose-600">{date}</span>
        <span className="text-[10px] font-medium text-rose-500 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 w-max mt-0.5">
          Хугацаа дууссан
        </span>
      </div>
    );
  }
  if (days <= 30) {
    return (
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-amber-600">{date}</span>
        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 w-max mt-0.5">
          {days} өдөр үлдсэн
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-700 font-medium">{date}</span>
      <span className="text-[10px] text-slate-400 mt-0.5">
        {days} өдөр үлдсэн
      </span>
    </div>
  );
}
