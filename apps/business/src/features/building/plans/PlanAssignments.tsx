import { useState } from "react";
import { floorLabel } from "../sales/demo-inventory";
import type { PlanLibrary } from "./plan-model";
export function PlanAssignments({
  floors: customFloors,
  library,
  planId,
  onChange,
}: {
  floors?: number[];
  library: PlanLibrary;
  planId: string;
  onChange: (assignments: Record<string, string>) => void;
}) {
  const floors =
    customFloors ??
    Array.from({ length: 16 }, (_, i) => i + 1).concat([-1, -2, 0]);
  const ordered = [...new Set(floors)].sort((a, b) => a - b);
  const [start, setStart] = useState(String(ordered[0] ?? ""));
  const [end, setEnd] = useState(String(ordered[0] ?? ""));
  const [notice, setNotice] = useState("");
  const planName = library.plans.find((plan) => plan.id === planId)?.name ?? "Сонгосон план";
  const selected = start !== "" && end !== "" && Number(start) <= Number(end)
    ? ordered.filter((floor) => floor >= Number(start) && floor <= Number(end)) : [];
  const replaced = selected.filter((floor) => library.assignments[String(floor)] && library.assignments[String(floor)] !== planId);
  return (
    <section className="plan-assignments">
      <h2>Энэ планыг давхарт оноох</h2>
      <p>
        Давхар бүр өөр план ашиглаж болно. Ижил планыг олон давхарт оноож болно.
      </p>
      {ordered.length === 0 && <p role="alert">Энэ блокт давхар бүртгэгдээгүй байна. Эхлээд блокийн тохиргооноос давхруудаа нэмнэ үү.</p>}
      <fieldset className="plan-range-assignment">
        <legend>«{planName}» зургийг олон давхарт оноох</legend>
        <label>Эхлэх давхар<select value={start} onChange={(event) => { setStart(event.target.value); setNotice(""); }}><option value="">Сонгох</option>{ordered.map((floor) => <option key={floor} value={floor}>{floorLabel(floor)}</option>)}</select></label>
        <label>Дуусах давхар<select value={end} onChange={(event) => { setEnd(event.target.value); setNotice(""); }}><option value="">Сонгох</option>{ordered.map((floor) => <option key={floor} value={floor}>{floorLabel(floor)}</option>)}</select></label>
        <button type="button" disabled={!selected.length} onClick={() => {
          const next = { ...library.assignments };
          selected.forEach((floor) => { next[String(floor)] = planId; });
          onChange(next);
          setNotice(`«${planName}» планыг ${selected.join(", ")}-р давхруудад оноолоо. Баталгаажуулахын тулд «Өөрчлөлтийг хадгалах» дарна уу.`);
        }}>{selected.length ? `${selected.length} давхарт оноох` : "Давхруудад оноох"}</button>
        <p>3D зураг, эх зураг болон тус бүрийн байрны хүрээг хамт онооно. Зөвхөн энэ блокт бүртгэлтэй давхрууд хамрагдана.</p>
        {start !== "" && end !== "" && Number(start) > Number(end) && <p role="alert">Дуусах давхар нь эхлэх давхраас бага байж болохгүй.</p>}
        {replaced.length > 0 && <p>Дарахад {replaced.join(", ")}-р давхрын өмнөх план «{planName}» болж солигдоно.</p>}
        {notice && <p role="status">{notice}</p>}
      </fieldset>
      <div>
        {ordered.map((floor) => (
          <label key={floor}>
            <input
              type="checkbox"
              checked={library.assignments[String(floor)] === planId}
              onChange={(event) => {
                const next = { ...library.assignments };
                if (event.target.checked) next[String(floor)] = planId;
                else delete next[String(floor)];
                onChange(next);
              }}
            />
            {floorLabel(floor)}
            {library.assignments[String(floor)] &&
              library.assignments[String(floor)] !== planId && (
                <small>{library.plans.find((plan) => plan.id === library.assignments[String(floor)])?.name ?? "Өөр план"}</small>
              )}
          </label>
        ))}
      </div>
    </section>
  );
}
