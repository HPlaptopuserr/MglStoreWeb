
import type { BlockInventory, MapBlock } from "./inventory";

export function BlockHoverCard({
  marker,
  block,
}: {
  marker: MapBlock;
  block?: BlockInventory;
}) {
  return (
    <div
      id={`block-preview-${marker.key}`}
      className="masterplan-hover-card"
      role="tooltip"
    >
      <div className="masterplan-hover-title">
        <span>{marker.label}</span>
        <small>БЛОКИЙН ТОВЧ МЭДЭЭЛЭЛ</small>
      </div>
      {block ? (
        <>
          <div className="masterplan-hover-total">
            <span>{block.plannedUnitCount !== undefined ? "Зураглал дахь айл" : "Нийт айл"}</span>
            <strong>
              {block.plannedUnitCount ?? block.reportedUnitCount ?? block.counts?.total ?? "—"}
            </strong>
          </div>
          <dl className="masterplan-hover-stats">
            <div>
              <dt>Давхар</dt>
              <dd>{block.reportedFloorCount ?? block.floors.length}</dd>
            </div>
            <div>
              <dt>Зарагдсан</dt>
              <dd>{block.counts?.sold ?? "—"}</dd>
            </div>
            <div>
              <dt>Зарагдаагүй</dt>
              <dd>{block.counts?.unsold ?? "—"}</dd>
            </div>
            <div>
              <dt>Сул байр</dt>
              <dd>{block.counts?.available ?? "—"}</dd>
            </div>
          </dl>
          {block.plannedUnitCount !== undefined && <div className="masterplan-hover-note">
            <p>1–4-р давхар · Үйлчилгээ</p>
            <p>5–10-р давхар · Давхар бүр 14 айл</p>
            <p>11–16-р давхар · Давхар бүр 12 айл</p>
            <p>Танилцуулгын нийт: {block.reportedUnitCount} айл. Зураглалтай зөрүүтэй.</p>
          </div>}
          {!block.counts && (
            <p className="masterplan-hover-note">
              Борлуулалтын тоо хүлээгдэж байна.
            </p>
          )}
          <p className="masterplan-hover-action">
            Дэлгэрэнгүй харах бол товшино уу ↗
          </p>
        </>
      ) : (
        <p className="masterplan-hover-note">Мэдээлэл хараахан оруулаагүй.</p>
      )}
    </div>
  );
}
