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

const QR_CARD_THEMES = {
  slate: {
    label: "Classic",
    accent: "#111827",
    accentSoft: "#eef2ff",
    ink: "#0f172a",
    muted: "#64748b",
    paper: "#ffffff",
  },
  violet: {
    label: "Purple",
    accent: "#7c3aed",
    accentSoft: "#f3e8ff",
    ink: "#1e1b4b",
    muted: "#6b7280",
    paper: "#ffffff",
  },
  orange: {
    label: "MGL Orange",
    accent: "#f97316",
    accentSoft: "#fff7ed",
    ink: "#111827",
    muted: "#667085",
    paper: "#ffffff",
  },
} as const;

type QrCardThemeKey = keyof typeof QR_CARD_THEMES;

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
  const [formTitle, setFormTitle] = useState("Гишүүний гэрээ");
  const [formSubtitle, setFormSubtitle] = useState("MGL Store");
  const [formCallout, setFormCallout] = useState("Намайг уншуул");
  const [formUrl, setFormUrl] = useState("");
  const [themeKey, setThemeKey] = useState<QrCardThemeKey>("slate");
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

    const theme = QR_CARD_THEMES[themeKey];
    const output = document.createElement("canvas");
    output.width = 1080;
    output.height = 1480;

    const context = output.getContext("2d");
    if (!context) return;

    context.fillStyle = "#f8fafc";
    context.fillRect(0, 0, output.width, output.height);

    context.fillStyle = theme.paper;
    roundRect(context, 90, 80, 900, 1320, 58);
    context.fill();

    context.save();
    context.shadowColor = "rgba(15, 23, 42, 0.14)";
    context.shadowBlur = 40;
    context.shadowOffsetY = 24;
    context.strokeStyle = "#e2e8f0";
    context.lineWidth = 4;
    roundRect(context, 90, 80, 900, 1320, 58);
    context.stroke();
    context.restore();

    context.fillStyle = theme.accentSoft;
    roundRect(context, 160, 150, 760, 118, 36);
    context.fill();

    context.fillStyle = theme.accent;
    context.font = "700 34px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText("MGL STORE QR", 540, 224);

    context.fillStyle = theme.ink;
    context.font = "900 66px Arial, sans-serif";
    drawCenteredLines(context, formTitle || "QR холбоос", 540, 370, 760, 74, 2);

    context.fillStyle = theme.muted;
    context.font = "700 34px Arial, sans-serif";
    drawCenteredLines(context, formSubtitle || "QR холбоос", 540, 505, 720, 42, 2);

    context.fillStyle = "#ffffff";
    roundRect(context, 205, 600, 670, 670, 42);
    context.fill();
    context.strokeStyle = "#e5e7eb";
    context.lineWidth = 3;
    roundRect(context, 205, 600, 670, 670, 42);
    context.stroke();
    context.drawImage(canvas, 265, 660, 550, 550);

    context.fillStyle = theme.accent;
    roundRect(context, 255, 1295, 570, 76, 38);
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = "900 34px Arial, sans-serif";
    drawCenteredLines(context, formCallout || "Намайг уншуул", 540, 1343, 500, 38, 1);

    const pngUrl = output.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `${slugifyFileName(formTitle || "mgl-link")}-qr-card.png`;
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
                QR нэр
              </span>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                placeholder="Жишээ: Гишүүний гэрээ"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Доод тайлбар
                </span>
                <input
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  placeholder="Жишээ: MGL Store"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  QR дээрх уриалга
                </span>
                <input
                  value={formCallout}
                  onChange={(e) => setFormCallout(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  placeholder="Жишээ: Намайг уншуул"
                />
              </label>
            </div>

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

            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                QR card өнгө
              </span>
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(QR_CARD_THEMES) as QrCardThemeKey[]).map((key) => {
                  const theme = QR_CARD_THEMES[key];
                  const active = themeKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setThemeKey(key)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-black transition ${
                        active
                          ? "border-violet-300 bg-violet-50 text-violet-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{ background: theme.accent }}
                      />
                      {theme.label}
                    </button>
                  );
                })}
              </div>
            </div>

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
                  {formTitle || "QR холбоос"}
                </p>
                <div className="mx-auto max-w-[340px] rounded-[28px] border border-slate-200 bg-white p-5 text-center shadow-sm">
                  <div
                    className="mx-auto mb-4 w-fit rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]"
                    style={{
                      background: QR_CARD_THEMES[themeKey].accentSoft,
                      color: QR_CARD_THEMES[themeKey].accent,
                    }}
                  >
                    MGL Store QR
                  </div>
                  <h3 className="line-clamp-2 text-2xl font-black text-slate-950">
                    {formTitle || "QR холбоос"}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-500">
                    {formSubtitle || "QR холбоос"}
                  </p>
                  <div className="mt-5 flex items-center justify-center rounded-2xl bg-white p-3 shadow-[0_14px_34px_rgba(15,23,42,0.10)] ring-1 ring-slate-100">
                    <QrGenerator
                      mode="canvas"
                      canvasRef={qrCanvasRef}
                      value={qrValue}
                      size={240}
                      level="M"
                      includeMargin
                      bgColor="#ffffff"
                      fgColor="#111827"
                    />
                  </div>
                  <div
                    className="mx-auto mt-5 w-fit rounded-full px-5 py-2 text-sm font-black text-white"
                    style={{ background: QR_CARD_THEMES[themeKey].accent }}
                  >
                    {formCallout || "Намайг уншуул"}
                  </div>
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

function slugifyFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яёөү\s-]/gi, "")
    .replace(/\s+/g, "-")
    .slice(0, 48) || "mgl-link";
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function drawCenteredLines(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    visibleLines[visibleLines.length - 1] = `${visibleLines[visibleLines.length - 1].replace(/\.*$/, "")}...`;
  }

  visibleLines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
}
