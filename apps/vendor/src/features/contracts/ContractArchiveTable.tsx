import {
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  Mail,
  Phone,
} from "lucide-react";
import { daysUntil, formatContractDate } from "./contract-utils";
import type { ArchivedContract } from "./types";

function ExpiryStatus({ value }: { value: string | null }) {
  const days = daysUntil(value);
  if (days === null) return <span className="text-slate-400">Хугацаагүй</span>;
  const tone =
    days < 0
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : days <= 30
        ? "bg-orange-50 text-orange-700 ring-orange-200"
        : "bg-emerald-50 text-emerald-700 ring-emerald-200";
  const label =
    days < 0
      ? `${Math.abs(days)} хоног хэтэрсэн`
      : days === 0
        ? "Өнөөдөр дуусна"
        : `${days} хоног үлдсэн`;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${tone}`}>
      {label}
    </span>
  );
}

export function ContractArchiveTable({
  contracts,
  loading,
  onSelect,
}: {
  contracts: ArchivedContract[];
  loading: boolean;
  onSelect: (contract: ArchivedContract) => void;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
        <p className="mt-4 text-sm font-semibold text-slate-500">Гэрээнүүдийг уншиж байна...</p>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <FileText className="mx-auto h-10 w-10 text-slate-300" />
        <h2 className="mt-4 text-base font-black text-slate-800">Гэрээ олдсонгүй</h2>
        <p className="mt-1 text-sm text-slate-500">Шүүлтээ цэвэрлэх эсвэл шинэ скан гэрээ бүртгэнэ үү.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-4 font-black">Гэрээ</th>
              <th className="px-5 py-4 font-black">Харилцагч</th>
              <th className="px-5 py-4 font-black">Байгуулсан огноо</th>
              <th className="px-5 py-4 font-black">Хугацаа</th>
              <th className="px-5 py-4 text-right font-black">Файл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contracts.map((contract) => (
              <tr
                key={contract.id}
                className="cursor-pointer transition hover:bg-blue-50/50"
                onClick={() => onSelect(contract)}
              >
                <td className="px-5 py-4">
                  <p className="font-black text-slate-900">{contract.contractName || "Нэргүй гэрээ"}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {contract.contractNumber || `#${contract.id.slice(0, 8).toUpperCase()}`}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <p className="font-bold text-slate-800">{contract.org}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    {contract.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{contract.phone}</span>}
                    {contract.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{contract.email}</span>}
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-600">
                  <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" />{formatContractDate(contract.signedAt)}</span>
                </td>
                <td className="px-5 py-4">
                  <ExpiryStatus value={contract.expiresAt} />
                  <p className="mt-1.5 text-xs text-slate-400">{formatContractDate(contract.expiresAt)}</p>
                </td>
                <td className="px-5 py-4 text-right">
                  {contract.pdfUrl ? (
                    <a
                      href={contract.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Нээх
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Download className="h-3.5 w-3.5" /> Файлгүй</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
