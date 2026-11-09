"use client";
import Image from "next/image";
import { useState, type ChangeEvent } from "react";
import { API, resolveApiAssetUrl } from "@/lib/api";
export function CommunityPhotoField({
  value,
  onChange,
  onBusy,
}: {
  value: string;
  onChange: (value: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || uploading) return;
    setError("");
    if (
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setError(
        "JPG, PNG эсвэл WebP зураг, 5 MB хүртэл хэмжээтэй файл сонгоно уу.",
      );
      return;
    }
    setUploading(true);
    onBusy(true);
    try {
      const body = new FormData();
      body.append("photo", file);
      const response = await fetch(`${API}/forms/2003/photos`, {
        method: "POST",
        body,
        signal: AbortSignal.timeout(30000),
      });
      const data: unknown = await response.json();
      if (
        !response.ok ||
        !data ||
        typeof data !== "object" ||
        !("url" in data) ||
        typeof data.url !== "string"
      )
        throw new Error("Зураг хадгалахад алдаа гарлаа. Дахин оролдоно уу.");
      onChange(data.url);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Зураг оруулж чадсангүй.",
      );
    } finally {
      setUploading(false);
      onBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <input type="hidden" name="photoUrl" value={value} />
      <label
        htmlFor="community-photo"
        className="block text-sm font-medium text-slate-700"
      >
        Танилцуулгын зураг{" "}
        <span className="font-normal text-slate-400">(заавал биш)</span>
      </label>
      {value && (
        <Image
          src={resolveApiAssetUrl(value)}
          alt="Танилцуулгын зураг"
          width={128}
          height={128}
          unoptimized
          className="size-32 rounded-2xl object-cover"
        />
      )}
      <input
        id="community-photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={uploading}
        onChange={upload}
        aria-describedby="community-photo-help"
        className="block max-w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-3 file:font-semibold file:text-blue-900"
      />
      <p id="community-photo-help" className="text-xs text-slate-500">
        JPG, PNG, WebP · 5 MB хүртэл. Зураг танилцуулгатай хамт нийтлэгдэнэ.
      </p>
      {uploading && (
        <p role="status" className="text-sm text-blue-800">
          Зураг оруулж байна…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {value && (
        <button
          type="button"
          disabled={uploading}
          className="text-sm font-semibold text-red-700 underline"
          onClick={() => {
            onChange("");
            setError("");
          }}
        >
          Зураг хасах
        </button>
      )}
    </div>
  );
}
