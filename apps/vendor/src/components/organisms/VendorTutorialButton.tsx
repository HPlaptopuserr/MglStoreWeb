"use client";

import { useEffect, useRef, useState } from "react";
import { CirclePlay, Download, X } from "lucide-react";

const VIDEO_SRC = "/tutorials/vendor-guide.mp4";
const CAPTIONS_SRC = "/tutorials/vendor-guide.mn.vtt";
const POSTER_SRC = "/tutorials/vendor-guide-poster.png";

interface VendorTutorialButtonProps {
  variant?: "default" | "sidebar";
}

export default function VendorTutorialButton({
  variant = "default",
}: VendorTutorialButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        className={
          variant === "sidebar"
            ? "flex h-10 w-full items-center gap-2.5 rounded-lg border border-blue-100 bg-blue-50 px-3 text-[13px] font-semibold text-blue-700 transition-colors hover:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-100"
            : "flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-100 focus:outline-none focus:ring-4 focus:ring-amber-200"
        }
      >
        <CirclePlay className="h-[17px] w-[17px] shrink-0" />
        Заавар бичлэг үзэх
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vendor-tutorial-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#FFAD02]">
                  MGL Store Vendor
                </p>
                <h2
                  id="vendor-tutorial-title"
                  className="mt-1 text-lg font-black text-white sm:text-xl"
                >
                  Vendor ашиглах бүрэн заавар
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">
                  Нэвтрэхээс эхлээд бүтээгдэхүүн, POS, татвар болон eBarimt тохиргоог үзнэ.
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsOpen(false)}
                className="shrink-0 rounded-full border border-white/10 bg-white/5 p-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-4 focus:ring-amber-400/30"
                aria-label="Заавар бичлэгийг хаах"
              >
                <X size={20} />
              </button>
            </div>

            <div className="aspect-video w-full bg-black">
              <video
                className="h-full w-full"
                controls
                autoPlay
                playsInline
                preload="metadata"
                poster={POSTER_SRC}
              >
                <source src={VIDEO_SRC} type="video/mp4" />
                <track
                  default
                  kind="captions"
                  src={CAPTIONS_SRC}
                  srcLang="mn"
                  label="Монгол"
                />
                Таны browser MP4 video тоглуулах боломжгүй байна.
              </video>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs font-medium text-slate-400 sm:text-sm">
                Нийт хугацаа 4 минут 36 секунд · Монгол хадмалтай
              </p>
              <a
                href={VIDEO_SRC}
                download="MGL-Store-Vendor-Guide.mp4"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
              >
                <Download size={15} />
                Видео татах
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
