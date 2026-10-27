import { ArrowUpRight, CarFront, House, Store, Warehouse } from "lucide-react";
import {
  floorLabel,
  money,
  statusLabels,
  type SalesUnit,
} from "./demo-inventory";
const icons = {
  apartment: House,
  commercial: Store,
  garage: Warehouse,
  parking: CarFront,
};
export function UnitCard({
  unit,
  onSelect,
}: {
  unit: SalesUnit;
  onSelect: (unit: SalesUnit) => void;
}) {
  const Icon = icons[unit.kind];
  return (
    <button
      className="sales-unit"
      onClick={() => onSelect(unit)}
      aria-label={`${unit.number}, ${unit.rooms ? `${unit.rooms} өрөө, ` : ""}${statusLabels[unit.status]}, дэлгэрэнгүй`}
    >
      <div className={`sales-unit-art ${unit.kind}`}>
        <Icon size={46} strokeWidth={1} />
        <span className={`sales-status ${unit.status}`}>
          {statusLabels[unit.status]}
        </span>
        <span className="sales-unit-number">№ {unit.number}</span>
      </div>
      <div className="sales-unit-body">
        <div className="sales-unit-heading">
          <h3>
            {unit.rooms
              ? `${unit.rooms} өрөө байр`
              : unit.kind === "commercial"
                ? "Үйлчилгээний талбай"
                : unit.kind === "garage"
                  ? "Дулаан гарааш"
                  : "Гадна зогсоол"}
          </h3>
          <ArrowUpRight size={18} />
        </div>
        <p>
          {floorLabel(unit.floor)} <span>·</span>{" "}
          {unit.area ? `${unit.area} м²` : "1 автомашины зогсоол"}
        </p>
        <strong>{money(unit.price)}</strong>
        <small>
          {unit.area
            ? `${new Intl.NumberFormat("mn-MN").format(unit.price / unit.area)} ₮ / м²`
            : "Нэг зогсоолын жишээ үнэ"}
        </small>
      </div>
    </button>
  );
}
