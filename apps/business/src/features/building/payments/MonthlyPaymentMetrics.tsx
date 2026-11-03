import type { BuildingPaymentsReport } from "@mgl/types/building-payments";
import { currency } from "../dashboard/model";
export function MonthlyPaymentMetrics({
  data,
  month,
}: {
  data: BuildingPaymentsReport;
  month: number;
}) {
  const selected = data.months[month - 1];
  const previous = month === 1 ? data.previousDecember : data.months[month - 2];
  return (
    <div className="payment-month-metrics">
      <article>
        <span>{month}-р сард орох ёстой</span>
        <strong>{currency(selected.expected)}</strong>
        <small>Төлөх хугацаа нь энэ сард таарсан хуваарь</small>
      </article>
      <article className="payment-metric-income">
        <span>{month}-р сард бодитоор орсон</span>
        <strong>{currency(selected.received)}</strong>
        <small>
          {selected.paymentCount} баталгаажсан төлбөр · төлсөн огноогоор
        </small>
      </article>
      <article>
        <span>Өмнөх сард орсон</span>
        <strong>{currency(previous.received)}</strong>
        <small>
          {previous.year} оны {previous.month}-р сар
        </small>
      </article>
      <article>
        <span>Сонгосон сарын хуваарийн үлдэгдэл</span>
        <strong>{currency(selected.outstanding)}</strong>
        <small>Одоогоор төлөгдөөгүй хуваарийн дүн</small>
      </article>
    </div>
  );
}
