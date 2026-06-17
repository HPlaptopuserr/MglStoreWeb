"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Briefcase,
  Check,
  ExternalLink,
  Globe,
  Loader2,
  Save,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";

const BUSINESS_STATUS_KEY = "mglbusiness-status";
const BUSINESS_URL =
  process.env.NEXT_PUBLIC_BUSINESS_URL?.replace(/\/$/, "") ||
  "https://mglbusiness.mn";

type BusinessStatus = "maintenance" | "live";

function normalizeStatus(value: unknown): BusinessStatus {
  return value === "live" ? "live" : "maintenance";
}

export function MglBusinessTab() {
  const [status, setStatus] = useState<BusinessStatus>("maintenance");
  const [initialStatus, setInitialStatus] =
    useState<BusinessStatus>("maintenance");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    adminFetch(`${API}/site-settings/admin`)
      .then((response) => {
        if (!response.ok) throw new Error("Тохиргоо татахад алдаа гарлаа");
        return response.json() as Promise<Record<string, string>>;
      })
      .then((settings) => {
        if (!mounted) return;
        const nextStatus = normalizeStatus(settings[BUSINESS_STATUS_KEY]);
        setStatus(nextStatus);
        setInitialStatus(nextStatus);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : "Тохиргоо татахад алдаа гарлаа",
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const isDirty = status !== initialStatus;
  const isLive = status === "live";

  const statusCopy = useMemo(
    () =>
      isLive
        ? {
            title: "Public page нээлттэй",
            description:
              "mglbusiness.mn дээр live танилцуулга харагдана. Design батлагдсан үед ашиглана.",
            badge: "LIVE",
            icon: Globe,
            tone: "emerald",
          }
        : {
            title: "Засвартай горим",
            description:
              "Design батлагдтал mglbusiness.mn дээр засвартай holding page гарна.",
            badge: "MAINTENANCE",
            icon: Wrench,
            tone: "amber",
          },
    [isLive],
  );

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const response = await adminFetch(`${API}/site-settings`, {
        method: "PUT",
        body: JSON.stringify({
          [BUSINESS_STATUS_KEY]: status,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.message || "Хадгалахад алдаа гарлаа");
      }

      setInitialStatus(status);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 size={28} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  const StatusIcon = statusCopy.icon;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-lg shadow-emerald-200/50">
            <Briefcase size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">MGL Business</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Public business site-ийн нээлттэй эсвэл засвартай төлөвийг
              удирдана. Энэ тохиргоо deploy хийхгүйгээр frontend дээр шууд
              нөлөөлнө.
            </p>
          </div>
        </div>

        <a
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700"
          href={BUSINESS_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          Site нээх
          <ExternalLink size={16} />
        </a>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Public status
              </p>
              <h3 className="mt-1 text-xl font-black text-slate-950">
                MGL Business харагдах төлөв
              </h3>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                isLive
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {statusCopy.badge}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setStatus("maintenance")}
              className={`rounded-2xl border p-4 text-left transition ${
                !isLive
                  ? "border-amber-200 bg-white shadow-lg shadow-amber-100/70 ring-2 ring-amber-100"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Wrench size={21} />
                </span>
                {!isLive && <Check size={19} className="text-amber-600" />}
              </div>
              <p className="text-sm font-black text-slate-900">Засвартай</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                Design review дуусах хүртэл holding page харуулна.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStatus("live")}
              className={`rounded-2xl border p-4 text-left transition ${
                isLive
                  ? "border-emerald-200 bg-white shadow-lg shadow-emerald-100/70 ring-2 ring-emerald-100"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Globe size={21} />
                </span>
                {isLive && <Check size={19} className="text-emerald-600" />}
              </div>
              <p className="text-sm font-black text-slate-900">Нээлттэй</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                Public танилцуулга page-г хэрэглэгчдэд харуулна.
              </p>
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-slate-400">
              Тохиргооны key:{" "}
              <span className="font-mono text-slate-600">
                {BUSINESS_STATUS_KEY}
              </span>
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                saved
                  ? "bg-emerald-500 shadow-emerald-200"
                  : "bg-slate-950 shadow-slate-200 hover:bg-emerald-700"
              }`}
            >
              {saving ? (
                <Loader2 size={17} className="animate-spin" />
              ) : saved ? (
                <Check size={17} />
              ) : (
                <Save size={17} />
              )}
              {saved ? "Хадгалагдлаа" : "Хадгалах"}
            </button>
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div
            className={`mb-5 flex h-13 w-13 items-center justify-center rounded-2xl ${
              statusCopy.tone === "emerald"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-amber-50 text-amber-600"
            }`}
          >
            <StatusIcon size={24} />
          </div>
          <h3 className="text-xl font-black text-slate-950">
            {statusCopy.title}
          </h3>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
            {statusCopy.description}
          </p>

          <div className="mt-6 grid gap-3">
            {[
              "Нэг account / shared API",
              "MGL Store-той ижил brand palette",
              "Admin-аас deploy хийхгүй солигдоно",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"
              >
                <ShieldCheck size={18} className="text-emerald-600" />
                <span className="text-sm font-bold text-slate-700">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
