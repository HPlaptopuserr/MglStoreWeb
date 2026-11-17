"use client";
import { isClubWebsiteImage } from "@mgl/types";
import { useState, type ChangeEvent } from "react";
import { API, authFetch, resolveApiAssetUrl } from "@/lib/api";
import Image from "next/image";
import styles from "./site-builder.module.css";
export function WebsiteImageField({
  companyId,
  url,
  alt,
  onChange,
  onBusy,
  demo,
}: {
  companyId: string;
  url: string;
  alt: string;
  onChange: (patch: { imageUrl?: string; imageAlt?: string }) => void;
  onBusy: (busy: boolean) => void;
  demo: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || busy) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError("JPG, PNG, WebP · 10 MB хүртэл зураг сонгоно уу.");
      return;
    }
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("image", file);
      const response = await authFetch(
        `${API}/forms/mgl-club/my-companies/${companyId}/website/images`,
        { method: "POST", body, signal: AbortSignal.timeout(60000) },
      );
      const data: unknown = await response.json();
      if (
        !response.ok ||
        !data ||
        typeof data !== "object" ||
        !("url" in data) ||
        typeof data.url !== "string"
      )
        throw new Error();
      onChange({ imageUrl: data.url });
    } catch {
      setError("Зураг оруулж чадсангүй. Дахин оролдоно уу.");
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <div className={styles.imageField}>
      <label>
        Зургийн холбоос
        <input
          type="text"
          maxLength={500}
          value={url}
          disabled={busy}
          placeholder="https://... эсвэл файл оруулах"
          onChange={(e) => onChange({ imageUrl: e.target.value })}
        />
      </label>
      {url && isClubWebsiteImage(url) && (
        <div className={styles.imagePreview}>
          <Image
            src={url.startsWith("/api/") ? resolveApiAssetUrl(url) : url}
            alt={alt || "Сонгосон зураг"}
            width={360}
            height={180}
            unoptimized
            style={{ width: "100%", height: 180, objectFit: "cover" }}
          />
        </div>
      )}
      <div className={styles.imageActions}>
        {demo && companyId === "demo-company-innova" ? (
          <label>
            Иннова зургийн сан
            <select
              value=""
              onChange={(event) => {
                const value = event.target.value;
                if (value)
                  onChange({
                    imageUrl: `/mgl-club/website-demo/innova-${value}.png`,
                  });
              }}
            >
              <option value="">Зураг сонгох…</option>
              <option value="product-hero">Бүтээгдэхүүн</option>
              <option value="factory">Үйлдвэрийн барилга</option>
              <option value="warehouse">Үйлдвэр, агуулах</option>
              <option value="cutting">Зүсэх дамжлага</option>
              <option value="production">Үйлдвэрлэлийн дамжлага</option>
              <option value="equipment">Тоног төхөөрөмж</option>
              <option value="engineer">Инженерийн ажлын орчин</option>
              <option value="conformity-document">Тохирлын гэрчилгээ</option>
              <option value="organic-document">
                Органик бүтээгдэхүүний гэрчилгээ
              </option>
              <option value="banner">Танилцуулгын баннер</option>
              <option value="logo">Лого</option>
            </select>
          </label>
        ) : demo ? (
          <button
            type="button"
            onClick={() =>
              onChange({
                imageUrl: "/mgl-club/website-demo/produce.png",
                imageAlt: "Жишээ зураг",
              })
            }
          >
            Жишээ зураг сонгох
          </button>
        ) : (
          <label>
            Зураг оруулах
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={upload}
            />
          </label>
        )}
        {url && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onChange({ imageUrl: "" })}
          >
            Зураг хасах
          </button>
        )}
      </div>
      <label>
        Зургийн тайлбар
        <input
          type="text"
          maxLength={200}
          value={alt}
          onChange={(e) => onChange({ imageAlt: e.target.value })}
        />
      </label>
      {busy && <p role="status">Зургийг оруулж байна…</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
