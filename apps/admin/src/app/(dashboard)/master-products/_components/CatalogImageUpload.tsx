"use client";
import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { API, adminFetch, getApiErrorMessage } from "@/lib/api";

export function CatalogImageUpload({
  value,
  onChange,
  onBusy,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  onBusy: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File) {
    setError("");
    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        file.type,
      ) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("JPG, PNG, WebP, GIF зураг сонгоно уу. Дээд хэмжээ 5 MB.");
      return;
    }
    setUploading(true);
    onBusy(true);
    try {
      const body = new FormData();
      body.append("image", file);
      const response = await adminFetch(`${API}/products/upload-image`, {
        method: "POST",
        body,
      });
      if (!response.ok)
        throw new Error(
          await getApiErrorMessage(response, "Зураг upload хийж чадсангүй"),
        );
      const result: unknown = await response.json();
      if (
        !result ||
        typeof result !== "object" ||
        !("url" in result) ||
        typeof result.url !== "string"
      )
        throw new Error("Зургийн хариу буруу байна");
      onChange(result.url);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Зураг upload хийж чадсангүй",
      );
    } finally {
      setUploading(false);
      onBusy(false);
    }
  }
  return (
    <div className="space-y-2 sm:col-span-2">
      <p className="text-sm font-semibold text-slate-700">Барааны зураг</p>
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        {value ? (
          <img
            src={value}
            alt="Нэгдсэн барааны зураг"
            className="h-24 w-24 rounded-lg border border-slate-200 bg-white object-contain"
          />
        ) : (
          <ImagePlus aria-hidden="true" className="h-12 w-12 text-slate-400" />
        )}
        <div className="space-y-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => input.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-slate-200 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50"
          >
            {uploading && (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            )}
            {uploading
              ? "Зураг хуулж байна…"
              : value
                ? "Зураг солих"
                : "Зураг оруулах"}
          </button>
          {value && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => onChange(null)}
              className="ml-3 text-sm text-slate-500 underline disabled:opacity-50"
            >
              Зураг салгах
            </button>
          )}
          <p className="text-xs text-slate-500">
            JPG, PNG, WebP, GIF · 5 MB хүртэл
          </p>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        aria-label="Барааны зураг сонгох"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
