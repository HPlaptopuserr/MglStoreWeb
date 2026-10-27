import type { BuildingPaymentsReport } from "@mgl/types/building-payments";
import { currency } from "../dashboard/model";
export function MonthlyPaymentTable({
  data,
  month,
  onMonth,
}: {
  data: BuildingPaymentsReport;
  month: number;
  onMonth: (month: number) => void;
}) {
  return (
    <section className="payment-report-card">
      <header>
        <div>
          <h2>{data.year} оны сарын дэлгэрэнгүй</h2>
          <p>Хуваарийн үлдэгдэл нь өнөөдрийн төлөвөөр харагдана.</p>
        </div>
      </header>
      <div className="payment-table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Сар</th>
              <th scope="col">Орох ёстой</th>
              <th scope="col">Бодитоор орсон</th>
              <th scope="col">Хуваарийн үлдэгдэл</th>
              <th scope="col">Орсон төлбөрийн тоо</th>
            </tr>
          </thead>
          <tbody>
            {data.months.map((item) => (
              <tr
                key={item.month}
                className={month === item.month ? "is-selected" : ""}
              >
                <th scope="row">
                  <button
                    type="button"
                    aria-pressed={month === item.month}
                    onClick={() => onMonth(item.month)}
                  >
                    {item.month}-р сар
                  </button>
                </th>
                <td>{currency(item.expected)}</td>
                <td className="payment-received">{currency(item.received)}</td>
                <td>{currency(item.outstanding)}</td>
                <td>{item.paymentCount}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Жилийн нийт</th>
              <td>{currency(data.totals.expected)}</td>
              <td>{currency(data.totals.received)}</td>
              <td>{currency(data.totals.outstanding)}</td>
              <td>
                {data.months.reduce((sum, row) => sum + row.paymentCount, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
