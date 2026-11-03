"use client";
import { useState, useRef } from "react";
import type { BlockDraft } from "./inventory-draft";
import { FacadeFloorEditor } from "./FacadeFloorEditor";
import { PlanCanvas } from "../plans/PlanCanvas";
import { rectPoints, shapeBounds, type PlanShape } from "../plans/plan-model";
import { readPlanImage } from "../plans/plan-storage";
import type { BuildingFacade } from "@mgl/types/building-website";
import "../plans/plan-editor.css";
import "./block-facade.css";
export function BlockFacadeEditor({
  block,
  onChange,
  standalone = false,
}: {
  standalone?: boolean;
  block: BlockDraft;
  onChange: (block: BlockDraft) => void;
}) {
  const [floorId, setFloorId] = useState(block.floors[0]?.id ?? ""),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const facade = block.facade;
  const floor = block.floors.find((f) => f.id === floorId) ?? block.floors[0];
  const selected = facade?.regions.find((r) => r.id === selectedId);
  function update(value: BuildingFacade) {
    onChange({ ...block, facade: value });
  }
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    try {
      const image = await readPlanImage(file);
      update({
        image,
        regions: facade?.regions ?? [],
        floorRegions: facade?.floorRegions,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Зураг оруулж чадсангүй");
    }
  }
  function add(unitNo: string) {
    if (!facade || !floor) return;
    const found = facade.regions.find(
      (r) => r.floor === Number(floor.number) && r.unitNo === unitNo,
    );
    if (found) {
      setSelectedId(found.id);
      return;
    }
    const id = crypto.randomUUID();
    update({
      ...facade,
      regions: [
        ...facade.regions,
        {
          id,
          floor: Number(floor.number),
          unitNo,
          x: 420,
          y: 350,
          width: 95,
          height: 55,
        },
      ],
    });
    setSelectedId(id);
  }
  const shapes: PlanShape[] = (facade?.regions ?? []).map((r) => ({
    id: r.id,
    kind: "unit",
    label: `${r.floor}Д · №${r.unitNo}`,
    unitSlot: null,
    points: rectPoints(r.x, r.y, r.width, r.height),
  }));
  function move(shapes: PlanShape[]) {
    if (!facade) return;
    update({
      ...facade,
      regions: facade.regions.map((r) => {
        const shape = shapes.find((s) => s.id === r.id);
        return shape ? { ...r, ...shapeBounds(shape) } : r;
      }),
    });
  }
  return (
    <div className="block-facade-editor">
      {facade && (
        <FacadeFloorEditor
          facade={facade}
          count={Math.max(
            0,
            ...block.floors.map((floor) => Number(floor.number)),
          )}
          onChange={update}
        />
      )}
      <header>
        <h3>Барилгын зураг дээр байруудаа байрлуулах</h3>
        <p>
          PNG/JPG зураг оруулаад, давхраа сонгож тоот дээр дарна. Үүссэн жижиг
          хүрээг зураг дээр чирж байрлуулаарай.
        </p>
      </header>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="facade-upload-row">
        <button
          type="button"
          className="building-primary"
          onClick={() => input.current?.click()}
        >
          {facade ? "Зураг солих" : "Барилгын PNG/JPG зураг оруулах"}
        </button>
        <small>PNG / JPG / WebP · 20 MB хүртэл</small>
      </div>
      {error && <p role="alert">{error}</p>}
      {!facade ? (
        <div className="facade-empty">
          Барилгын нүүрэн талын зураг эсвэл рендерээ оруулаарай. Давхар, тоотууд
          өмнөх алхмаас автоматаар орж ирнэ.
        </div>
      ) : (
        <div className="facade-editor-grid">
          <div>
            <PlanCanvas
              plan={{
                id: block.id,
                name: block.name,
                background: facade.image,
                shapes,
              }}
              tool="select"
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={move}
            />
            <p>
              {facade.regions.length} /{" "}
              {block.floors.reduce((n, f) => n + f.units.length, 0)} байр
              тэмдэглэсэн · Хүрээг чирж эсвэл сумтай товчоор зөөнө.
            </p>
          </div>
          <aside>
            <label>
              Давхар
              <select
                value={floor?.id ?? ""}
                onChange={(e) => setFloorId(e.target.value)}
              >
                {block.floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.number}-р давхар
                  </option>
                ))}
              </select>
            </label>
            <p>Тоот дээр дарж хүрээ нэмэх / сонгох</p>
            <div className="facade-unit-buttons">
              {floor?.units.map((unit) => {
                const region = facade.regions.find(
                  (r) =>
                    r.floor === Number(floor.number) &&
                    r.unitNo === unit.unitNo,
                );
                return (
                  <button
                    type="button"
                    key={unit.id}
                    aria-pressed={region?.id === selectedId}
                    onClick={() => add(unit.unitNo)}
                  >
                    {region ? "✓" : "+"} {unit.unitNo}
                    <small>{unit.areaM2} м²</small>
                  </button>
                );
              })}
            </div>
            {selected && (
              <div className="facade-properties">
                <strong>
                  № {selected.unitNo} · {selected.floor}-р давхар
                </strong>
                {(
                  [
                    ["x", "X байрлал"],
                    ["y", "Y байрлал"],
                    ["width", "Өргөн"],
                    ["height", "Өндөр"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      value={selected[key]}
                      min={key === "width" || key === "height" ? 2 : 0}
                      max={
                        key === "x"
                          ? 1000 - selected.width
                          : key === "y"
                            ? 800 - selected.height
                            : key === "width"
                              ? 1000 - selected.x
                              : 800 - selected.y
                      }
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        const max =
                          key === "x"
                            ? 1000 - selected.width
                            : key === "y"
                              ? 800 - selected.height
                              : key === "width"
                                ? 1000 - selected.x
                                : 800 - selected.y;
                        if (
                          Number.isFinite(n) &&
                          n >= (key === "width" || key === "height" ? 2 : 0) &&
                          n <= max
                        )
                          update({
                            ...facade,
                            regions: facade.regions.map((r) =>
                              r.id === selected.id ? { ...r, [key]: n } : r,
                            ),
                          });
                      }}
                    />
                  </label>
                ))}
                <button
                  type="button"
                  className="building-secondary"
                  onClick={() => {
                    update({
                      ...facade,
                      regions: facade.regions.filter(
                        (r) => r.id !== selected.id,
                      ),
                    });
                    setSelectedId(null);
                  }}
                >
                  Хүрээг хасах
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
      <p>
        {standalone
          ? "Өөрчлөлтөө серверт хадгалахын тулд «Фасад хадгалах» дарна уу."
          : "Энд хийсэн өөрчлөлт блокийг нэмээд төслөө хадгалахад серверт хадгалагдана."}
      </p>
    </div>
  );
}
