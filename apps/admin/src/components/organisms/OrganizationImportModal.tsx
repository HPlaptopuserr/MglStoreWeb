"use client";

import { useState, useRef } from "react";
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Building2,
  ExternalLink,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";

/* ─── Types ──────────────────────────────────────────────────────────── */
interface ImportedOrg {
  id: string;
  name: string;
  email: string;
  inviteLink: string;
}

interface ImportError {
  row: number;
  name: string;
  reason: string;
}

interface ImportResult {
  message: string;
  total: number;
  created: number;
  skipped: number;
  errors: ImportError[];
  organizations: ImportedOrg[];
}

type Step = "upload" | "importing" | "results";

/* ─── Main Component ─────────────────────────────────────────────────── */
export function OrganizationImportModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Template download ── */
  const downloadTemplate = async () => {
    try {
      const res = await adminFetch(`${API}/admin/organizations/import-template`);
      if (!res.ok) throw new Error("Татахад алдаа гарлаа");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "organization_import_template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Template татахад алдаа гарлаа");
    }
  };

  /* ── File selection ── */
  const handleFile = (file: File) => {
    const ext = file.name.toLowerCase();
    const validExt = ext.endsWith(".xlsx") || ext.endsWith(".xls") || ext.endsWith(".ods") || ext.endsWith(".csv");
    if (!validExt) {
      setError("Зөвхөн .xlsx, .xls, .ods файл оруулна уу");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Файлын хэмжээ 10MB-аас хэтэрсэн байна");
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  /* ── Upload & import ── */
  const startImport = async () => {
    if (!selectedFile) return;
    setStep("importing");
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await adminFetch(`${API}/admin/organizations/import`, {
        method: "POST",
        body: formData,
      });
      const data: ImportResult = await res.json();
      if (!res.ok) {
        setError(data.message || "Алдаа гарлаа");
        setStep("upload");
        return;
      }
      setResult(data);
      setStep("results");
      if (data.created > 0) onSuccess();
    } catch {
      setError("Сүлжээний алдаа гарлаа");
      setStep("upload");
    }
  };

  /* ── Reset ── */
  const resetImport = () => {
    setStep("upload");
    setSelectedFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
              <FileSpreadsheet size={22} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Excel-ээс байгууллага импорт</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {step === "upload" && "Файлаа оруулна уу (.xlsx, .xls, .ods)"}
                {step === "importing" && "Файл боловсруулж байна..."}
                {step === "results" && "Импортын үр дүн"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {/* ── Step 1: Upload ── */}
          {step === "upload" && (
            <div className="space-y-5">
              {/* Template download */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100">
                <div className="flex items-center gap-3">
                  <Download size={18} className="text-indigo-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Загвар файл татах</p>
                    <p className="text-xs text-slate-500 mt-0.5">Баганы бүтэц, жишээ өгөгдлийг харна уу</p>
                  </div>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 h-9 px-4 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
                >
                  <Download size={14} />
                  .xlsx
                </button>
              </div>

              {/* Column info */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Баганы тайлбар</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    { col: "Овог, нэр", req: false, desc: "Эзэмшигчийн овог нэр" },
                    { col: "Байгууллагын нэр (name)", req: true, desc: "Байгууллагын нэр" },
                    { col: "Байгууллагын регистрийн дугаар", req: false, desc: "Хоосон бол авто үүсгэнэ" },
                    { col: "Байгууллагын төрөл", req: false, desc: "Олон сонголттой" },
                    { col: "Хаяг (аймаг/дүүрэг, хороо)", req: false, desc: "Хаяг байршил" },
                    { col: "Утасны дугаар", req: false, desc: "Утасны дугаар" },
                    { col: "И-мэйл хаяг", req: true, desc: "Эзэмшигчийн email" },
                  ].map(({ col, req, desc }) => (
                    <div key={col} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-700">{col}</code>
                        {req && (
                          <span className="text-[10px] font-bold text-red-400 bg-red-50 px-1.5 py-0.5 rounded">
                            ЗААВАЛ
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                  dragActive
                    ? "border-indigo-400 bg-indigo-50"
                    : selectedFile
                      ? "border-indigo-300 bg-indigo-50/50"
                      : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                }`}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <FileSpreadsheet size={24} className="text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-800">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={() => { setSelectedFile(null); setError(null); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-semibold text-slate-700">Файлаа энд чирж оруулна уу</p>
                    <p className="text-xs text-slate-400 mt-1">эсвэл файл сонгоно уу (.xlsx, .xls, .ods)</p>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="mt-4 inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition-colors"
                    >
                      <Upload size={14} />
                      Файл сонгох
                    </button>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.ods,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
                  <AlertTriangle size={16} className="text-red-500 shrink-0" />
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={onClose}
                  className="h-10 px-5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Болих
                </button>
                <button
                  onClick={startImport}
                  disabled={!selectedFile}
                  className="flex items-center gap-2 h-10 px-7 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Upload size={15} />
                  Импорт эхлүүлэх
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Importing ── */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-800">Импорт хийж байна...</p>
                <p className="text-sm text-slate-500 mt-1">{selectedFile?.name} файлыг боловсруулж байна</p>
              </div>
            </div>
          )}

          {/* ── Step 3: Results ── */}
          {step === "results" && result && (
            <ImportResultsView result={result} onClose={onClose} onReset={resetImport} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Import Results View ────────────────────────────────────────────── */
function ImportResultsView({
  result,
  onClose,
  onReset,
}: {
  result: ImportResult;
  onClose: () => void;
  onReset: () => void;
}) {
  const [tab, setTab] = useState<"success" | "errors">(
    result.errors.length > 0 && result.created === 0 ? "errors" : "success"
  );
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const copyAllLinks = async () => {
    const text = result.organizations
      .map((org) => `${org.name} | ${org.email} | ${org.inviteLink}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedLink("__all__");
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const downloadErrors = () => {
    if (!result.errors.length) return;
    const header = "Мөр\tБайгууллага\tШалтгаан\n";
    const rows = result.errors.map((e) => `${e.row}\t${e.name}\t${e.reason}`).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + header + rows], { type: "text/tab-separated-values;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "бүртгэгдээгүй_байгууллагууд.tsv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{result.total}</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Нийт мөр</div>
        </div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{result.created}</div>
          <div className="text-xs font-medium text-emerald-600 mt-0.5">Амжилттай</div>
        </div>
        <div className={`rounded-xl p-4 text-center ${result.skipped > 0 ? "bg-amber-50 border border-amber-100" : "bg-slate-50 border border-slate-100"}`}>
          <div className={`text-2xl font-bold ${result.skipped > 0 ? "text-amber-600" : "text-slate-400"}`}>
            {result.skipped}
          </div>
          <div className={`text-xs font-medium mt-0.5 ${result.skipped > 0 ? "text-amber-600" : "text-slate-400"}`}>
            Бүртгэгдээгүй
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      {result.errors.length > 0 && result.organizations.length > 0 && (
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
          <button
            onClick={() => setTab("success")}
            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-semibold transition-colors ${
              tab === "success"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <CheckCircle2 size={14} />
            Бүртгэгдсэн ({result.created})
          </button>
          <button
            onClick={() => setTab("errors")}
            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-semibold transition-colors ${
              tab === "errors"
                ? "bg-white text-amber-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <AlertTriangle size={14} />
            Бүртгэгдээгүй ({result.skipped})
          </button>
        </div>
      )}

      {/* Errors tab — failed rows with reasons */}
      {(tab === "errors" || result.organizations.length === 0) && result.errors.length > 0 && (
        <div className="rounded-xl border border-amber-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-100">
            <span className="flex items-center gap-2 text-sm font-semibold text-amber-700">
              <AlertTriangle size={15} />
              Бүртгэгдээгүй — {result.errors.length} байгууллага
            </span>
            <button
              onClick={downloadErrors}
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-amber-100 text-xs font-semibold text-amber-700 hover:bg-amber-200 transition-colors"
            >
              <Download size={12} />
              Татах
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="border-b border-amber-100 bg-amber-50/80 backdrop-blur-sm">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-amber-700 w-12">Мөр</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-amber-700">Байгууллага</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-amber-700">Шалтгаан</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-50">
                {result.errors.map((err, i) => (
                  <tr key={i} className="hover:bg-amber-50/30">
                    <td className="px-4 py-2.5 text-xs font-mono text-amber-600">{err.row}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-700">{err.name}</td>
                    <td className="px-4 py-2.5 text-xs text-red-600">{err.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Success tab — created organizations with invite links */}
      {(tab === "success" || result.errors.length === 0) && result.organizations.length > 0 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Бүртгэгдсэн байгууллагууд — Invite link
            </p>
            <button
              onClick={copyAllLinks}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <Copy size={12} />
              {copiedLink === "__all__" ? "Хуулсан!" : "Бүгдийг хуулах"}
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {result.organizations.map((org) => (
              <div key={org.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Building2 size={16} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{org.name}</p>
                  <p className="text-xs text-slate-500 truncate">{org.email}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => copyLink(org.inviteLink)}
                    className={`flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-semibold transition-colors ${
                      copiedLink === org.inviteLink
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                    }`}
                  >
                    {copiedLink === org.inviteLink ? (
                      <><CheckCircle2 size={12} /> Хуулсан</>
                    ) : (
                      <><Copy size={12} /> Link</>
                    )}
                  </button>
                  <a
                    href={org.inviteLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <button
          onClick={onReset}
          className="flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <Upload size={15} />
          Дахин импорт
        </button>
        <button
          onClick={onClose}
          className="h-10 px-7 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition-colors"
        >
          Хаах
        </button>
      </div>
    </div>
  );
}
