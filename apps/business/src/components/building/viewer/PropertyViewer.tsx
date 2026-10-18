"use client";
import { usePropertyViewer } from "./usePropertyViewer";
import Link from "next/link";
import { SavedFloorPlan, useSavedFloorPlan } from "../plans/SavedFloorPlan";
import {
  ArrowLeft,
  Building2,
  Check,
  Copy,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { floorLabel, money } from "../sales/demo-inventory";
import { UnitDetails } from "../sales/UnitDetails";
import { InteractiveFloorPlan } from "./InteractiveFloorPlan";
import { ViewerUnitList } from "./ViewerUnitList";
import { ViewerFloorNav, viewerFloors } from "./ViewerFloorNav";
import { ViewerSelection } from "./ViewerSelection";
import "./viewer.css";
export function PropertyViewer({
  initialFloor = 14,
  initialUnit = null,
}: {
  initialFloor?: number;
  initialUnit?: string | null;
}) {
  const {
    setUnits,
    floor,
    selectedId,
    setSelectedId,
    hoveredId,
    setHoveredId,
    availableOnly,
    setAvailableOnly,
    query,
    setQuery,
    zoom,
    setZoom,
    detailsOpen,
    setDetailsOpen,
    copyStatus,
    floorUnits,
    selected,
    minimumPrice,
    changeFloor,
    copyLink,
  } = usePropertyViewer(initialFloor, initialUnit);
  const savedPlan = useSavedFloorPlan(floor);
  return (
    <main className="property-viewer">
      <header className="viewer-toolbar">
        <Link href="/building/demo#choose-floor">
          <ArrowLeft size={15} />
          Буцах
        </Link>
        <div className="viewer-brand">
          <Building2 size={19} />
          <strong>ӨРГӨӨ 16</strong>
          <span>A БЛОК</span>
        </div>
        <div>
          <button aria-label="Холбоос хуулах" onClick={() => void copyLink()}>
            {copyStatus === "Холбоос хууллаа" ? (
              <Check size={15} />
            ) : (
              <Copy size={15} />
            )}
            <span>Холбоос хуулах</span>
          </button>
          <Link href="/building/demo#choose-floor" aria-label="Харагдац хаах">
            <X size={15} />
            <span>Хаах</span>
          </Link>
        </div>
      </header>
      <div className="viewer-layout">
        <aside className="viewer-sidebar">
          <div className="viewer-floor-select">
            <label>
              <select
                aria-label="Давхрын дугаар"
                value={floor}
                onChange={(event) => changeFloor(Number(event.target.value))}
              >
                {viewerFloors.map((value) => (
                  <option key={value} value={value}>
                    {floorLabel(value)}
                  </option>
                ))}
              </select>
            </label>
            <span>
              {floor > 3 ? "ОРОН СУУЦ" : floor > 0 ? "ҮЙЛЧИЛГЭЭ" : "ЗОГСООЛ"}
            </span>
          </div>
          <div className="viewer-sidebar-heading">
            <h1>
              {floor > 3
                ? "Давхрын байрууд"
                : floor > 0
                  ? "Үйлчилгээний талбай"
                  : "Автомашины зогсоол"}
            </h1>
            <p>A блок · {floorLabel(floor)}</p>
          </div>
          <ViewerUnitList
            units={floorUnits}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={setSelectedId}
            onHover={setHoveredId}
            availableOnly={availableOnly}
            onFilter={setAvailableOnly}
            query={query}
            onQuery={setQuery}
          />
          <div className="viewer-sidebar-note">
            ЖИШЭЭ ТӨСӨЛ
            <br />
            <span>Үнэ, план, борлуулалтын төлөв нь тест өгөгдөл.</span>
          </div>
        </aside>
        <section className="viewer-canvas" aria-label="Давхрын план">
          <div className="viewer-canvas-heading">
            <div>
              <span>A БЛОК / {floorLabel(floor).toUpperCase()}</span>
              <h2>
                {floor > 3
                  ? "Таны шинэ орон зай"
                  : floor > 0
                    ? "Бизнесийн шинэ орон зай"
                    : "Таны автомашины орон зай"}
              </h2>
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
            <div className="viewer-compass" aria-label="Жишээ планын хойд зүг">
              ↑<span>ХОЙД</span>
            </div>
            <div className="viewer-plan-viewport">
              <div
                className="viewer-plan-scale"
                style={{ transform: `scale(${zoom})` }}
              >
                {savedPlan.loading ? (
                  <p role="status">План ачаалж байна…</p>
                ) : savedPlan.plan ? (
                  <SavedFloorPlan
                    plan={savedPlan.plan}
                    units={floorUnits}
                    selectedId={selectedId}
                    hoveredId={hoveredId}
                    onSelect={setSelectedId}
                    onHover={setHoveredId}
                  />
                ) : floor > 3 ? (
                  <InteractiveFloorPlan
                    units={floorUnits}
                    selectedId={selectedId}
                    hoveredId={hoveredId}
                    onSelect={setSelectedId}
                    onHover={setHoveredId}
                  />
                ) : (
                  <div
                    className={`viewer-space-plan ${floor <= 0 ? "parking" : ""}`}
                  >
                    <span>{floorLabel(floor)}</span>
                    <Building2 size={64} strokeWidth={1} />
                    <h3>
                      {floor > 0 ? "400 м²" : `${floorUnits.length} автомашин`}
                    </h3>
                    <p>
                      {floor > 0
                        ? "Бүтэн давхрын үйлчилгээний талбай"
                        : floor < 0
                          ? "Дулаан гарааш"
                          : "Гадна зогсоол"}
                    </p>
                    {floor > 0 && (
                      <button onClick={() => setSelectedId(floorUnits[0].id)}>
                        № {floorUnits[0].number} сонгох
                      </button>
                    )}
                    <small>Жишээ схем · Бодит план зураг нэмэгдээгүй</small>
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
              <button
                aria-label="План хэмжээг сэргээх"
                onClick={() => setZoom(1)}
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>
          {selected ? (
            <ViewerSelection
              unit={selected}
              onDetails={() => setDetailsOpen(true)}
            />
          ) : (
            <div className="viewer-bottom">
              <div>
                <strong>
                  {Number.isFinite(minimumPrice)
                    ? `${money(minimumPrice)}-с`
                    : "Боломжтой нэгж алга"}
                </strong>
                <span>ЖИШЭЭ ЭХЛЭХ ҮНЭ</span>
              </div>
              <p>
                План эсвэл жагсаалтаас
                <br />
                байраа сонгоорой.
              </p>
            </div>
          )}
          <p className="viewer-copy-status" role="status">
            {copyStatus || savedPlan.error}
          </p>
        </section>
        <ViewerFloorNav floor={floor} onChange={changeFloor} />
      </div>
      {detailsOpen && selected && (
        <UnitDetails
          unit={selected}
          onClose={() => setDetailsOpen(false)}
          onReserve={() => {
            setUnits((previous) =>
              previous.map((unit) =>
                unit.id === selected.id && unit.status === "available"
                  ? { ...unit, status: "reserved" }
                  : unit,
              ),
            );
            setDetailsOpen(false);
          }}
        />
      )}
    </main>
  );
}
