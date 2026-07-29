import { ExternalLink, X } from "lucide-react";
import type { ArchivedContract } from "./types";
import { formatContractDate } from "./contract-utils";

export function ContractDetailModal({
  contract,
  onClose,
}: {
  contract: ArchivedContract;
  onClose: () => void;
}) {
  const details = [
    ["Гэрээний дугаар", contract.contractNumber],
    ["Харилцагч байгууллага", contract.org],
    ["Регистр", contract.register],
    ["Төлөөлөгч", contract.director],
    ["Албан тушаал", contract.position],
    ["Утас", contract.phone],
    ["И-мэйл", contract.email],
    ["Байгуулсан огноо", formatContractDate(contract.signedAt, "long")],
    ["Дуусах огноо", formatContractDate(contract.expiresAt, "long")],
    ...contract.customFields.map((field) => [
      field.label,
      field.type === "date" ? formatContractDate(field.value, "long") : field.value,
    ]),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="contract-detail-title">
      <section className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Гэрээний мэдээлэл</p>
            <h2 id="contract-detail-title" className="mt-2 text-2xl font-black text-slate-950">{contract.contractName || "Нэргүй гэрээ"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Хаах" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>
        <dl className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-1 text-sm font-bold text-slate-800">{value || "—"}</dd>
            </div>
          ))}
        </dl>
        <footer className="flex justify-end gap-3 border-t border-slate-200 p-5">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Хаах</button>
          {contract.pdfUrl && (
            <a href={contract.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white hover:bg-blue-800">
              Эх файл нээх <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </footer>
      </section>
    </div>
  );
}
