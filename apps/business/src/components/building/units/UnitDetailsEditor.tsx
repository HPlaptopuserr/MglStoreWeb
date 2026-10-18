"use client";
import { useState } from "react";
import Link from "next/link";
import {
  emptyUnitContent,
  type WebsiteInventoryUnit,
  type WebsiteProject,
} from "@mgl/types/building-website";
import { managementFetch, responseError } from "@/lib/building-management";
import { BuildingDialog } from "../manage/BuildingDialog";
import { UnitImageFields } from "./UnitImageFields";
import { formatUnitPrice } from "./unit-detail-model";

export function UnitDetailsEditor({
  project,
  unit,
  floorNumber,
  blockId,
  regionId,
  onSaved,
  onClose,
}: {
  project: WebsiteProject;
  unit: WebsiteInventoryUnit;
  floorNumber: number;
  blockId: string;
  regionId: string;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(unit);
  const [content, setContent] = useState(
    project.website.unitContent?.[unit.id] ?? emptyUnitContent(),
  );
  const [saving, setSaving] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  const [tab, setTab] = useState("basics");
  const [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false);
  const rate = content.useProjectPrice
    ? (project.website.pricePerM2 ?? null)
    : draft.pricePerM2 === null
      ? null
      : Number(draft.pricePerM2);
  const total =
    draft.areaM2 && rate !== null
      ? Math.round(Number(draft.areaM2) * rate * 100) / 100
      : null;
  const preview = `/building/manage/${project.id}/preview?block=${blockId}&floor=${floorNumber}&region=${encodeURIComponent(regionId)}&view=unit`;
  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await managementFetch(
        `admin/projects/${project.id}/units/${unit.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...draft,
            typeLabel: draft.typeLabel ?? "",
            updatedAt: project.updatedAt,
            unitContent: content,
            pricePerM2: rate,
            priceTotal: total,
          }),
        },
      );
      if (!response.ok)
        throw new Error(await responseError(response, "Хадгалж чадсангүй."));
      await onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Хадгалж чадсангүй.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <BuildingDialog
      title={draft.typeLabel || `№ ${draft.unitNo}`}
      subtitle={`${floorNumber}-р давхар · Байрны мэдээлэл`}
      onClose={() => {
        if (!saving && !uploading) {
          if (dirty) setDiscard(true);
          else onClose();
        }
      }}
      footer={
        <>
          <button
            type="button"
            className="building-secondary"
            disabled={saving || uploading}
            onClick={() => (dirty ? setDiscard(true) : onClose())}
          >
            Хаах
          </button>
          <button
            type="submit"
            form="unit-details-form"
            className="building-primary"
            disabled={saving || uploading}
          >
            {saving ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </>
      }
    >
      <div className="building-tabs">
        {[
          ["basics", "Мэдээлэл"],
          ["images", "Зураг"],
          ["price", "Үнэ, төлөв"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <form
        id="unit-details-form"
        className="unit-details-form"
        onChange={() => setDirty(true)}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={saving || uploading}>
          <div hidden={tab !== "basics"}>
            <label>
              Нэр
              <input
                maxLength={100}
                value={draft.typeLabel ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, typeLabel: event.target.value })
                }
              />
            </label>
            <label>
              Тоот
              <input
                maxLength={30}
                value={draft.unitNo}
                onChange={(event) =>
                  setDraft({ ...draft, unitNo: event.target.value })
                }
              />
            </label>
            <div className="website-field-grid">
              <label>
                Өрөөний тоо
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={draft.rooms ?? ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      rooms: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                />
              </label>
              <label>
                Талбай, м²
                <input
                  type="number"
                  min={0.01}
                  max={10000}
                  step={0.01}
                  value={draft.areaM2 ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, areaM2: event.target.value || null })
                  }
                />
              </label>
            </div>
            <label>
              Байрны танилцуулга
              <textarea
                rows={4}
                maxLength={5000}
                value={content.description}
                onChange={(event) =>
                  setContent({ ...content, description: event.target.value })
                }
              />
            </label>
          </div>
          <div hidden={tab !== "images"}>
            <UnitImageFields
              projectId={project.id}
              value={content}
              onChange={(value) => {
                setContent(value);
                setDirty(true);
              }}
              onBusy={setUploading}
            />
          </div>
          <div hidden={tab !== "price"}>
            <label className="website-checkbox">
              <input
                type="checkbox"
                checked={content.useProjectPrice}
                onChange={(event) =>
                  setContent({
                    ...content,
                    useProjectPrice: event.target.checked,
                  })
                }
              />
              Төслийн нийтлэг м²-ийн үнэ ашиглах
            </label>
            {content.useProjectPrice ? (
              <p>1 м²: {formatUnitPrice(rate)}</p>
            ) : (
              <label>
                Энэ байрны 1 м²-ийн үнэ, ₮
                <input
                  type="number"
                  min={0}
                  max={1000000000}
                  step={0.01}
                  value={draft.pricePerM2 ?? ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      pricePerM2: event.target.value || null,
                    })
                  }
                />
              </label>
            )}
            <p className="unit-editor-total">
              Нийт үнэ: <strong>{formatUnitPrice(total)}</strong>
            </p>
            <label>
              Төлбөрийн тусгай нөхцөл
              <textarea
                rows={4}
                maxLength={3000}
                placeholder="Хоосон бол төслийн нийтлэг нөхцөл харагдана."
                value={content.paymentTerms}
                onChange={(event) =>
                  setContent({ ...content, paymentTerms: event.target.value })
                }
              />
            </label>
            <label>
              Борлуулалтын төлөв
              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft({ ...draft, status: event.target.value })
                }
              >
                {[
                  ["AVAILABLE", "Боломжтой"],
                  ["RESERVED", "Захиалгатай"],
                  ["SOLD", "Зарагдсан"],
                  ["HOLD", "Түр хаасан"],
                  ["CONTRACT_PENDING", "Гэрээ хүлээж буй"],
                  ["CANCELLED", "Цуцалсан"],
                ].map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="website-checkbox">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(event) =>
                  setDraft({ ...draft, published: event.target.checked })
                }
              />
              Хэрэглэгчид харуулах
            </label>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="building-alert">
            {error}
          </p>
        )}
      </form>
      <p>
        <Link href={preview} target="_blank">
          Хадгалсан байдлыг урьдчилан харах ↗
        </Link>
      </p>
      {discard && (
        <div role="alert" className="building-alert">
          <p>Хадгалаагүй өөрчлөлт байна.</p>
          <button type="button" onClick={() => setDiscard(false)}>
            Засаж үргэлжлүүлэх
          </button>
          <button type="button" onClick={onClose}>
            Хадгалахгүй хаах
          </button>
        </div>
      )}
    </BuildingDialog>
  );
}
