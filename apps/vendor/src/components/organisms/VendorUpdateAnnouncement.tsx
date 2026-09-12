"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Download,
  Filter,
  LayoutDashboard,
  ListOrdered,
  MousePointer2,
  Sparkles,
  X,
} from "lucide-react";

const STORAGE_KEY = "mgl-vendor-update:reports-2026-09:v3:impressions";
const MAX_IMPRESSIONS = 10;
const PADDING = 10;
const STEPS = [
  {
    path: "/reports",
    selector: '[data-tour="report-filters"]',
    title: "Тайлангаа хүссэнээрээ шүүнэ",
    description:
      "Барааны нэр, SKU, баркод, төлөв болон ангиллаар хайж зөвхөн хэрэгтэй мэдээллээ үлдээнэ.",
    icon: Filter,
  },
  {
    path: "/reports",
    selector: '[data-tour="report-pdf"]',
    title: "PDF тайлан гаргах",
    description:
      "Одоогийн шүүлтүүрээр харагдаж буй бүх бүтээгдэхүүнийг хэвлэхэд бэлэн PDF тайлан болгоно.",
    icon: Download,
  },
  {
    path: "/reports",
    selector: '[data-tour="best-selling"]',
    title: "Шилдэг борлуулалтаа харьцуулах",
    description:
      "Сонгосон хугацаанд хамгийн их зарагдсан 10 барааг тоо хэмжээ болон орлогоор нь харна.",
    icon: BarChart3,
  },
  {
    path: "/products",
    selector: '[data-tour="product-pagination"]',
    title: "Бүтээгдэхүүнийг хуудас хуудас үзэх",
    description:
      "Одоо бүх барааг зэрэг татахгүй. Өмнөх, дараах товчоор 24 бүтээгдэхүүнээр хурдан шилжинэ.",
    icon: ListOrdered,
  },
  {
    path: "/dashboard",
    selector: '[data-tour="improvement-panel"]',
    title: "Юуг түрүүлж хийхээ мэдэх",
    description:
      "Төлбөр, идэвхгүй бараа болон хүлээгдэж буй ажлыг эндээс харж, засах хэсэг рүү шууд орно.",
    icon: LayoutDashboard,
  },
] as const;

type Mode = "hidden" | "welcome" | "tour";
type TargetRect = Pick<
  DOMRect,
  "top" | "left" | "right" | "bottom" | "width" | "height"
>;
type LocatedTarget = {
  rect: TargetRect;
  stepIndex: number;
  pathname: string;
};

