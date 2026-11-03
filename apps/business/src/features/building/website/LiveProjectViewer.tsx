"use client";
import { buildingPlaceUrl } from "@/features/building/model/building-place-url";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { WebsiteProject } from "@mgl/types/building-website";
import { ArrowLeft, Building2, Plus, Minus, Scan } from "lucide-react";
import { type SalesUnit, type UnitStatus } from "../sales/demo-inventory";
import { getProjectFloorInventory } from "./project-floor-inventory";
import { ViewerUnitList } from "../viewer/ViewerUnitList";
import { ViewerFloorNav } from "../viewer/ViewerFloorNav";
import { ViewerSelection } from "../viewer/ViewerSelection";
import { SavedFloorPlan } from "../plans/SavedFloorPlan";
import "../viewer/viewer.css";
import "./managed-site.css";
import "./live-plan-viewer.css";
const statuses: Record<string, UnitStatus> = {
  AVAILABLE: "available",
  RESERVED: "reserved",
  SOLD: "sold",
  CONTRACT_PENDING: "contract",
  HOLD: "hold",
  CANCELLED: "cancelled",
};
export function LiveProjectViewer({
  project,
  blockId,
  initialFloor,
  preview = false,
}: {
  project: WebsiteProject;
  blockId: string;
  initialFloor: number;
  preview?: boolean;
}) {
  const block =
    project.blocks.find((item) => item.id === blockId) ?? project.blocks[0];
  const searchParams = useSearchParams();
  const [floor, setFloor] = useState(initialFloor),
    [selectedId, setSelectedId] = useState<string | null>(
      searchParams.get("region") ?? searchParams.get("unit"),
    ),
    [hoveredId, setHoveredId] = useState<string | null>(null),
    [availableOnly, setAvailableOnly] = useState(false),
    [query, setQuery] = useState(""),
    [zoom, setZoom] = useState(1),
    [mobilePanel, setMobilePanel] = useState<"plan" | "units">("plan");
  const router = useRouter();
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);
  const { plan, entries } = useMemo(
    () => getProjectFloorInventory(project, blockId, floor, !preview),
    [project, blockId, floor, preview],
  );
  const units = useMemo<SalesUnit[]>(
    () =>
      entries.map((entry) => ({
        id: plan ? entry.id : (entry.unit?.id ?? entry.id),
        planShapeId: plan ? entry.id : undefined,
        label: entry.label,
        number: entry.unitNo ?? entry.unit?.unitNo ?? "",
        kind: entry.rooms
          ? "apartment"
          : floor < 0
            ? "garage"
            : floor === 0
              ? "parking"
              : "commercial",
        floor,
        rooms: entry.rooms,
        area: entry.areaM2 === null ? null : Number(entry.areaM2),
        price: Number(entry.unit?.priceTotal ?? 0),
        priceKnown: entry.unit?.priceTotal != null,
        status: entry.unit ? (statuses[entry.unit.status] ?? "hold") : "hold",
        statusKnown: entry.unit !== undefined,
        planSlot: entry.unit?.planSlot,
      })),
    [entries, floor, plan],
  );
  const activeId =
    entries.find(
      (entry) => entry.id === selectedId || entry.unit?.id === selectedId,
    )?.id ?? selectedId;
  const selected = units.find((unit) => unit.id === activeId);
  const openUnit = (id: string) => {
    const entry = entries.find(
      (item) => item.id === id || item.unit?.id === id,
    );
    if (block && entry?.unit)
      router.push(
        buildingPlaceUrl(
          project,
          preview,
          block.name,
          floor,
          entry.unit.unitNo,
        ),
      );
  };
  function changeFloor(value: number) {
    setFloor(value);
    setSelectedId(null);
    setHoveredId(null);
    setQuery("");
    setZoom(1);
    router.replace(buildingPlaceUrl(project, preview, block?.name, value));
  }
  if (!block) return <p>Блокийн мэдээлэл алга.</p>;
  return (
    <main
      className="property-viewer live-property-viewer"
      data-mobile-panel={mobilePanel}
    >
      <header className="viewer-toolbar">
        <Link href={buildingPlaceUrl(project, preview, block.name)}>
          <ArrowLeft size={15} />
          Давхар сонгох
        </Link>
        <div className="viewer-brand">
          <Building2 size={18} />
          <strong>{project.title}</strong>
          <span>
            {block.name} ·{" "}
            {floor > 0
              ? `${floor}-р давхар`
              : floor < 0
                ? `B${-floor}`
                : "Гадна талбай"}
          </span>
        </div>
        <div className="live-viewer-toolbar-actions">
          <label className="live-floor-picker">
            Давхар
            <select
              aria-label="План харах давхар"
              value={floor}
              onChange={(event) => changeFloor(Number(event.target.value))}
            >
              {[...block.floors]
                .sort((left, right) => right.number - left.number)
                .map((item) => (
                  <option key={item.id} value={item.number}>
                    {item.number < 0
                      ? `B${-item.number}`
                      : item.number === 0
                        ? "Гадна"
                        : item.number}
                  </option>
                ))}
            </select>
          </label>
          {preview && (
            <span className="live-viewer-preview">Урьдчилан харах</span>
          )}
        </div>
      </header>
      <div className="live-viewer-mobile-tabs" aria-label="Харах горим">
        <button
          type="button"
          aria-pressed={mobilePanel === "plan"}
          onClick={() => setMobilePanel("plan")}
        >
          Давхрын план
        </button>
        <button
          type="button"
          aria-pressed={mobilePanel === "units"}
          onClick={() => setMobilePanel("units")}
        >
          Байрууд ({units.length})
        </button>
      </div>
      <div className="viewer-layout">
        <aside className="viewer-sidebar">
          <div className="viewer-floor-select">
            <label>
              Блок
              <select
                aria-label="Блок сонгох"
                value={block.id}
                onChange={(event) => {
                  const next = project.blocks.find(
                    (item) => item.id === event.target.value,
                  );
                  if (next)
                    router.push(
                      buildingPlaceUrl(
                        project,
                        preview,
                        next.name,
                        next.floors[0]?.number ?? 1,
                      ),
                    );
                }}
              >
                {project.blocks.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="viewer-sidebar-heading">
            <h1>
              {floor < 0
                ? `B${-floor}`
                : floor === 0
                  ? "Гадна талбай"
                  : `${floor}-р давхар`}
            </h1>
            <p>
              {block.name} · {units.length} нэгж
            </p>
          </div>
          <ViewerUnitList
            key={`${block.id}:${floor}`}
            compact
            units={units}
            selectedId={activeId}
            hoveredId={hoveredId}
            onSelect={openUnit}
            onHover={setHoveredId}
            availableOnly={availableOnly}
            onFilter={setAvailableOnly}
            query={query}
            onQuery={setQuery}
          />
          <div className="viewer-sidebar-note">
            {project.website.content.phone || "Борлуулалтын мэдээлэл"}
            <br />
            <span>Төлөв 30 секунд тутам шинэчлэгдэнэ.</span>
          </div>
        </aside>
        <section className="viewer-canvas">
          <div className="viewer-canvas-heading">
            <div>
              <span>{block.name.toUpperCase()}</span>
              <h2>Таны сонгох орон зай</h2>
            </div>
            <div className="viewer-legend">
              <span>
                <i />
                Боломжтой
              </span>
              <span>
                <i />
                Захиалгатай
              </span>
              <span>
                <i />
                Зарагдсан
              </span>
            </div>
          </div>
          <div className="viewer-stage">
            <div className="viewer-plan-viewport">
              <div className="viewer-plan-space">
                <div
                  className="viewer-plan-scale"
                  style={{ "--plan-zoom": zoom } as CSSProperties}
                >
                  {plan ? (
                    <SavedFloorPlan
                      key={`${block.id}:${floor}:${plan.id}`}
                      fitToViewport
                      plan={plan}
                      units={units}
                      selectedId={activeId}
                      hoveredId={hoveredId}
                      onSelect={openUnit}
                      onHover={setHoveredId}
                    />
                  ) : (
                    <div className="managed-viewer-empty">
                      <Building2 size={40} />
                      <h2>План хараахан нэмэгдээгүй байна</h2>
                      <p>Байрны мэдээллийг жагсаалтаас сонгож үзнэ үү.</p>
                      {preview && (
                        <Link
                          href={`/building/manage/${project.id}/plans/${block.id}`}
                        >
                          План зураг оруулах →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="viewer-zoom">
              <button
                aria-label="План жижигрүүлэх"
                disabled={zoom <= 0.75}
                onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))}
              >
                <Minus size={16} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                aria-label="План томруулах"
                disabled={zoom >= 2.5}
                onClick={() => setZoom((value) => Math.min(2.5, value + 0.25))}
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                aria-label="Планыг дэлгэцэд багтаах"
                onClick={() => setZoom(1)}
              >
                <Scan size={17} />
              </button>
            </div>
          </div>
          {selected ? (
            <ViewerSelection
              unit={selected}
              isDemo={false}
              onDetails={() => openUnit(selected.id)}
            />
          ) : (
            <div className="viewer-bottom">
              <p>Зураг дээрх байрны хүрээ эсвэл жагсаалтаас сонгоно уу.</p>
            </div>
          )}
        </section>
        <ViewerFloorNav
          compact
          floors={[...block.floors]
            .sort((left, right) => right.number - left.number)
            .map((item) => item.number)}
          floor={floor}
          onChange={changeFloor}
        />
      </div>
    </main>
  );
}
