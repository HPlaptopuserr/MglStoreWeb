"use client";

import React, { useRef, useState } from "react";
import { Check, Eraser, PenTool, Upload, X } from "lucide-react";

// ─── Signature Input: draw or upload PNG ────────────────────────────────────
export function SignatureInput({
  label,
  required,
  onReady,
  onClear,
}: {
  label?: string;
  required?: boolean;
  onReady: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fsCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initCtx = (canvas: HTMLCanvasElement | null) => {
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1e3a5f";
    }
    return ctx;
  };

  const getPos = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
  };

  type CanvasRef = React.RefObject<HTMLCanvasElement | null>;

  const onStart = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
    ref: CanvasRef,
  ) => {
    e.preventDefault();
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = initCtx(canvas);
    if (!ctx) return;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  };

  const onMove = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
    ref: CanvasRef,
  ) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawing(true);
  };

  const onEnd = (ref: CanvasRef, otherRef: CanvasRef) => {
    drawing.current = false;
    const src = ref.current;
    const dst = otherRef.current;
    if (src && dst) {
      const ctx = dst.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, dst.width, dst.height);
        ctx.drawImage(src, 0, 0, dst.width, dst.height);
      }
    }
    if (ref.current) onReady(ref.current.toDataURL("image/png"));
  };

  const clearDraw = () => {
    [canvasRef, fsCanvasRef].forEach((r) => {
      if (r.current)
        r.current
          .getContext("2d")
          ?.clearRect(0, 0, r.current.width, r.current.height);
    });
    setHasDrawing(false);
    onClear();
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setUploadedUrl(url);
      onReady(url);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-neutral-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg w-max">
        <button
          type="button"
          onClick={() => {
            setMode("draw");
            onClear();
            setUploadedUrl(null);
          }}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${mode === "draw" ? "bg-white text-blue-700 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
        >
          <PenTool className="w-3.5 h-3.5" /> Гараар зурах
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("upload");
            onClear();
            clearDraw();
          }}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${mode === "upload" ? "bg-white text-blue-700 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
        >
          <Upload className="w-3.5 h-3.5" /> PNG upload
        </button>
      </div>

      {mode === "draw" && (
        <div className="relative">
          <div
            className="border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50 relative"
            style={{ height: 140 }}
          >
            <canvas
              ref={canvasRef}
              width={800}
              height={140}
              className="absolute inset-0 w-full h-full touch-none"
              style={{ cursor: "crosshair" }}
              onMouseDown={(e) => onStart(e, canvasRef)}
              onMouseMove={(e) => onMove(e, canvasRef)}
              onMouseUp={() => onEnd(canvasRef, fsCanvasRef)}
              onMouseLeave={() => onEnd(canvasRef, fsCanvasRef)}
              onTouchStart={(e) => onStart(e, canvasRef)}
              onTouchMove={(e) => onMove(e, canvasRef)}
              onTouchEnd={() => onEnd(canvasRef, fsCanvasRef)}
            />
            {!hasDrawing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-neutral-400 pointer-events-none select-none">
                <PenTool className="w-5 h-5" />
                <span className="text-xs">Энд гарын үсэг зурна уу</span>
              </div>
            )}
            <div className="absolute top-2 right-2 flex gap-1.5">
              {hasDrawing && (
                <button
                  type="button"
                  onClick={clearDraw}
                  className="flex items-center gap-1 px-2 py-1 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-500 hover:text-red-500 shadow-sm"
                >
                  <Eraser className="w-3 h-3" /> Арилгах
                </button>
              )}
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                className="flex items-center gap-1 px-2 py-1 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-500 hover:text-blue-600 shadow-sm"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                  />
                </svg>
                Томруулах
              </button>
            </div>
          </div>
          {!hasDrawing && (
            <p className="text-xs text-red-500 mt-1">
              Гарын үсэг зурахгүйгээр хадгалах боломжгүй
            </p>
          )}
        </div>
      )}

      {mode === "upload" && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
          {uploadedUrl ? (
            <div className="border-2 border-neutral-200 rounded-xl bg-neutral-50 p-4 flex items-center gap-4">
              <img
                src={uploadedUrl}
                alt="Гарын үсэг"
                className="h-16 max-w-[200px] object-contain mix-blend-multiply"
              />
              <button
                type="button"
                onClick={() => {
                  setUploadedUrl(null);
                  onClear();
                }}
                className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-1"
              >
                Хасах
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50 h-24 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors gap-2"
            >
              <Upload className="w-6 h-6 text-neutral-400" />
              <span className="text-sm text-neutral-500">
                PNG / JPG файл сонгох
              </span>
              <span className="text-xs text-neutral-400">
                Гарын үсгийн зургийг энд дарж upload хийнэ үү
              </span>
            </div>
          )}
          {!uploadedUrl && (
            <p className="text-xs text-red-500 mt-1">
              Гарын үсэг оруулахгүйгээр хадгалах боломжгүй
            </p>
          )}
        </div>
      )}

      {/* Fullscreen drawing modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-200 bg-neutral-50">
            <span className="font-semibold text-neutral-800">
              Гарын үсэг зурах
            </span>
            <div className="flex gap-2">
              {hasDrawing && (
                <button
                  type="button"
                  onClick={clearDraw}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm text-neutral-600 hover:text-red-500"
                >
                  <Eraser className="w-4 h-4" /> Арилгах
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onEnd(fsCanvasRef, canvasRef);
                  setFullscreen(false);
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Check className="w-4 h-4" /> Хадгалах
              </button>
            </div>
          </div>
          <div className="flex-1 relative bg-neutral-50">
            <canvas
              ref={fsCanvasRef}
              width={2000}
              height={800}
              className="absolute inset-0 w-full h-full touch-none"
              style={{ cursor: "crosshair" }}
              onMouseDown={(e) => onStart(e, fsCanvasRef)}
              onMouseMove={(e) => onMove(e, fsCanvasRef)}
              onMouseUp={() => {}}
              onMouseLeave={() => {}}
              onTouchStart={(e) => onStart(e, fsCanvasRef)}
              onTouchMove={(e) => onMove(e, fsCanvasRef)}
              onTouchEnd={() => {}}
            />
            {!hasDrawing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-300 pointer-events-none select-none">
                <PenTool className="w-16 h-16" />
                <span className="text-xl">Энд гарын үсэг зурна уу</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// legacy hook kept for ContractPreviewTab
export function useSignatureCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = ref.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
  };

  const initCtx = () => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) {
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1e3a5f";
    }
    return ctx;
  };

  const start = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    e.preventDefault();
    const ctx = initCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  };

  const move = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    e.preventDefault();
    if (!drawing.current) return;
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const getDataUrl = () => ref.current?.toDataURL("image/png") || "";

  return { ref, start, move, end, clear, hasSignature, getDataUrl };
}

export const DEFAULT_MEMBER_FIELDS = [
  { key: "name", label: "Байгууллагын нэр:", required: true, enabled: true },
  {
    key: "register",
    label: "Байгууллагын регистр",
    required: true,
    enabled: true,
  },
  {
    key: "field",
    label: "Үйл ажиллагааны чиглэл:",
    required: false,
    enabled: true,
  },
  { key: "address", label: "Хаяг:", required: false, enabled: true },
  { key: "phone", label: "Утас:", required: true, enabled: true },
  { key: "email", label: "И-мэйл:", required: false, enabled: true },
  { key: "website", label: "Вэбсайт:", required: false, enabled: true },
  { key: "director", label: "Нэр:", required: true, enabled: true },
  { key: "bank", label: "Банк:", required: false, enabled: true },
  {
    key: "accountNumber",
    label: "Дансны дугаар:",
    required: false,
    enabled: true,
  },
];
