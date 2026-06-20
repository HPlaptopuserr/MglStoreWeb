"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Film,
  Loader2,
  Play,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";
import { useOrg } from "@/components/org/OrgContext";

type ReelItem = {
  id: string;
  title?: string | null;
  caption?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  status: string;
  reviewStatus: string;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  createdAt: string;
  publishedAt?: string | null;
};

type ProductOption = {
  id: string;
  name: string;
  sku?: string | null;
  price?: number | string | null;
  images?: Array<{ url: string }>;
};

type ReelListResponse = {
  items: ReelItem[];
  nextCursor?: string | null;
};

type UploadState = "idle" | "uploading" | "success" | "error";

const reviewStatusLabel: Record<string, string> = {
  PENDING: "Хяналт хүлээж байна",
  APPROVED: "Нийтлэгдсэн",
  REJECTED: "Буцаагдсан",
};

function formatDate(value?: string | null) {
  if (!value) return "Одоогоор нийтлээгүй";
  return new Intl.DateTimeFormat("mn-MN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ReelsManagerScreen() {
  const { user } = useOrg();
  const organizationId = user.organizationId || "";
  const [items, setItems] = useState<ReelItem[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [productId, setProductId] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const previewUrl = useMemo(
    () => (videoFile ? URL.createObjectURL(videoFile) : ""),
    [videoFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function loadReels() {
    if (!organizationId) {
      setLoading(false);
      setListError("Байгууллагын ID олдсонгүй. Дахин нэвтэрнэ үү.");
      return;
    }

    setLoading(true);
    setListError("");
    try {
      const params = new URLSearchParams({ organizationId, limit: "30" });
      const response = await authFetch(
        `${API}/vendor/reels?${params.toString()}`,
      );
      const data = (await response.json()) as
        | ReelListResponse
        | { message?: string };
      if (!response.ok) {
        throw new Error(
          "message" in data
            ? data.message
            : "Reel жагсаалт авахад алдаа гарлаа",
        );
      }
      setItems((data as ReelListResponse).items || []);
    } catch (error) {
      setListError(
        error instanceof Error
          ? error.message
          : "Reel жагсаалт авахад алдаа гарлаа",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    if (!organizationId) return;
    try {
      const params = new URLSearchParams({
        organizationId,
        includeInactive: "1",
        limit: "100",
      });
      const response = await authFetch(`${API}/products?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as
        | ProductOption[]
        | { message?: string };
      if (!response.ok) {
        throw new Error(
          "message" in data
            ? data.message
            : "Бүтээгдэхүүн ачаалахад алдаа гарлаа",
        );
      }
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    }
  }

  useEffect(() => {
    void loadReels();
    void loadProducts();
  }, [organizationId]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setVideoFile(file);
    setUploadState("idle");
    setUploadError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) {
      setUploadState("error");
      setUploadError("Байгууллагын ID олдсонгүй. Дахин нэвтэрнэ үү.");
      return;
    }
    if (!videoFile) {
      setUploadState("error");
      setUploadError("Reel video файл сонгоно уу.");
      return;
    }

    const formData = new FormData();
    formData.set("organizationId", organizationId);
    formData.set("title", title.trim());
    formData.set("caption", caption.trim());
    formData.set("tags", tags.trim());
    if (productId) formData.set("productId", productId);
    formData.set("video", videoFile);

    setUploadState("uploading");
    setUploadError("");

    try {
      const response = await authFetch(`${API}/reels`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as ReelItem | { message?: string };
      if (!response.ok) {
        throw new Error(
          "message" in data ? data.message : "Reel upload хийхэд алдаа гарлаа",
        );
      }

      setTitle("");
      setCaption("");
      setTags("");
      setProductId("");
      setVideoFile(null);
      setUploadState("success");
      await loadReels();
    } catch (error) {
      setUploadState("error");
      setUploadError(
        error instanceof Error
          ? error.message
          : "Reel upload хийхэд алдаа гарлаа",
      );
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-indigo-700">
            <Film className="h-3.5 w-3.5" />
            Reels
          </div>
          <h1 className="mt-3 text-2xl font-black text-slate-950 sm:text-3xl">
            Reel video оруулах
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            MGL Store дээр бүртгэсэн бүтээгдэхүүнтэйгээ холбож богино video,
            танилцуулга, promotion reel оруулна.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadReels()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Шинэчлэх
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-black text-slate-950">Шинэ reel</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              MP4, WebM, MOV файл оруулж болно.
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-black text-slate-700">
              Холбох бүтээгдэхүүн
            </span>
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="">Байгууллагын ерөнхий reel</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {product.sku ? ` · ${product.sku}` : ""}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-semibold text-slate-400">
              Бүтээгдэхүүн сонговол reel нь тухайн барааны танилцуулга болж
              хадгалагдана.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-700">Гарчиг</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              placeholder="Жишээ: Шинэ меню танилцуулга"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-700">Caption</span>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              rows={4}
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              placeholder="Reel дээр харагдах тайлбар"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-700">Tags</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              placeholder="food, promotion, mgl"
            />
          </label>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40">
            <UploadCloud className="h-8 w-8 text-indigo-600" />
            <span className="mt-3 text-sm font-black text-slate-800">
              {videoFile ? videoFile.name : "Video файл сонгох"}
            </span>
            <span className="mt-1 text-xs font-semibold text-slate-500">
              Upload limit: 250MB
            </span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {previewUrl && (
            <div className="flex justify-center rounded-2xl bg-slate-950/5 p-2">
              <video
                src={previewUrl}
                controls
                className="h-auto w-auto max-w-full rounded-2xl bg-slate-950 object-contain"
                style={{ maxHeight: "min(520px, 58dvh)" }}
              />
            </div>
          )}

          {uploadState === "error" && (
            <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {uploadError}
            </div>
          )}

          {uploadState === "success" && (
            <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Reel амжилттай орлоо.
            </div>
          )}

          <button
            type="submit"
            disabled={uploadState === "uploading"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploadState === "uploading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            Reel оруулах
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                Оруулсан reels
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Pending, approved, rejected төлөвүүд энд харагдана.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {items.length}
            </span>
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="flex min-h-64 items-center justify-center text-sm font-black text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Уншиж байна
              </div>
            ) : listError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                {listError}
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <Film className="h-10 w-10 text-slate-400" />
                <p className="mt-3 text-sm font-black text-slate-800">
                  Одоогоор reel оруулаагүй байна.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                  >
                    <div className="relative flex min-h-[220px] items-center justify-center bg-slate-950 p-2">
                      <video
                        src={item.videoUrl}
                        poster={item.thumbnailUrl || undefined}
                        className="h-auto w-auto max-w-full rounded-xl object-contain"
                        style={{ maxHeight: "420px" }}
                        controls
                        preload="metadata"
                      />
                      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur">
                        {reviewStatusLabel[item.reviewStatus] ||
                          item.reviewStatus}
                      </div>
                    </div>
                    <div className="space-y-3 p-4">
                      <div>
                        <h3 className="line-clamp-2 text-sm font-black text-slate-950">
                          {item.title || "Гарчиггүй reel"}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
                          {item.caption || "Caption байхгүй"}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <Metric label="Views" value={item.viewCount} />
                        <Metric label="Likes" value={item.likeCount} />
                        <Metric label="Shares" value={item.shareCount} />
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>
                          {formatDate(item.publishedAt || item.createdAt)}
                        </span>
                        <Play className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white px-2 py-2">
      <p className="text-sm font-black text-slate-950">{value}</p>
      <p className="mt-0.5 text-[10px] font-black uppercase text-slate-400">
        {label}
      </p>
    </div>
  );
}
