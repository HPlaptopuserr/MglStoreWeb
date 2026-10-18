import { ArrowUpRight } from "lucide-react";
import { money, unitTitle, unitStatusLabel, unitAreaLabel, type SalesUnit } from "../sales/demo-inventory";
export function ViewerSelection({
  isDemo = true,
  unit,
  onDetails,
}: {
  isDemo?: boolean;
  unit: SalesUnit;
  onDetails: () => void;
}) {
  return (
    <section className="viewer-selection" aria-label="Сонгосон нэгж">
      <div>
        <span>СОНГОСОН НЭГЖ</span>
        <h2>
          {unitTitle(unit)}{" "}
          <small>{unitAreaLabel(unit)}</small>
        </h2>
        <p className={`viewer-status ${unit.status}`}>
          {unitStatusLabel(unit)}
        </p>
      </div>
      <div>
        <span>{isDemo ? "ЖИШЭЭ ҮНЭ" : "НИЙТ ҮНЭ"}</span>
        <strong>{unit.priceKnown === false ? "Үнэ тодорхойгүй" : money(unit.price)}</strong>
      </div>
      <button onClick={onDetails}>
        Дэлгэрэнгүй <ArrowUpRight size={16} />
      </button>
    </section>
  );
}