function WelcomeCard({
  onClose,
  onDismiss,
  onStart,
}: {
  onClose: () => void;
  onDismiss: () => void;
  onStart: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/70 backdrop-blur-md sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-title"
        className="w-full overflow-hidden rounded-t-[2rem] bg-white shadow-[0_30px_100px_rgba(15,23,42,.5)] sm:max-w-2xl sm:rounded-[2rem]"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 px-6 py-7 text-white sm:px-9 sm:py-9">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[.16em]">
                <Sparkles size={13} /> Шинэ боломжууд
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Хаах"
                className="rounded-full bg-white/10 p-2.5 text-white/75 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-4 focus:ring-white/20"
              >
                <X size={19} />
              </button>
            </div>
            <h2
              id="update-title"
              className="mt-7 max-w-xl text-3xl font-black leading-tight tracking-tight sm:text-4xl"
            >
              Шинэчлэлтийг бодитоор туршаад үзээрэй
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              Дэлгэц дээрх шинэ товч, хэсэг бүрийг нэг нэгээр нь тодруулж яг юу
              хийдгийг заана. Ойролцоогоор 1 минут.
            </p>
            <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                [BarChart3, "Тайлан"],
                [Download, "PDF"],
                [LayoutDashboard, "Хяналт"],
              ].map(([Icon, label]) => (
                <div
                  key={String(label)}
                  className="rounded-2xl border border-white/15 bg-white/10 p-3 sm:p-4"
                >
                  <Icon size={19} className="mb-2 text-amber-300" />
                  <p className="text-xs font-black sm:text-sm">
                    {String(label)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-5">
          <button
            type="button"
            onClick={onDismiss}
            className="text-left text-xs font-semibold text-slate-400 transition hover:text-slate-600 hover:underline"
          >
            Дахин харуулахгүй
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-12 flex-1 rounded-xl px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-100 sm:flex-none"
            >
              Дараа үзэх
            </button>
            <button
              type="button"
              onClick={onStart}
              className="group inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 sm:flex-none"
            >
              <MousePointer2 size={17} /> Заавар эхлүүлэх{" "}
              <ArrowRight
                size={16}
                className="transition group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VendorUpdateAnnouncement() {
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode>("hidden");
  const [stepIndex, setStepIndex] = useState(0);
  const [target, setTarget] = useState<LocatedTarget | null>(null);
  const recorded = useRef(false);
  const step = STEPS[stepIndex];
  const close = useCallback(() => setMode("hidden"), []);
  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(MAX_IMPRESSIONS));
    } catch {
      /* Storage unavailable. */
    }
    close();
  }, [close]);
  const stopTour = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(MAX_IMPRESSIONS));
    } catch {
      /* Storage unavailable. */
    }
    setTarget(null);
    close();
  }, [close]);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    try {
      const value = Number.parseInt(
        localStorage.getItem(STORAGE_KEY) || "0",
        10,
      );
      const count = Number.isFinite(value) ? Math.max(0, value) : 0;
      if (count < MAX_IMPRESSIONS) {
        localStorage.setItem(STORAGE_KEY, String(count + 1));
        setMode("welcome");
      }
    } catch {
      setMode("welcome");
    }
  }, []);

  useEffect(() => {
    if (mode !== "tour") return;
    setTarget(null);
    if (pathname !== step.path) {
      router.push(step.path);
      return;
    }
    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    const locate = () => {
      const element = document.querySelector<HTMLElement>(step.selector);
      if (!element && attempts++ < 30) {
        timeoutId = setTimeout(locate, 150);
        return;
      }
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      timeoutId = setTimeout(() => {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTarget({ rect, stepIndex, pathname });
        }
      }, 350);
    };
    locate();
    const update = () => {
      const element = document.querySelector<HTMLElement>(step.selector);
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTarget({ rect, stepIndex, pathname });
        }
      }
    };
    window.addEventListener("resize", update);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", update);
    };
  }, [mode, pathname, router, step, stepIndex]);

  useEffect(() => {
    if (mode === "hidden") return;
    const previous = document.body.style.overflow;
    if (mode === "welcome") document.body.style.overflow = "hidden";
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (mode === "tour") stopTour();
        else close();
      }
      if (
        mode === "tour" &&
        event.key === "ArrowRight" &&
        stepIndex < STEPS.length - 1
      )
        setStepIndex((value) => value + 1);
      if (mode === "tour" && event.key === "ArrowLeft" && stepIndex > 0)
        setStepIndex((value) => value - 1);
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", keydown);
    };
  }, [close, mode, stepIndex, stopTour]);

  if (mode === "hidden") return null;
  if (mode === "welcome")
    return (
      <WelcomeCard
        onClose={close}
        onDismiss={dismiss}
        onStart={() => {
          setStepIndex(0);
          setMode("tour");
        }}
      />
    );

  const Icon = step.icon;
  const isLast = stepIndex === STEPS.length - 1;
  const activeTarget =
    target?.stepIndex === stepIndex && target.pathname === pathname
      ? target.rect
      : null;
  const width = typeof window === "undefined" ? 0 : window.innerWidth;
  const tooltipStyle =
    activeTarget && width >= 768
      ? {
          top: Math.max(
            20,
            Math.min(activeTarget.top, window.innerHeight - 310),
          ),
          left:
            activeTarget.right + 390 < width
              ? activeTarget.right + 24
              : Math.max(20, activeTarget.left - 384),
        }
      : undefined;

  return (
    <div
      className="fixed inset-0 z-[140]"
      role="dialog"
      aria-modal="true"
      aria-label="Шинэ боломжуудын заавар"
    >
      {activeTarget ? (
        <>
          <div
            className="fixed inset-x-0 top-0 bg-slate-950/75 backdrop-blur-[2px]"
            style={{ height: Math.max(0, activeTarget.top - PADDING) }}
          />
          <div
            className="fixed left-0 bg-slate-950/75 backdrop-blur-[2px]"
            style={{
              top: activeTarget.top - PADDING,
              width: Math.max(0, activeTarget.left - PADDING),
              height: activeTarget.height + PADDING * 2,
            }}
          />
          <div
            className="fixed right-0 bg-slate-950/75 backdrop-blur-[2px]"
            style={{
              top: activeTarget.top - PADDING,
              left: activeTarget.right + PADDING,
              height: activeTarget.height + PADDING * 2,
            }}
          />
          <div
            className="fixed inset-x-0 bottom-0 bg-slate-950/75 backdrop-blur-[2px]"
            style={{ top: activeTarget.bottom + PADDING }}
          />
          <div
            className="pointer-events-none fixed rounded-2xl ring-4 ring-indigo-400 ring-offset-4 ring-offset-white shadow-[0_0_0_8px_rgba(99,102,241,.25),0_0_40px_rgba(99,102,241,.6)]"
            style={{
              top: activeTarget.top - PADDING,
              left: activeTarget.left - PADDING,
              width: activeTarget.width + PADDING * 2,
              height: activeTarget.height + PADDING * 2,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-[2px]" />
      )}

      <div
        className="fixed inset-x-3 bottom-3 z-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,.35)] md:inset-x-auto md:bottom-auto md:w-[360px]"
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon size={20} />
          </span>
          <button
            type="button"
            onClick={stopTour}
            aria-label="Зааврыг хаах"
            title="Зааврыг зогсоох"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mt-4 text-[11px] font-black uppercase tracking-[.16em] text-indigo-600">
          {stepIndex + 1} / {STEPS.length} алхам
        </p>
        {!activeTarget && (
          <p className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-indigo-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
            Хэсгийг нээж байна…
          </p>
        )}
        <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {step.description}
        </p>
        <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((value) => value - 1)}
            className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100 disabled:invisible"
          >
            <ArrowLeft size={15} /> Өмнөх
          </button>
          <button
            type="button"
            onClick={() =>
              isLast ? stopTour() : setStepIndex((value) => value + 1)
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:bg-indigo-700"
          >
            {isLast ? (
              <>
                <CheckCircle2 size={16} /> Дуусгах
              </>
            ) : (
              <>
                Дараах <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
