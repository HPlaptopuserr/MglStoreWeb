"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { WebsiteProject } from "@mgl/types/building-website";
import { ArrowLeft, Building2, Plus, Minus } from "lucide-react";
import {
  type SalesUnit,
  type UnitStatus,
} from "../sales/demo-inventory";
import { resolveFloorPlanUnits } from "./floor-plan-units";
import { ViewerUnitList } from "../viewer/ViewerUnitList";
import { ViewerFloorNav } from "../viewer/ViewerFloorNav";
import { ViewerSelection } from "../viewer/ViewerSelection";
import { SavedFloorPlan } from "../plans/SavedFloorPlan";
import "../viewer/viewer.css";
import "./managed-site.css";
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
    [selectedId, setSelectedId] = useState<string | null>(searchParams.get("region") ?? searchParams.get("unit")),
    [hoveredId, setHoveredId] = useState<string | null>(null),
    [availableOnly, setAvailableOnly] = useState(false),
    [query, setQuery] = useState(""),
    [zoom, setZoom] = useState(1);
  const router = useRouter();
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);
  const library = block ? project.website.plansByBlock[block.id] : undefined;
  const plan = library?.plans.find(item => item.id === library.assignments[String(floor)]);
  const entries = useMemo(() => resolveFloorPlanUnits(
    block?.floors.find(item => item.number === floor)?.units ?? [], plan,
    { floorId: block?.floors.find(item => item.number === floor)?.id ?? "", bindings: project.website.unitBindings, publishedOnly: !preview },
  ), [block, floor, plan, project.website.unitBindings, preview]);
  const units = useMemo<SalesUnit[]>(() => entries.map(entry => ({
      id: plan ? entry.id : entry.unit?.id ?? entry.id,
      planShapeId: plan ? entry.id : undefined,
      label: entry.label,
      number: entry.unitNo ?? entry.unit?.unitNo ?? "",
      kind: entry.rooms ? "apartment" : floor < 0 ? "garage" : floor === 0 ? "parking" : "commercial",
      floor,
      rooms: entry.rooms,
      area: entry.areaM2 === null ? null : Number(entry.areaM2),
      price: Number(entry.unit?.priceTotal ?? 0),
      priceKnown: entry.unit?.priceTotal != null,
      status: entry.unit ? statuses[entry.unit.status] ?? "hold" : "hold",
      statusKnown: entry.unit !== undefined,
      planSlot: entry.unit?.planSlot,
    })), [entries, floor, plan]);
  const activeId = entries.find(entry => entry.id === selectedId || entry.unit?.id === selectedId)?.id ?? selectedId;
  const selected = units.find(unit => unit.id === activeId);
  const base = preview
    ? `/building/manage/${project.id}/preview`
    : `/building/projects/${project.id}`;
  const openUnit = (id: string) => router.push(`${base}?block=${block?.id}&floor=${floor}&region=${encodeURIComponent(id)}&view=unit`);
  if (!block) return <p>Блокийн мэдээлэл алга.</p>;
  return (
    <main className="property-viewer">
      <header className="viewer-toolbar">
        <Link href={base}>
          <ArrowLeft size={15} />
          Төсөл рүү буцах
        </Link>
        <div className="viewer-brand">
          <Building2 size={18} />
          <strong>{project.title}</strong>
          <span>{block.name}</span>
        </div>
        <span>{preview ? "УРЬДЧИЛАН ХАРАХ" : ""}</span>
      </header>
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
                      `${base}?block=${next.id}&floor=${next.floors[0]?.number ?? 1}`,
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
              <div
                className="viewer-plan-scale"
                style={{ transform: `scale(${zoom})` }}
              >
                {plan ? (
                  <SavedFloorPlan
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
            <div className="viewer-zoom">
              <button
                aria-label="План жижигрүүлэх"
                disabled={zoom <= 0.8}
                onClick={() => setZoom((value) => Math.max(0.8, value - 0.2))}
              >
                <Minus size={16} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                aria-label="План томруулах"
                disabled={zoom >= 1.6}
                onClick={() => setZoom((value) => Math.min(1.6, value + 0.2))}
              >
                <Plus size={16} />
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
          floors={block.floors.map((item) => item.number)}
          floor={floor}
          onChange={(value) => {
            setFloor(value);
            setSelectedId(null);
            setQuery("");
          }}
        />
      </div>

    </main>
  );
}
