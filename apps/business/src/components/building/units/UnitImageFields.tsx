"use client";
import Image from "next/image";
import { useState } from "react";
import type { BuildingUnitContent } from "@mgl/types/building-website";
import { managementFetch, responseError } from "@/lib/building-management";
import { readPlanImage } from "../plans/plan-storage";

export function UnitImageFields({
  projectId,
  value,
  onChange,
  onBusy,
}: {
  projectId: string;
  value: BuildingUnitContent;
  onChange: (value: BuildingUnitContent) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function upload(
    field: "layout2d" | "layout3d" | "gallery",
    file: File,
  ) {
    setUploading(true);
    onBusy(true);
    setError("");
    try {
      const image = await readPlanImage(file);
      const response = await managementFetch(
        `admin/projects/${projectId}/media`,
        { method: "POST", body: JSON.stringify({ image }) },
      );
      if (!response.ok)
        throw new Error(
          await responseError(response, "Зураг оруулж чадсангүй."),
        );
      const result = (await response.json()) as { url: string };
      onChange(
        field === "gallery"
          ? { ...value, gallery: [...value.gallery, result.url] }
          : { ...value, [field]: result.url },
      );
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
    <fieldset disabled={uploading} className="unit-image-fields">
      <legend>Байрны зураг</legend>
      <p>
        Энэ байрны тусдаа 2D план, 3D дүрслэлийг оруулна. PNG, JPG, WebP · 20 MB
        хүртэл.
      </p>
      <div className="website-field-grid">
        {(["layout3d", "layout2d"] as const).map((field) => (
          <div key={field}>
            <label>
              {field === "layout3d" ? "3D зураг" : "2D план"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void upload(field, file);
                }}
              />
            </label>
            {value[field] && (
              <>
                <Image
                  src={value[field]}
                  alt={
                    field === "layout3d" ? "Байрны 3D зураг" : "Байрны 2D план"
                  }
                  width={320}
                  height={220}
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => onChange({ ...value, [field]: "" })}
                >
                  Зураг хасах
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      <label>
        Интерьерийн нэмэлт зураг ({value.gallery.length}/8)
        <input
          type="file"
          disabled={value.gallery.length >= 8}
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload("gallery", file);
          }}
        />
      </label>
      <div className="unit-gallery-thumbs">
        {value.gallery.map((url, index) => (
          <div key={url}>
            <Image
              src={url}
              alt={`Интерьер ${index + 1}`}
              width={160}
              height={110}
              unoptimized
            />
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  gallery: value.gallery.filter((item) => item !== url),
                })
              }
            >
              {index + 1}-р зураг хасах
            </button>
          </div>
        ))}
      </div>
      {uploading && <p role="status">Зураг боловсруулж байна…</p>}
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
