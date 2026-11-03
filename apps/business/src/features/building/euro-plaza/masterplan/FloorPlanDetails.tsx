import { countPlannedUnits, planAsset, type FloorPlan } from "./floor-plans";

export function FloorPlanDetails({ plan }: { plan: FloorPlan }) {
  return (
    <section className="floor-plan-details" aria-label="Давхрын төлөвлөлт">
      <h3>Давхрын төлөвлөлт</h3>
      <p>{plan.label} · {plan.year} оны ажлын зураг</p>
      <dl>
        <div><dt>Давхрын нийт талбай</dt><dd>{plan.floorArea.toFixed(2)} м²</dd></div>
        <div><dt>Нийтийн талбай</dt><dd>{plan.commonArea.toFixed(2)} м²</dd></div>
        {plan.serviceArea !== undefined && <div><dt>Үйлчилгээний талбай</dt><dd>{plan.serviceArea.toFixed(2)} м²</dd></div>}
      </dl>
      {plan.usage === "residential" && <>
        <div className="floor-plan-room-summary">
          {[1, 2, 3].map((rooms) => {
            const count = plan.apartments.filter((unit) => unit.rooms === rooms).reduce((sum, unit) => sum + unit.count, 0);
            return count > 0 ? <span key={rooms}>{rooms} өрөө <strong>{count} айл</strong></span> : null;
          })}
        </div>
        <table>
          <caption>Нэг давхарт {countPlannedUnits(plan)} айл</caption>
          <thead><tr><th scope="col">Төрөл</th><th scope="col">Өрөө</th><th scope="col">м² / байр</th><th scope="col">Айл</th></tr></thead>
          <tbody>{plan.apartments.map((unit) => <tr key={unit.code}><th scope="row">{unit.code}</th><td>{unit.rooms}</td><td>{unit.area.toFixed(2)}</td><td>{unit.count}</td></tr>)}</tbody>
        </table>
      </>}
      <a href={planAsset(plan, "pdf")} target="_blank" rel="noreferrer">Эх PDF зураг нээх ↗</a>
    </section>
  );
}
