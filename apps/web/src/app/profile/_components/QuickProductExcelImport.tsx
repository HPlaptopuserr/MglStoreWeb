"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { API } from "@/lib/api";

type QuickProductImportResult = {
  message?: string;
  total?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  errors?: string[];
};

type Props = {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onImported: () => Promise<void>;
  organizationId: string;
};

export function QuickProductExcelImport({
  authFetch,
  onImported,
  organizationId,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"template" | "import" | null>(null);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const success = message.includes("нэмэгдлээ") || message.includes("шинэчлэгдлээ");

  const downloadTemplate = async () => {
    if (busy) return;
    setBusy("template");
    setMessage("");
    try {
      const params = new URLSearchParams({ mode: "stock" });
      const res = await authFetch(`${API}/products/import-template?${params.toString()}`);
      if (!res.ok) throw new Error("template");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "product_import_template.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage("Excel загвар татахад алдаа гарлаа.");
    } finally {
      setBusy(null);
    }
  };

  const selectFile = (nextFile?: File | null) => {
    if (!nextFile) return;
    const name = nextFile.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setMessage("Зөвхөн .xlsx эсвэл .xls файл оруулна уу.");
      return;
    }
    setFile(nextFile);
    setMessage("");
  };

  const importFile = async () => {
    if (!file || busy) return;
    setBusy("import");
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("organizationId", organizationId);
    formData.append("mode", "stock");

    try {
      const res = await authFetch(`${API}/products/import`, {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as QuickProductImportResult;
      if (!res.ok) {
        setMessage(data.message || "Excel импорт хийхэд алдаа гарлаа.");
        return;
      }

      const created = Number(data.created || 0);
      const updated = Number(data.updated || 0);
      const skipped = Number(data.skipped || 0);
      setMessage(
        `${created} нэмэгдлээ, ${updated} шинэчлэгдлээ${
          skipped ? `, ${skipped} алгаслаа` : ""
        }.`,
      );
      setFile(null);
      await onImported();
    } catch {
      setMessage("Сүлжээний алдаа гарлаа.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mb-4 rounded-[20px] border border-emerald-100 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <FileSpreadsheet size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-950">Excel импорт</p>
            <p className="truncate text-xs font-bold text-slate-500">
              Vendor products-ийн загвараар олон бараа оруулах
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            disabled={Boolean(busy)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            {busy === "template" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Download size={15} />
            )}
            Загвар
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={Boolean(busy)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
          >
            <Upload size={15} />
            Excel сонгох
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="sr-only"
            onChange={(event) => {
              selectFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      </div>

      {file && (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 truncate text-xs font-black text-slate-700">
            {file.name}
          </p>
          <button
            type="button"
            onClick={importFile}
            disabled={busy === "import"}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy === "import" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Upload size={15} />
            )}
            Импорт эхлүүлэх
          </button>
        </div>
      )}

      {message && (
        <p
          className={`mt-2 text-xs font-bold ${
            success ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
