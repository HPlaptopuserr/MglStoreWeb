"use client";
import { useState, type ChangeEvent } from "react";
import { authFetch, API } from "@/lib/api";
import { CompanyLogo } from "./CompanyLogo";
import styles from "./companies.module.css";

export function ClubLogoField({
  onBusy,
  value,
  onChange,
  disabled = false,
  required = true,
  id = "club-logo",
}: {
  onBusy: (busy: boolean) => void;
  value?: string;
  onChange?: (url: string) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}) {
  const [localUrl, setLocalUrl] = useState("");
  const url = value ?? localUrl;
  function setUrl(next: string) {
    setLocalUrl(next);
    onChange?.(next);
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || busy || disabled) return;
    setError("");
    if (
      !/^(image\/jpeg|image\/png|image\/webp)$/.test(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError(
        "JPG, PNG эсвэл WebP зураг, 5 MB хүртэл хэмжээтэй файл сонгоно уу.",
      );
      return;
    }
    setBusy(true);
    onBusy(true);
    try {
      const body = new FormData();
      body.append("logo", file);
      const response = await authFetch(`${API}/forms/mgl-club/logos`, {
        method: "POST",
        body,
        signal: AbortSignal.timeout(60000),
      });
      const data: unknown = await response.json();
      if (response.status === 401)
        throw new Error("Нэвтрэх хугацаа дууссан байна. Дахин нэвтэрнэ үү.");
      if (response.status === 403)
        throw new Error("Лого оруулах эрх зөвхөн систем админд нээлттэй.");
      if (
        !response.ok ||
        !data ||
        typeof data !== "object" ||
        !("url" in data) ||
        typeof data.url !== "string"
      )
        throw new Error("Лого хадгалахад алдаа гарлаа. Дахин оролдоно уу.");
      setUrl(data.url);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Лого оруулж чадсангүй. Холболтоо шалгаад дахин оролдоно уу.",
      );
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <div className={styles.upload}>
      <input type="hidden" name="logoUrl" value={url} />
      <label htmlFor={id}>Байгууллагын лого{required ? " *" : ""}</label>
      {url && (
        <div className={styles.preview}>
          <CompanyLogo name="Байгууллагын" url={url} />
        </div>
      )}
      <input
        id={id}
        type="file"
        required={required && !url}
        accept="image/jpeg,image/png,image/webp"
        disabled={busy || disabled}
        onChange={upload}
        aria-describedby={`${id}-help`}
      />
      <p id={`${id}-help`}>
        JPG, PNG, WebP · 5 MB хүртэл. Логоны харьцааг хэвээр хадгална.
      </p>
      {busy && <p role="status">Лого оруулж байна…</p>}
      {error && <p role="alert">{error}</p>}
      {url && (
        <button
          type="button"
          disabled={busy || disabled}
          onClick={() => setUrl("")}
        >
          Лого хасах
        </button>
      )}
    </div>
  );
}
