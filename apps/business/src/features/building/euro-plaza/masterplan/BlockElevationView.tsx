"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Building2 } from "lucide-react";
import Link from "next/link";
import { TowerElevation } from "./TowerElevation";
import { FloorPlanDetails } from "./FloorPlanDetails";
import { countPlannedUnits } from "./floor-plans";
import { FloorPlanExplorer } from "./FloorPlanExplorer";
import type { BlockInventory, MapBlock } from "./inventory";

export default function BlockElevationView({
  marker,
  block,
  onClose,
}: {
  marker: MapBlock;
  block?: BlockInventory;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<"facade" | "plan">("facade");
  const [selected, setSelected] = useState<number | null>(null);
  const floorCount =
    block?.reportedFloorCount ??
    (block?.floors.length
      ? Math.max(...block.floors.map((floor) => floor.number))
      : 0);
  const floor = block?.floors.find((item) => item.number === selected);
  const plan = floor?.plan;
  const counts = selected === null ? block?.counts : floor?.counts;
  useEffect(() => {
    const current = dialog.current;
    const overflow = document.body.style.overflow;
    current?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      current?.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="block-elevation-dialog"
      aria-labelledby="elevation-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {view === "plan" && selected !== null && block ? <FloorPlanExplorer key={selected} block={block} floor={selected} onFloorChange={setSelected} onBack={() => setView("facade")} onClose={onClose} /> : <div className="block-elevation-scene">
        <aside className="block-elevation-sidebar">
          <button
            type="button"
            className="block-elevation-back"
            onClick={onClose}
            autoFocus
          >
            <ArrowLeft size={16} /> БУЦАХ
          </button>
          <p className="block-elevation-eyebrow">БЛОК → ДАВХАР → БАЙР</p>
          <h2 id="elevation-title">Байр сонгох</h2>
          <dl className="block-elevation-summary">
            <div>
              <dt>Барилга</dt>
              <dd>{marker.label}</dd>
            </div>
            <div>
              <dt>{block?.plannedUnitCount !== undefined ? "Зураглал дахь айл" : "Нийт айл"}</dt>
              <dd>{block?.plannedUnitCount ?? block?.reportedUnitCount ?? block?.counts?.total ?? "—"}</dd>
            </div>
            <div>
              <dt>Давхар</dt>
              <dd>{floorCount || "—"}</dd>
            </div>
          </dl>
          {block?.plannedUnitCount !== undefined && <p className="block-elevation-note">{block.note}</p>}
          {floorCount > 0 ? (
            <>
              <label className="block-elevation-select">
                Давхар сонгох
                <select
                  value={selected ?? ""}
                  onChange={(event) =>
                    (setSelected(event.target.value ? Number(event.target.value) : null), setView(event.target.value ? "plan" : "facade"))
                  }
                >
                  <option value="">Фасад дээрээс сонгоно уу</option>
                  {Array.from(
                    { length: floorCount },
                    (_, index) => floorCount - index,
                  ).map((number) => (
                    <option key={number} value={number}>
                      {number}-р давхар
                    </option>
                  ))}
                </select>
              </label>
              <div className="block-elevation-floor-info" aria-live="polite">
                <h3>
                  {selected === null
                    ? "Давхраа сонгоорой"
                    : `${selected}-р давхар`}
                </h3>
                <p>
                  {selected === null
                    ? "Барилгын давхар дээр хулганаа аваачаад, дарж сонгоно уу."
                    : selected <= 4 && block?.layoutsHref
                      ? "Худалдаа, үйлчилгээний зориулалттай хэсэг."
                      : "Орон сууцны төлөвлөлт болон борлуулалтын мэдээлэл."}
                </p>
                <dl>
                  {[
                    ["Нийт байр", counts?.total ?? (plan ? countPlannedUnits(plan) : undefined)],
                    ["Зарагдсан", counts?.sold],
                    ["Зарагдаагүй", counts?.unsold],
                    ["Сул байр", counts?.available],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value ?? "—"}</dd>
                    </div>
                  ))}
                </dl>
                {!counts && (
                  <small>
                    Борлуулалтын төлөв ирээгүй. «—» нь зарагдсан эсвэл сул байрны тоо 0 гэсэн утга биш.
                  </small>
                )}
              </div>
              {plan && <FloorPlanDetails plan={plan} />}
              {block?.href && selected !== null && floor && (
                <Link
                  className="block-elevation-link"
                  href={`${block.href}&floor=${selected}`}
                  onClick={onClose}
                >
                  Давхрын байрууд <ArrowUpRight size={16} />
                </Link>
              )}
            </>
          ) : (
            <p className="block-elevation-note">
              Энэ блокийн фасад болон давхрын мэдээлэл хараахан оруулаагүй
              байна.
            </p>
          )}
        </aside>
        <div className="block-elevation-building">
          <div className="block-elevation-building-heading">
            <span>
              <Building2 size={18} /> MGL RESIDENCES
            </span>
            <h3>{marker.label}</h3>
          </div>
          {plan && <div className="floor-plan-view-switch" aria-label="Харагдац сонгох">
            <button type="button" aria-pressed={view === "facade"} onClick={() => setView("facade")}>Барилгын фасад</button>
            <button type="button" aria-pressed={view === "plan"} onClick={() => setView("plan")}>Давхрын зураг</button>
          </div>}
          {floorCount > 0 ? (
            <TowerElevation
              floorCount={floorCount}
              selected={selected}
              onSelect={(number) => { setSelected(number); setView("plan"); dialog.current?.scrollTo(0, 0); }}
            />
          ) : (
            <div className="block-elevation-empty">
              <Building2 size={72} strokeWidth={1} />
              <p>Фасадын зураг хүлээгдэж байна</p>
            </div>
          )}
          <p className="block-elevation-caption">
            Фасадын загварчилсан дүрслэл · Давхар дээр дарж plan нээнэ үү
          </p>
        </div>
      </div>}
    </dialog>
  );
}
