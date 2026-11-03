"use client";
import { useState } from "react";
import { BuildingDialog } from "../management/BuildingDialog";

export function PlanUnitFloorPicker({
  name,
  floors,
  saving,
  error,
  onClose,
  onSelect,
}: {
  name: string;
  floors: number[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSelect: (floor: number) => Promise<void>;
}) {
  const [selected, setSelected] = useState("");
  return (
    <BuildingDialog
      title={`${name} — зураг тохируулах`}
      subtitle="Тоот, үнэ, төлөвийг засах байрны давхрыг сонгоно уу"
      onClose={() => {
        if (!saving) onClose();
      }}
      footer={
        <>
          <button
            type="button"
            className="building-secondary"
            disabled={saving}
            onClick={onClose}
          >
            Буцах
          </button>
          <button
            type="submit"
            form="plan-unit-floor-form"
            className="building-primary"
            disabled={saving || !selected}
          >
            {saving ? "Хадгалж байна…" : "Байрны зураг нээх →"}
          </button>
        </>
      }
    >
      <form
        id="plan-unit-floor-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (selected && !saving) void onSelect(Number(selected));
        }}
      >
        <p>
          Энэ план {floors.length} давхарт ашиглагдаж байна. Зураг, талбай,
          өрөөний мэдээлэл энэ планын ижил бүсэд бүх давхарт нийтлэг хадгалагдана.
        </p>
        <label>
          Давхар
          <select
            required
            disabled={saving}
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Давхар сонгох</option>
            {floors.map((floor) => (
              <option key={floor} value={floor}>
                {floor}-р давхар · {name}
              </option>
            ))}
          </select>
        </label>
        <p>
          Давхрын сонголт нь зөвхөн тухайн байрны тоот, үнэ, борлуулалтын
          төлөвийг засахад хамаарна.
        </p>
        {error && (
          <p role="alert" className="building-alert">
            {error}
          </p>
        )}
      </form>
    </BuildingDialog>
  );
}
