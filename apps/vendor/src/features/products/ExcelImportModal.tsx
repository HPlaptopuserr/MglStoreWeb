"use client";

import { useState, useRef, useCallback } from "react";
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ImageIcon,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";

/* ─── Types ──────────────────────────────────────────────────────────── */
interface ImportedProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
}

interface ImportResult {
  message: string;
  total: number;
  created: number;
  skipped: number;
  errors: string[];
  products: ImportedProduct[];
}

type Step = "upload" | "importing" | "results";

const MAX_IMAGES_PER_PRODUCT = 5;

/* ─── Main Component ─────────────────────────────────────────────────── */
export function ExcelImportModal({
  organizationId,
  onClose,
  onSuccess,
}: {
  organizationId: string;
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
      const res = await authFetch(`${API}/products/import-template`);
      if (!res.ok) throw new Error("Татахад алдаа гарлаа");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "product_import_template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Template татахад алдаа гарлаа");
    }
  };

  /* ── File selection ── */
  const handleFile = (file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setError("Зөвхөн .xlsx, .xls файл оруулна уу");
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
    formData.append("organizationId", organizationId);

    try {
      const res = await authFetch(`${API}/products/import`, {
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

  /* ── Reset for new import ── */
  const resetImport = () => {
    setStep("upload");
    setSelectedFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <FileSpreadsheet size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Excel-ээс бараа импорт</h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                {step === "upload" && "Excel файлаа оруулна уу"}
                {step === "importing" && "Файл боловсруулж байна..."}
                {step === "results" && "Импортын үр дүн"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {/* ── Step 1: Upload ── */}
          {step === "upload" && (
            <div className="space-y-5">
              {/* Template download */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                <div className="flex items-center gap-3">
                  <Download size={18} className="text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Загвар файл татах</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Excel-н бүтэц, баганы нэрсийг харж бөглөнө үү
                    </p>
                  </div>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 h-9 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                >
                  <Download size={14} />
                  .xlsx татах
                </button>
              </div>

              {/* Column info */}
              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Баганы тайлбар
                  </p>
                </div>
                <div className="divide-y divide-slate-50">
                  {[
                    { col: "Нэр (name)", req: true, desc: "Барааны нэр" },
                    { col: "SKU (sku)", req: false, desc: "Барааны код / SKU" },
                    { col: "Үнэ (price)", req: true, desc: "Зарах үнэ (тоо)" },
                    { col: "Өртөг (costPrice)", req: false, desc: "Өртөг үнэ (тоо)" },
                    { col: "Нөөц (stock)", req: false, desc: "Нөөцийн тоо (0 анхдагч)" },
                    { col: "Тайлбар (description)", req: false, desc: "Барааны тайлбар" },
                  ].map(({ col, req, desc }) => (
                    <div key={col} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-100 px-2 py-0.5 rounded-md font-mono text-slate-700">{col}</code>
                        {req && <span className="text-[10px] font-bold text-red-400 bg-red-50 px-1.5 py-0.5 rounded">ЗААВАЛ</span>}
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
                className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                  dragActive
                    ? "border-emerald-400 bg-emerald-50"
                    : selectedFile
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                }`}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <FileSpreadsheet size={24} className="text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-800">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
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
                    <p className="text-sm font-bold text-slate-700">
                      Excel файлаа энд чирж оруулна уу
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      эсвэл файл сонгоно уу (.xlsx, .xls)
                    </p>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="mt-4 inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition-colors"
                    >
                      <Upload size={14} />
                      Файл сонгох
                    </button>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                  <AlertTriangle size={16} className="text-red-500 shrink-0" />
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={onClose}
                  className="h-10 px-5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Болих
                </button>
                <button
                  onClick={startImport}
                  disabled={!selectedFile}
                  className="flex items-center gap-2 h-10 px-7 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-800">Импорт хийж байна...</p>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedFile?.name} файлыг боловсруулж байна
                </p>
              </div>
            </div>
          )}

          {/* ── Step 3: Results ── */}
          {step === "results" && result && (
            <ImportResults
              result={result}
              onAddMoreImages={onSuccess}
              onClose={onClose}
              onReset={resetImport}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Import Results with Image Upload ─────────────────────────────── */
function ImportResults({
  result,
  onAddMoreImages,
  onClose,
  onReset,
}: {
  result: ImportResult;
  onAddMoreImages: () => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const [errorsExpanded, setErrorsExpanded] = useState(false);
  const [imageMode, setImageMode] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<Record<string, string[]>>({});
  const [savingImages, setSavingImages] = useState<string | null>(null);
  const [savedImages, setSavedImages] = useState<Set<string>>(new Set());

  const handleImageFiles = (productId: string, files: FileList | null) => {
    if (!files) return;
    const current = productImages[productId] || [];
    const remaining = MAX_IMAGES_PER_PRODUCT - current.length;
    const toProcess = Array.from(files).slice(0, remaining);

    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImages((prev) => {
          const imgs = prev[productId] || [];
          if (imgs.length >= MAX_IMAGES_PER_PRODUCT) return prev;
          return { ...prev, [productId]: [...imgs, reader.result as string] };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (productId: string, idx: number) => {
    setProductImages((prev) => ({
      ...prev,
      [productId]: (prev[productId] || []).filter((_, i) => i !== idx),
    }));
  };

  const saveImages = async (productId: string) => {
    const images = productImages[productId];
    if (!images?.length) return;

    setSavingImages(productId);
    try {
      const res = await authFetch(`${API}/products/${productId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });
      if (!res.ok) throw new Error();
      setSavedImages((prev) => new Set(prev).add(productId));
      onAddMoreImages();
    } catch {
      // Error is shown implicitly by not marking as saved
    } finally {
      setSavingImages(null);
    }
  };

  const saveAllImages = async () => {
    const productIds = Object.keys(productImages).filter((id) => productImages[id]?.length > 0);
    for (const id of productIds) {
      if (!savedImages.has(id)) {
        await saveImages(id);
      }
    }
  };

  const hasAnyImages = Object.values(productImages).some((imgs) => imgs.length > 0);
  const allSaved = Object.keys(productImages)
    .filter((id) => productImages[id]?.length > 0)
    .every((id) => savedImages.has(id));

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center">
          <div className="text-2xl font-black text-slate-800">{result.total}</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">Нийт мөр</div>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-center">
          <div className="text-2xl font-black text-emerald-600">{result.created}</div>
          <div className="text-xs font-medium text-emerald-600 mt-0.5">Амжилттай</div>
        </div>
        <div className={`rounded-2xl p-4 text-center ${result.skipped > 0 ? "bg-amber-50 border border-amber-100" : "bg-slate-50 border border-slate-100"}`}>
          <div className={`text-2xl font-black ${result.skipped > 0 ? "text-amber-600" : "text-slate-400"}`}>
            {result.skipped}
          </div>
          <div className={`text-xs font-medium mt-0.5 ${result.skipped > 0 ? "text-amber-600" : "text-slate-400"}`}>
            Алгассан
          </div>
        </div>
      </div>

      {/* Errors */}
      {result.errors.length > 0 && (
        <div className="rounded-2xl border border-amber-100 overflow-hidden">
          <button
            onClick={() => setErrorsExpanded(!errorsExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 text-sm font-bold text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle size={14} />
              {result.errors.length} алдаа
            </span>
            {errorsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {errorsExpanded && (
            <div className="p-4 space-y-1 max-h-48 overflow-y-auto bg-white">
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-600 font-medium py-1">{err}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Imported products — add images */}
      {result.products.length > 0 && (
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Бүртгэгдсэн бараа — Зураг нэмэх
            </p>
            {hasAnyImages && !allSaved && (
              <button
                onClick={saveAllImages}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Бүх зургийг хадгалах
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
            {result.products.map((product) => {
              const images = productImages[product.id] || [];
              const isSaved = savedImages.has(product.id);
              const isExpanded = imageMode === product.id;
              const isSaving = savingImages === product.id;

              return (
                <div key={product.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800 truncate">{product.name}</p>
                        {isSaved && (
                          <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            <CheckCircle2 size={10} />
                            Зураг хадгалсан
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {product.sku && (
                          <span className="text-[11px] font-mono text-slate-400">SKU: {product.sku}</span>
                        )}
                        <span className="text-[11px] text-slate-500">₮{product.price.toLocaleString()}</span>
                        <span className="text-[11px] text-slate-400">{product.stock} ш</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setImageMode(isExpanded ? null : product.id)}
                      className={`shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold transition-colors ${
                        isExpanded
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600"
                      }`}
                    >
                      <ImageIcon size={13} />
                      {images.length > 0 ? `${images.length} зураг` : "Зураг нэмэх"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        {images.map((img, idx) => (
                          <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            {!isSaved && (
                              <button
                                onClick={() => removeImage(product.id, idx)}
                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={12} className="text-white" />
                              </button>
                            )}
                            {idx === 0 && (
                              <div className="absolute top-0.5 left-0.5 bg-amber-500 text-white text-[7px] font-bold px-1 rounded">
                                Үндсэн
                              </div>
                            )}
                          </div>
                        ))}
                        {!isSaved && images.length < MAX_IMAGES_PER_PRODUCT && (
                          <label className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
                            <ImageIcon size={14} className="text-slate-400" />
                            <span className="text-[8px] font-bold text-slate-400 mt-0.5">Нэмэх</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => handleImageFiles(product.id, e.target.files)}
                            />
                          </label>
                        )}
                      </div>
                      {!isSaved && images.length > 0 && (
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => saveImages(product.id)}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                            Хадгалах
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <button
          onClick={onReset}
          className="flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <Upload size={15} />
          Дахин импорт
        </button>
        <button
          onClick={onClose}
          className="h-10 px-7 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-900 transition-colors"
        >
          Хаах
        </button>
      </div>
    </div>
  );
}
