"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Filter,
  Film,
  Loader2,
  Megaphone,
  Package,
  Send,
  ShieldCheck,
  Store,
  ToggleLeft,
  ToggleRight,
  XCircle,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
type ContentType = "product" | "service" | "post" | "reel";
type StatusFilter = ReviewStatus | "ALL";
type TypeFilter = ContentType | "all";

type ReviewItem = {
  id: string;
  type: ContentType;
  title: string;
  description: string | null;
  priceText: string | null;
  imageUrl: string | null;
  videoUrl?: string | null;
  reviewStatus: ReviewStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  organization: {
    id: string;
    name: string;
    slug: string | null;
    logoUrl: string | null;
  } | null;
  submittedBy: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string | null;
  } | null;
};

const REVIEW_SETTING_KEY = "vendor-content-review-enabled";

const STATUS_META: Record<
  ReviewStatus,
  { label: string; className: string; icon: typeof Clock3 }
> = {
  PENDING: {
    label: "Хүлээгдэж байна",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    icon: Clock3,
  },
  APPROVED: {
    label: "Зөвшөөрсөн",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Татгалзсан",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
    icon: XCircle,
  },
};

const TYPE_META: Record<
  ContentType,
  { label: string; icon: typeof Package; className: string }
> = {
  product: {
    label: "Бүтээгдэхүүн",
    icon: Package,
    className: "bg-orange-50 text-orange-600",
  },
  service: {
    label: "Үйлчилгээ / зар",
    icon: Megaphone,
    className: "bg-sky-50 text-sky-600",
  },
  post: {
    label: "Пост",
    icon: Send,
    className: "bg-violet-50 text-violet-600",
  },
  reel: {
    label: "Reel",
    icon: Film,
    className: "bg-fuchsia-50 text-fuchsia-600",
  },
};

