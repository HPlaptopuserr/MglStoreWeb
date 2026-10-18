import { BlockLayoutList } from "./BlockLayoutList";
import Link from "next/link";
import { ArrowUpRight, Building2, X } from "lucide-react";
import type {
  BlockInventory,
  MasterplanInventory,
  MapBlock,
} from "./inventory";

interface Props {
  marker: MapBlock;
  block?: BlockInventory;
  mode: MasterplanInventory["mode"];
  selectedFloor: number | null;
  onSelectFloor: (floor: number | null) => void;
  onClose: () => void;
}
export function BlockInventoryPanel({
  marker,
  block,
  mode,
  selectedFloor,
  onSelectFloor,
  onClose,
}: Props) {
  const floor = block?.floors.find((item) => item.number === selectedFloor);
  const counts = floor ? floor.counts : block?.counts;
  return (
    <aside
      className="masterplan-panel"
      id="masterplan-block-details"
      aria-label={`${marker.label} блокийн мэдээлэл`}
    >
      <header>
        <div>
          <span className="masterplan-panel-eyebrow">
            <Building2 size={14} /> БЛОКИЙН МЭДЭЭЛЭЛ
          </span>
          <h3>{marker.label}</h3>
        </div>
        <button
          type="button"
          className="masterplan-close"
          onClick={onClose}
          aria-label="Блокийн мэдээллийг хаах"
        >
          <X size={18} />
        </button>
      </header>
      {mode === "provisional" && block && (
        <p className="masterplan-demo-note">Төслийн танилцуулгын мэдээлэл</p>
      )}
      {!block ? (
        <div className="masterplan-empty">
          <p>
            {mode === "error"
              ? "Борлуулалтын мэдээллийг ачаалж чадсангүй."
              : "Энэ блокийн бүртгэл хараахан холбогдоогүй байна."}
          </p>
          {mode === "error" && (
            <a href="/building#choose-block">Дахин ачаалах ↗</a>
          )}
        </div>
      ) : (
        <>
          <div className="masterplan-block-total">
            <div>
              <strong>{block.reportedFloorCount ?? block.floors.length}</strong>
              <span>давхар</span>
            </div>
            <div>
              <strong>
                {block.reportedUnitCount ?? block.counts?.total ?? "—"}
              </strong>
              <span>нийт байр</span>
            </div>
          </div>
          <label className="masterplan-floor-label">
            ДАВХАР СОНГОХ
            <select
              aria-label="Давхар сонгох"
              value={floor?.number ?? "all"}
              onChange={(event) =>
                onSelectFloor(
                  event.target.value === "all"
                    ? null
                    : Number(event.target.value),
                )
              }
            >
              <option value="all">Бүх давхар</option>
              {block.floors.map((item) => (
                <option key={item.number} value={item.number}>
                  {item.number < 0 ? `B${Math.abs(item.number)}` : item.number}{" "}
                  давхар ·{" "}
                  {item.counts
                    ? `${item.counts?.total ?? "—"} байр`
                    : "тоо хүлээгдэж байна"}
                </option>
              ))}
            </select>
          </label>
          <div className="masterplan-stats" aria-live="polite">
            <div>
              <span>
                {floor ? `${floor.number}-р давхрын нийт байр` : "Нийт байр"}
              </span>
              <strong>
                {counts?.total ??
                  (!floor ? block.reportedUnitCount : undefined) ??
                  "—"}
              </strong>
            </div>
            <div className="is-sold">
              <span>
                <i />
                Зарагдсан
              </span>
              <strong>{counts?.sold ?? "—"}</strong>
            </div>
            <div>
              <span>Зарагдаагүй</span>
              <strong>{counts?.unsold ?? "—"}</strong>
            </div>
            <div className="is-available">
              <span>
                <i />
                Сул байр
              </span>
              <strong>{counts?.available ?? "—"}</strong>
            </div>
            <div className="is-reserved">
              <span>
                <i />
                Захиалгатай / гэрээ хүлээж буй
              </span>
              <strong>{counts?.reserved ?? "—"}</strong>
            </div>
            {(counts?.other ?? 0) > 0 && (
              <div>
                <span>Бусад төлөв</span>
                <strong>{counts?.other ?? "—"}</strong>
              </div>
            )}
          </div>
          {!counts && (
            <p className="masterplan-panel-footnote">
              Давхар бүрийн айлын тоо, зарагдсан болон сул байрны мэдээлэл
              хүлээгдэж байна.
            </p>
          )}
          <div
            className={`masterplan-sales-bar${counts ? "" : " is-unknown"}`}
            aria-hidden="true"
          >
            <span
              style={{
                width: `${counts?.total ? (counts.sold / counts.total) * 100 : 0}%`,
              }}
            />
            <span
              style={{
                width: `${counts?.total ? (counts.reserved / counts.total) * 100 : 0}%`,
              }}
            />
          </div>
          {block.layoutsHref && <BlockLayoutList />}
          <div className="masterplan-floor-table">
            <table>
              <caption>Давхар бүрийн байрны мэдээлэл</caption>
              <thead>
                <tr>
                  <th scope="col">Давхар</th>
                  <th scope="col">Нийт</th>
                  <th scope="col">Зарагдсан</th>
                  <th scope="col">Сул</th>
                </tr>
              </thead>
              <tbody>
                {block.floors.map((item) => (
                  <tr
                    key={item.number}
                    className={
                      floor?.number === item.number ? "is-selected" : undefined
                    }
                  >
                    <th scope="row">
                      <button
                        type="button"
                        aria-pressed={floor?.number === item.number}
                        onClick={() => onSelectFloor(item.number)}
                      >
                        {item.number} давхар
                      </button>
                    </th>
                    <td>{item.counts?.total ?? "—"}</td>
                    <td>{item.counts?.sold ?? "—"}</td>
                    <td>{item.counts?.available ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!block.floors.length && (
            <p className="masterplan-empty">Давхар бүртгэгдээгүй байна.</p>
          )}
          {block.href && floor && (
            <Link
              className="masterplan-detail-link"
              href={`${block.href}&floor=${floor.number}`}
            >
              Давхрын байруудыг харах <ArrowUpRight size={16} />
            </Link>
          )}
          {block.layoutsHref && (
            <a className="masterplan-detail-link" href={block.layoutsHref}>
              Байрны 7 төлөвлөлт · 34.26–71.37 м² <ArrowUpRight size={16} />
            </a>
          )}
          {block.note && (
            <p className="masterplan-panel-footnote">{block.note}</p>
          )}
          {mode === "live" && (
            <p className="masterplan-panel-footnote">
              Нийтэд харагдах бүртгэлтэй байрнуудын тоо. Зарагдаагүйд
              захиалгатай болон бусад төлөв багтана.
            </p>
          )}
        </>
      )}
    </aside>
  );
}
