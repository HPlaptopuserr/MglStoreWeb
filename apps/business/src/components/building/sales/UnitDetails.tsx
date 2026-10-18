import { BuildingDialog } from "../manage/BuildingDialog";
import {
  floorLabel,
  money,
  statusLabels,
  type SalesUnit,
} from "./demo-inventory";
export function UnitDetails({
  unit,
  onClose,
  onReserve,
}: {
  unit: SalesUnit;
  onClose: () => void;
  onReserve: () => void;
}) {
  return (
    <BuildingDialog
      title={`№ ${unit.number} · ${unit.rooms ? `${unit.rooms} өрөө байр` : "Борлуулах талбай"}`}
      subtitle="Өргөө 16 · Жишээ төсөл"
      onClose={onClose}
      footer={
        <>
          <button className="building-secondary" onClick={onClose}>
            Хаах
          </button>
          <button
            className="building-primary"
            disabled={unit.status !== "available"}
            onClick={onReserve}
          >
            {unit.status === "available"
              ? "Тест захиалга үүсгэх"
              : statusLabels[unit.status]}
          </button>
        </>
      }
    >
      <div className="sales-details">
        <p className="sales-demo-note">
          Тест өгөгдөл. Үнэ, төлөв нь жишээ бөгөөд бодит захиалга үүсэхгүй.
        </p>
        <dl>
          {[
            ["Байршил", floorLabel(unit.floor)],
            ["Талбай", unit.area ? `${unit.area} м²` : "Тодорхойлоогүй"],
            [
              "Өрөө / багтаамж",
              unit.rooms
                ? `${unit.rooms} өрөө`
                : unit.kind === "commercial"
                  ? "Бүтэн давхар"
                  : "1 автомашин",
            ],
            ["Төлөв", statusLabels[unit.status]],
            ["Нийт жишээ үнэ", money(unit.price)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p>
          Байршил, ашиглалтад орох хугацаа, баталгаажсан план зураг, төлбөрийн
          нөхцөлийг бодит төсөлд нэмж бүртгэнэ.
        </p>
      </div>
    </BuildingDialog>
  );
}