function isTruthy(value: unknown) {
  return ["1", "true", "on", "yes"].includes(
    String(value || "")
      .trim()
      .toLowerCase(),
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getImageUrl(url: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API.replace(/\/api$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

export default function VendorContentReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [counts, setCounts] = useState<Record<ReviewStatus, number>>({
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
  });
  const [status, setStatus] = useState<StatusFilter>("PENDING");
  const [type, setType] = useState<TypeFilter>("all");
  const [reviewEnabled, setReviewEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingToggle, setSavingToggle] = useState(false);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [error, setError] = useState("");

  const totalCount = useMemo(
    () => counts.PENDING + counts.APPROVED + counts.REJECTED,
    [counts],
  );

  const loadSettings = useCallback(async () => {
    const res = await adminFetch(`${API}/site-settings/admin`);
    if (!res.ok) throw new Error("settings");
    const settings = await res.json();
    setReviewEnabled(isTruthy(settings?.[REVIEW_SETTING_KEY]));
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        status,
        limit: "150",
      });
      if (type !== "all") params.set("type", type);
      const res = await adminFetch(
        `${API}/admin/vendor-content-review?${params.toString()}`,
      );
      if (!res.ok) throw new Error("items");
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setCounts({
        PENDING: Number(data?.counts?.PENDING || 0),
        APPROVED: Number(data?.counts?.APPROVED || 0),
        REJECTED: Number(data?.counts?.REJECTED || 0),
      });
    } catch {
      setError("Vendor content жагсаалт авахад алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }, [status, type]);

  useEffect(() => {
    loadSettings().catch(() =>
      setError("Vendor review тохиргоо авахад алдаа гарлаа."),
    );
  }, [loadSettings]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const toggleReview = async () => {
    const next = !reviewEnabled;
    setSavingToggle(true);
    setError("");
    try {
      const res = await adminFetch(
        `${API}/site-settings/${REVIEW_SETTING_KEY}`,
        {
          method: "PUT",
          body: JSON.stringify({ value: next ? "true" : "false" }),
        },
      );
      if (!res.ok) throw new Error("toggle");
      setReviewEnabled(next);
    } catch {
      setError("Vendor бараа хяналтын toggle хадгалахад алдаа гарлаа.");
    } finally {
      setSavingToggle(false);
    }
  };

  const updateReviewStatus = async (
    item: ReviewItem,
    nextStatus: Exclude<ReviewStatus, "PENDING">,
  ) => {
    setBusyItem(`${item.type}:${item.id}`);
    setError("");
    try {
      const res = await adminFetch(
        `${API}/admin/vendor-content-review/${item.type}/${item.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      if (!res.ok) throw new Error("review");
      await loadItems();
    } catch {
      setError("Review status шинэчлэхэд алдаа гарлаа.");
    } finally {
      setBusyItem(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500">
                Review control
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                Vendor бараа хяналт
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Vendor-оос web store дээр нийтлэх бүтээгдэхүүн, үйлчилгээ/зар,
                пост болон reel-үүдийг админ баталгаажуулсны дараа public хэсэгт
                гаргана.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleReview}
            disabled={savingToggle}
            className={`inline-flex items-center justify-center gap-3 rounded-2xl px-5 py-3 text-sm font-black shadow-sm transition disabled:opacity-60 ${
              reviewEnabled
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {savingToggle ? (
              <Loader2 size={18} className="animate-spin" />
            ) : reviewEnabled ? (
              <ToggleRight size={22} />
            ) : (
              <ToggleLeft size={22} />
            )}
            {reviewEnabled ? "Хяналт асаалттай" : "Хяналт унтраалттай"}
          </button>
        </div>

        <div className="grid border-t border-slate-100 bg-slate-50/70 sm:grid-cols-3">
          {(["PENDING", "APPROVED", "REJECTED"] as ReviewStatus[]).map(
            (key) => {
              const meta = STATUS_META[key];
              const Icon = meta.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatus(key)}
                  className={`flex items-center justify-between border-b border-slate-100 px-6 py-4 text-left transition sm:border-b-0 sm:border-r ${
                    status === key ? "bg-white" : "hover:bg-white/70"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${meta.className}`}
                    >
                      <Icon size={18} />
                    </span>
                    <span className="font-black text-slate-900">
                      {meta.label}
                    </span>
                  </span>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-black text-slate-600">
                    {counts[key]}
                  </span>
                </button>
              );
            },
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Хяналтын жагсаалт
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {status === "ALL" ? totalCount : items.length} бичлэг
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              <Filter size={14} />
              filter
            </span>
            {(
              ["all", "product", "service", "post", "reel"] as TypeFilter[]
            ).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setType(filter)}
                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                  type === filter
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter === "all" ? "Бүгд" : TYPE_META[filter].label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setStatus("ALL")}
              className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                status === "ALL"
                  ? "bg-slate-950 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Бүх төлөв
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center rounded-3xl bg-slate-50 text-slate-400">
              <Loader2 size={26} className="animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <Store className="text-slate-300" size={34} />
              <p className="mt-3 text-lg font-black text-slate-800">
                Жагсаалт хоосон байна
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                Сонгосон filter дээр review хийх content алга.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <ReviewCard
                key={`${item.type}:${item.id}`}
                item={item}
                busy={busyItem === `${item.type}:${item.id}`}
                onApprove={() => updateReviewStatus(item, "APPROVED")}
                onReject={() => updateReviewStatus(item, "REJECTED")}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function ReviewCard({
  item,
  busy,
  onApprove,
  onReject,
}: {
  item: ReviewItem;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const typeMeta = TYPE_META[item.type];
  const statusMeta = STATUS_META[item.reviewStatus];
  const TypeIcon = typeMeta.icon;
  const StatusIcon = statusMeta.icon;
  const imageUrl = getImageUrl(item.imageUrl);
  const videoUrl = getImageUrl(item.videoUrl || null);

  return (
    <article className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md lg:grid-cols-[132px_minmax(0,1fr)_240px]">
      <div className="overflow-hidden rounded-2xl bg-slate-100">
        {item.type === "reel" && videoUrl ? (
          <video
            src={videoUrl}
            poster={imageUrl || undefined}
            className="h-32 w-full bg-slate-950 object-contain lg:h-full"
            controls
            preload="metadata"
          />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-32 w-full object-cover lg:h-full"
          />
        ) : (
          <div className="flex h-32 w-full items-center justify-center text-slate-300 lg:h-full">
            <TypeIcon size={28} />
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${typeMeta.className}`}
          >
            <TypeIcon size={14} />
            {typeMeta.label}
          </span>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ring-1 ${statusMeta.className}`}
          >
            <StatusIcon size={14} />
            {statusMeta.label}
          </span>
          {!item.isActive ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
              inactive
            </span>
          ) : null}
        </div>

        <div>
          <h3 className="line-clamp-2 text-xl font-black tracking-tight text-slate-950">
            {item.title || "Гарчиггүй"}
          </h3>
          {item.description ? (
            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">
              {item.description}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 text-sm font-bold text-slate-500 md:grid-cols-3">
          <Info label="Vendor" value={item.organization?.name || "-"} />
          <Info
            label="Оруулсан"
            value={item.submittedBy?.fullName || item.submittedBy?.email || "-"}
          />
          <Info label="Огноо" value={formatDate(item.updatedAt)} />
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-2xl bg-slate-50 p-3">
        <div className="space-y-2">
          {item.priceText ? (
            <p className="text-lg font-black text-orange-600">
              {item.priceText}
            </p>
          ) : null}
          <p className="text-xs font-bold leading-5 text-slate-400">
            {item.submittedBy?.email || "Оруулсан хэрэглэгч тодорхойгүй"}
          </p>
        </div>

        <div className="grid gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={busy || item.reviewStatus === "APPROVED"}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            Зөвшөөрөх
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={busy || item.reviewStatus === "REJECTED"}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XCircle size={16} />
            Татгалзах
          </button>
        </div>
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-slate-700">{value}</p>
    </div>
  );
}
