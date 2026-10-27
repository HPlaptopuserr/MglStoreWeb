"use client";
import { buildingPlaceUrl } from "@/features/building/model/building-place-url";
import { useState } from "react";
import {
  FileText,
  Images,
  BadgeDollarSign,
  Save,
  ExternalLink,
} from "lucide-react";
import { UnitBasicsFields } from "./UnitBasicsFields";
import "./unit-editor.css";
import Link from "next/link";
import {
  emptyUnitContent,
  unitRoomCount,
  type WebsiteInventoryUnit,
  type WebsiteProject,
} from "@mgl/types/building-website";
import {
  managementFetch,
  responseError,
} from "@/features/building/api/management-client";
import { BuildingDialog } from "../management/BuildingDialog";
import { UnitRoomInteriorFields } from "./UnitRoomInteriorFields";
import { UnitImageFields } from "./UnitImageFields";
import { unitImageSources } from "./unit-image-library";
import { getUnitDetail, formatUnitPrice } from "./unit-detail-model";

export function UnitDetailsEditor({
  initialTab = "basics",
  project,
  unit,
  floorNumber,
  blockId,
  regionId,
  onSaved,
  onClose,
}: {
  initialTab?: "basics" | "images";
  project: WebsiteProject;
  unit: WebsiteInventoryUnit;
  floorNumber: number;
  blockId: string;
  regionId: string;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const detail = getUnitDetail(project, blockId, floorNumber, regionId);
  const plan = detail?.plan;
  const sharedFloors =
    project.blocks
      .find((item) => item.id === blockId)
      ?.floors.filter(
        (item) =>
          project.website.plansByBlock[blockId]?.assignments[
            String(item.number)
          ] === plan?.id,
      )
      .map((item) => item.number)
      .sort((a, b) => a - b) ?? [];
  const [draft, setDraft] = useState({
    ...unit,
    typeLabel: detail?.entry.label ?? unit.typeLabel,
    rooms: detail?.entry.rooms ?? unit.rooms,
    areaM2: detail?.area == null ? unit.areaM2 : String(detail.area),
  });
  const [content, setContent] = useState(
    project.website.unitContent?.[unit.id] ?? emptyUnitContent(),
  );
  const [saving, setSaving] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  const [tab, setTab] = useState<string>(initialTab);
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
  const preview = buildingPlaceUrl(
    project,
    true,
    project.blocks.find((block) => block.id === blockId)?.name,
    floorNumber,
    unit.unitNo,
  );
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
            ...(plan
              ? { planRegion: { blockId, planId: plan.id, regionId } }
              : {}),
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
      subtitle={`${project.blocks.find((block) => block.id === blockId)?.name ?? "Блок"} · ${floorNumber}-р давхар · № ${draft.unitNo}`}
      onClose={() => {
        if (!saving && !uploading) {
          if (dirty) setDiscard(true);
          else onClose();
        }
      }}
      footer={
        <>
          <span className="unit-save-status" role="status">
            {uploading
              ? "Зураг байршуулж байна…"
              : dirty
                ? "Хадгалаагүй өөрчлөлттэй"
                : "Өөрчлөлт оруулаад хадгална уу"}
          </span>
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
            <Save size={16} aria-hidden="true" />{" "}
            {saving ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </>
      }
    >
      {plan && (
        <p className="unit-image-scope">
          {plan.name} · {sharedFloors.join(", ")}-р давхрууд. Нэр, зураг,
          танилцуулга, талбай, өрөөний тоо энэ планын ижил бүсэд нийтлэг
          хадгалагдана. Тоот, үнэ, төлөв зөвхөн № {unit.unitNo} байранд
          хамаарна.
        </p>
      )}
      <div
        className="unit-editor-tabs"
        role="group"
        aria-label="Байрны мэдээллийн хэсгүүд"
      >
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
            {id === "basics" ? (
              <FileText size={18} aria-hidden="true" />
            ) : id === "images" ? (
              <Images size={18} aria-hidden="true" />
            ) : (
              <BadgeDollarSign size={18} aria-hidden="true" />
            )}
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
            <UnitBasicsFields
              draft={draft}
              description={content.description}
              onDraftChange={setDraft}
              onDescriptionChange={(description) =>
                setContent({ ...content, description })
              }
            />
          </div>
          <div hidden={tab !== "images"}>
            <UnitImageFields
              sources={unitImageSources(project, unit.id)}
              unitLabel={`№ ${draft.unitNo} · ${draft.typeLabel || "Байр"}`}
              projectId={project.id}
              value={content}
              onChange={(value) => {
                setContent(value);
                setDirty(true);
              }}
              onBusy={setUploading}
            />
            <UnitRoomInteriorFields
              projectId={project.id}
              count={
                unitRoomCount(draft.rooms, draft.typeLabel ?? "") ??
                content.roomInteriors?.length ??
                0
              }
              value={content}
              onChange={(value) => {
                setContent(value);
                setDirty(true);
              }}
              onBusy={setUploading}
            />
          </div>
          <div className="unit-editor-section" hidden={tab !== "price"}>
            <div className="unit-section-heading">
              <h3>Үнэ ба нийтлэх тохиргоо</h3>
              <p>Талбай болон м²-ийн үнээр нийт үнэ бодогдоно.</p>
            </div>
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
      <p className="unit-editor-preview">
        <Link href={preview} target="_blank">
          <ExternalLink size={15} aria-hidden="true" /> Хадгалсан байдлыг
          урьдчилан харах
        </Link>
      </p>
      {discard && (
        <div role="alert" className="building-alert unit-discard-alert">
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
