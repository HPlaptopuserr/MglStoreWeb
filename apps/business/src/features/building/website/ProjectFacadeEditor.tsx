"use client";
import { useState } from "react";
import type { WebsiteProject } from "@mgl/types/building-website";
import { FloorElevation } from "./FloorElevation";
import { BlockFacadeEditor } from "../management/BlockFacadeEditor";
import type { BlockDraft } from "../management/inventory-draft";
import { managementFetch, responseError } from "@/features/building/api/management-client";
export function ProjectFacadeEditor({
  project,
  blockId,
  onSaved,
}: {
  project: WebsiteProject;
  blockId: string;
  onSaved: () => void;
}) {
  const block = project.blocks.find((item) => item.id === blockId)!;
  const [draft, setDraft] = useState<BlockDraft>(() => ({
    id: block.id,
    name: block.name,
    floorCount: String(block.floors.length),
    types: [],
    facade: project.website.facadesByBlock?.[block.id],
    floors: block.floors.map((floor) => ({
      id: floor.id,
      number: String(floor.number),
      units: floor.units.map((unit) => ({
        id: unit.id,
        unitNo: unit.unitNo,
        rooms: String(unit.rooms ?? ""),
        areaM2: String(unit.areaM2 ?? ""),
        typeLabel: unit.typeLabel ?? "",
      })),
    })),
  }));
  const [custom, setCustom] = useState(Boolean(draft.facade));
  const [floor, setFloor] = useState(block.floors.at(-1)?.number ?? 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await managementFetch(
        `admin/projects/${project.id}/website`,
        {
          method: "PATCH",
          body: JSON.stringify({
            updatedAt: project.updatedAt,
            facade: { blockId, value: draft.facade },
          }),
        },
      );
      if (!response.ok)
        throw new Error(
          await responseError(response, "Фасад хадгалж чадсангүй."),
        );
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="facade-workspace">
      <div className="facade-workspace-toolbar">
        <div>
          <strong>{block.name} блок</strong>
          <span>
            {block.floors.length} давхар ·{" "}
            {custom ? "Өөрийн зураг" : "Автомат фасад"}
          </span>
        </div>
        <button
          type="button"
          className="building-secondary"
          onClick={() => setCustom(!custom)}
        >
          {custom ? "Автомат загвар харах" : "Өөрийн зураг оруулах"}
        </button>
      </div>
      {!custom && (
        <div className="facade-default-layout">
          <div className="facade-default-help">
            <span className="facade-ready">✓ Бэлэн загвар</span>
            <h3>Фасад автоматаар үүссэн</h3>
            <p>
              Давхрын тоонд тохируулсан дүрслэл. Зураг оруулах шаардлагагүй.
            </p>
            <label>
              Давхар харах
              <select
                value={floor}
                onChange={(event) => setFloor(Number(event.target.value))}
              >
                {[...block.floors].reverse().map((item) => (
                  <option key={item.id} value={item.number}>
                    {item.number < 0 ? `B${-item.number}` : item.number} давхар
                  </option>
                ))}
              </select>
            </label>
            <p>
              Давхрын план бэлтгэхийн тулд доорх «Давхрын план» товчийг дарна
              уу.
            </p>
            {draft.facade && (
              <p>
                Өмнө хадгалсан өөрийн зураг хэрэглэгчийн хуудсанд хэвээр
                ашиглагдана.
              </p>
            )}
          </div>
          <FloorElevation
            floors={block.floors}
            selected={floor}
            onSelect={setFloor}
          />
        </div>
      )}
      <div hidden={!custom}>
        <fieldset
          disabled={busy}
          style={{ border: 0, padding: 0, minWidth: 0 }}
        >
          <BlockFacadeEditor block={draft} onChange={setDraft} standalone />
        </fieldset>
        {error && (
          <p role="alert" className="building-alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="building-primary"
          disabled={busy || !draft.facade}
          onClick={() => void save()}
        >
          {busy ? "Хадгалж байна…" : "Фасад хадгалах"}
        </button>
      </div>
    </section>
  );
}
