"use client";
import { useState } from "react";
import { readPlanImage } from "../plans/plan-storage";
export function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  return (
    <div className="website-image-field">
      <label>
        {label}
        <input
          value={value.startsWith("data:") ? "" : value}
          placeholder={
            value.startsWith("data:") ? "Зураг файл сонгогдсон" : "https://…"
          }
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <label className="website-file-label">
        {loading ? "Зураг уншиж байна…" : "Зураг файл оруулах"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={loading}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setLoading(true);
            setError("");
            try {
              onChange(await readPlanImage(file));
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Зураг уншиж чадсангүй.",
              );
            } finally {
              setLoading(false);
            }
          }}
        />
      </label>
      {value && (
        <>
          <span>Зураг тохируулсан</span>
          <button type="button" onClick={() => onChange("")}>
            Арилгах
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <small>PNG / JPG / WebP · 2 MB хүртэл, эсвэл HTTPS холбоос.</small>
    </div>
  );
}
