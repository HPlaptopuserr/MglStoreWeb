import { MetricAmount } from "./MetricAmount";
import type { DashboardData } from "./model";
import { currency, percentage } from "./model";
export function FinanceSummary({
  finance: f,
  overdueContracts,
}: {
  finance: DashboardData["finance"];
  overdueContracts: number;
}) {
  return (
    <section id="finance">
      <p className="erp-eyebrow">САНХҮҮГИЙН УДИРДЛАГА</p>
      <h2>Гэрээний төлбөр & санхүүгийн гүйцэтгэл</h2>
      <div className="erp-finance-grid">
        <article className="erp-card">
          <span>Гэрээний нийт багц</span>
          <MetricAmount value={f.agreed} />
          <footer>
            Баталгаажсан орлого <b>{currency(f.paid)}</b>
            <progress max={100} value={percentage(f.paid, f.agreed)} />
            <span>Гүйцэтгэл: {percentage(f.paid, f.agreed).toFixed(1)}%</span>
          </footer>
        </article>
        <article className="erp-card">
          <span>Нийт авлагын үлдэгдэл</span>
          <MetricAmount value={f.remaining} />
          <footer>
            Энэ сарын хуваарь <b>{currency(f.due)}</b>
            <br />
            Хуваариас төлөгдсөн <b>{currency(f.monthPaid)}</b>
            <progress max={100} value={percentage(f.monthPaid, f.due)} />
            <span>
              Сарын биелэлт: {percentage(f.monthPaid, f.due).toFixed(1)}%
            </span>
          </footer>
        </article>
        <article className="erp-card erp-danger">
          <span>Хугацаа хэтэрсэн өр (бодит)</span>
          <MetricAmount value={f.overdue} />
          <footer>
            <a href="#overdue">
              {overdueContracts} гэрээ · Хугацаа хэтэрсэн хуваарийг харах ↓
            </a>
          </footer>
        </article>
      </div>
      <p className="erp-note">
        Идэвхтэй болон гэрээнд шилжсэн захиалгын бүртгэлээр тооцов.{" "}
        {f.reservations} бүртгэл.{" "}
        {f.missingPrices > 0 &&
          `${f.missingPrices} бүртгэлд тохиролцсон үнэ дутуу.`}
      </p>
    </section>
  );
}
