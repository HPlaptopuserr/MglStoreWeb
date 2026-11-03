"use client";
import { useState } from "react";
import Image from "next/image";
import { ImagePlus } from "lucide-react";
import type { BuildingUnitContent } from "@mgl/types/building-website";
import type { FloorPlanUnit } from "../website/floor-plan-units";
import { ProjectStatus } from "../management/ProjectStatus";

export function UnitManagementCard({
  entry,
  content,
  busy,
  onEdit,
}: {
  entry: FloorPlanUnit;
  content?: BuildingUnitContent;
  busy: boolean;
  onEdit: (tab: "basics" | "images") => void;
}) {
  const image = content?.layout3d || content?.layout2d;
  const [failedImage, setFailedImage] = useState("");
  return (
    <article className="unit-management-card">
      <button
        type="button"
        disabled={busy}
        onClick={() => onEdit("images")}
        className="unit-card-image"
        aria-label={`№ ${entry.unitNo ?? "—"} ${entry.label} — зураг тохируулах`}
      >
        {image && image !== failedImage ? (
          <Image
            src={image}
            alt={`${entry.label} · № ${entry.unitNo ?? "—"}`}
            width={480}
            height={320}
            unoptimized
            onError={() => setFailedImage(image)}
          />
        ) : (
          <span>
            <ImagePlus size={28} />
            <span>{image ? "Зураг ачаалсангүй" : "Байрны зураг нэмэх"}</span>
          </span>
        )}
        {image && (
          <span className="unit-card-image-kind">
            {content?.layout3d ? "3D зураг" : "2D план"}
          </span>
        )}
      </button>
      <div className="unit-card-body">
        <strong>{entry.label}</strong>
        <span>
          № {entry.unitNo ?? "—"} · {entry.areaM2 ?? "—"} м² ·{" "}
          {entry.rooms ?? "—"} өрөө
        </span>
        {entry.unit && <ProjectStatus status={entry.unit.status} />}
        <small>
          {entry.areaM2 === null ? "Талбай дутуу" : "Талбай бүртгэлтэй"} ·{" "}
          {entry.unit?.published ? "Нийтэлсэн" : "Ноорог"}
        </small>
        <div className="unit-card-actions">
          <button
            type="button"
            disabled={busy}
            onClick={() => onEdit("images")}
            className="building-primary"
          >
            Зураг тохируулах
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onEdit("basics")}
            className="building-secondary"
          >
            Мэдээлэл засах
          </button>
        </div>
      </div>
    </article>
  );
}
