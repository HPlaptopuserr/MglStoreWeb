import type { BuildingPaymentMonth } from "@mgl/types/building-payments";
import { currency } from "../dashboard/model";
export function MonthlyPaymentChart({
  months,
  month,
  onMonth,
}: {
  months: BuildingPaymentMonth[];
  month: number;
  onMonth: (month: number) => void;
}) {
  const maximum = Math.max(
    1,
    ...months.flatMap((item) => [Number(item.expected), Number(item.received)]),
  );
  return (
    <section className="payment-report-card">
      <header>
        <div>
          <h2>Сар бүрийн мөнгөн урсгал</h2>
          <p>Төлөвлөгөө болон бодитоор орсон орлогын харьцуулалт</p>
        </div>
        <div className="payment-chart-legend">
          <span>
            <i />
            Орох ёстой
          </span>
          <span>
            <i />
            Бодитоор орсон
          </span>
        </div>
      </header>
      <div className="payment-month-chart">
        {months.map((item) => (
          <button
            key={item.month}
            type="button"
            aria-pressed={month === item.month}
            onClick={() => onMonth(item.month)}
            aria-label={`${item.month}-р сар: орох ёстой ${currency(item.expected)}, орсон ${currency(item.received)}`}
            title={`Орох ёстой: ${currency(item.expected)}\nОрсон: ${currency(item.received)}`}
          >
            <span className="payment-chart-bars" aria-hidden="true">
              <i
                style={{
                  height: `${(Number(item.expected) / maximum) * 100}%`,
                }}
              />
              <i
                style={{
                  height: `${(Number(item.received) / maximum) * 100}%`,
                }}
              />
            </span>
            <span>{item.month}-р сар</span>
          </button>
        ))}
      </div>
    </section>
  );
}
