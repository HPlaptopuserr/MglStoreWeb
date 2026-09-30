"use client";
import { Building2, ChevronDown } from "lucide-react";
export type PosRegisterOption = {
  id: string;
  name: string;
  label?: string | null;
  branchId: string;
  branch: { id: string; name: string };
};
interface Props {
registers: PosRegisterOption[];
selectedRegisterId: string;
setSelectedRegisterId: (value: string) => void;
supplierName: string;
setSupplierName: (value: string) => void;
supplierRegisterNo: string;
setSupplierRegisterNo: (value: string) => void;
documentNo: string;
setDocumentNo: (value: string) => void;
note: string;
setNote: (value: string) => void;
}
export function ReceiptSourceFields({registers, selectedRegisterId, setSelectedRegisterId, supplierName, setSupplierName, supplierRegisterNo, setSupplierRegisterNo, documentNo, setDocumentNo, note, setNote}: Props) {
return (
            <section className="border-b border-slate-200 bg-white p-4 sm:p-6">
              <div className="mb-5 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-cyan-600" />
                <h2 className="text-base font-black text-slate-950">
                  Баримтын мэдээлэл
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Хүлээн авагч · Салбар / касс
                  </span>
                  <div className="relative">
                    <select
                      value={selectedRegisterId}
                      onChange={(event) =>
                        setSelectedRegisterId(event.target.value)
                      }
                      className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    >
                      {registers.map((register) => (
                        <option key={register.id} value={register.id}>
                          {register.branch.name} ·{" "}
                          {register.label || register.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Нийлүүлэгч · Байгууллага{" "}
                    <span className="text-rose-500">*</span>
                  </span>
                  <input
                    value={supplierName}
                    maxLength={160}
                    onChange={(event) => setSupplierName(event.target.value)}
                    placeholder="Жишээ: Нийлүүлэгч ХХК"
                    className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>
              </div>
              <details open className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-600">Баримт, регистр, тэмдэглэл · Заавал биш</summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Регистр / ТТД
                  </span>
                  <input
                    value={supplierRegisterNo}
                    maxLength={32}
                    onChange={(event) =>
                      setSupplierRegisterNo(event.target.value)
                    }
                    placeholder="Заавал биш"
                    className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Падаан / баримтын №
                  </span>
                  <input
                    value={documentNo}
                    maxLength={80}
                    onChange={(event) => setDocumentNo(event.target.value)}
                    placeholder="Заавал биш"
                    className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>
              </div>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Тэмдэглэл
                </span>
                <textarea
                  value={note}
                  maxLength={500}
                  rows={2}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Жолооч, хүргэлт эсвэл бусад тайлбар"
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
              </details>
              <p className="mt-2 text-xs text-slate-500">
                Нийлүүлэгч системд бүртгэлтэй байх шаардлагагүй. Ямар ч
                байгууллагын нэрийг шууд оруулж болно.
              </p>
            </section>
);
}
