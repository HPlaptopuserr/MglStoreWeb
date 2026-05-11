"use client";

import { useMemo, useRef, useState } from "react";
import {
  Copy,
  ExternalLink,
  Link as LinkIcon,
  QrCode,
  Download,
  Check,
  AlertCircle,
  Wrench,
} from "lucide-react";
import { QrGenerator } from "@mgl/ui";

const GOOGLE_FORM_HINT = "https://docs.google.com/forms/d/.../viewform";
const ORG_PROFILE_HINT = "https://mglstore.mn/organizations/--162";

function isQrTargetUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

type QrGeneratorPanelProps = {
  showHeader?: boolean;
};

export function QrGeneratorPanel({ showHeader = true }: QrGeneratorPanelProps) {
  const [formTitle, setFormTitle] = useState("QR холбоос");
  const [formUrl, setFormUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const normalizedFormUrl = useMemo(() => normalizeUrl(formUrl), [formUrl]);
  const validForm = useMemo(
    () => isQrTargetUrl(normalizedFormUrl),
    [normalizedFormUrl],
  );

  const qrValue = useMemo(() => {
    if (!validForm) return "";
    return normalizedFormUrl;
  }, [normalizedFormUrl, validForm]);

  const handleCopy = async () => {
    if (!validForm) return;
    await navigator.clipboard.writeText(normalizedFormUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;

    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = "mgl-link-qr.png";
    link.click();
  };

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                QR Generator
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Google Forms, байгууллагын profile, эсвэл дурын веб линкийг QR
                код болгон хөрвүүлнэ.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-lg font-bold text-slate-900">QR хөрвүүлэлт</h2>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Гарчиг
              </span>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                placeholder="Жишээ: Байгууллагын profile link"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <LinkIcon size={12} />
                URL
              </span>
              <input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                placeholder={`${GOOGLE_FORM_HINT} эсвэл ${ORG_PROFILE_HINT}`}
              />
            </label>

            <div
              className={`rounded-xl border p-3 text-sm ${
                validForm
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {validForm ? (
                <span className="inline-flex items-center gap-2">
                  <Check size={16} /> Холбоос хүчинтэй байна. QR үүсгэхэд бэлэн.
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <AlertCircle size={16} /> HTTPS/HTTP эхлэлтэй хүчинтэй линк оруулна уу.
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!validForm}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Хуулсан" : "Линк хуулах"}
              </button>

              {validForm ? (
                <a
                  href={normalizedFormUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-violet-600 text-white hover:bg-violet-700"
                >
                  <ExternalLink size={15} /> Линк нээх
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-slate-200 text-slate-500 cursor-not-allowed opacity-60"
                >
                  <ExternalLink size={15} /> Линк нээх
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">QR Preview</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              <QrCode size={12} /> LIVE
            </span>
          </div>

          {validForm ? (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {formTitle || "Form"}
                </p>
                <div className="mx-auto flex max-w-[280px] items-center justify-center rounded-xl bg-white p-3 shadow-sm">
                  <QrGenerator
                    mode="canvas"
                    canvasRef={qrCanvasRef}
                    value={qrValue}
                    size={260}
                    level="M"
                    includeMargin
                    bgColor="#ffffff"
                    fgColor="#111827"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadQr}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                <Download size={15} /> QR татах
              </button>
            </>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-14 text-center">
              <QrCode className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">
                QR харахын тулд эхлээд линк оруулна уу.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
