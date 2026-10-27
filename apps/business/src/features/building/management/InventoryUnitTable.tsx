import type { BuildingInventoryUnit } from "@mgl/types";
import { currency } from "../dashboard/model";

export function InventoryUnitTable({
  units,
  statuses,
  onSelect,
  booking = false,
}: {
  booking?: boolean;
  units: BuildingInventoryUnit[];
  statuses: Readonly<Record<string, string>>;
  onSelect: (unit: BuildingInventoryUnit) => void;
}) {
  return (
    <div className="inventory-table-scroll">
      <table className="inventory-table">
        <caption>
          {booking
            ? "Захиалах байраа сонгоно уу · Тоот дээр дарж үргэлжлүүлэх"
            : "Байр, талбайн жагсаалт · Тоот дээр дарж дэлгэрэнгүйг харах"}
        </caption>
        <thead>
          <tr>
            {[
              "Төсөл / Блок",
              "Тоот",
              "Давхар",
              "Төрөл / Өрөө",
              "Талбай",
              "Нийт үнэ",
              "Борлуулалтын төлөв",
              "Нийтлэл",
            ].map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <tr key={unit.id} onClick={() => onSelect(unit)}>
              <td>
                <strong>{unit.floor.block.name}</strong>
                <small>{unit.floor.block.project.title}</small>
              </td>
              <td>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  className="inventory-unit-open"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(unit);
                  }}
                  aria-label={`${unit.floor.block.name}, ${unit.unitNo} тоотын дэлгэрэнгүй`}
                >
                  № {unit.unitNo} ↗
                </button>
              </td>
              <td>
                {unit.floor.number < 0
                  ? `B${Math.abs(unit.floor.number)}`
                  : unit.floor.number === 0
                    ? "Гадна талбай"
                    : `${unit.floor.number}-р`}
              </td>
              <td>
                {unit.typeLabel || (unit.rooms ? `${unit.rooms} өрөө` : "—")}
              </td>
              <td>{unit.areaM2 === null ? "—" : `${unit.areaM2} м²`}</td>
              <td>
                {unit.priceTotal === null ? (
                  <small>Үнэ оруулаагүй</small>
                ) : (
                  <strong>{currency(unit.priceTotal)}</strong>
                )}
                {unit.pricePerM2 !== null && (
                  <small>{currency(unit.pricePerM2)} / м²</small>
                )}
              </td>
              <td>
                <span
                  className={`inventory-badge inventory-badge-${unit.status.toLowerCase()}`}
                >
                  {statuses[unit.status] || unit.status}
                </span>
              </td>
              <td>
                <span className="inventory-publication">
                  {unit.published ? "Нийтэлсэн" : "Нийтлээгүй"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
