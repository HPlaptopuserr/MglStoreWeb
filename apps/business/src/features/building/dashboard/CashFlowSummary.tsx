import Link from "next/link";
import { currency, percentage, type DashboardData } from "./model";
export function CashFlowSummary({
  finance: f,
}: {
  finance: DashboardData["finance"];
}) {
  const progress = percentage(f.paid, f.agreed);
  return (
    <section className="erp-card erp-cashflow">
      <p className="erp-eyebrow">МӨНГӨН УРСГАЛЫН ТӨЛӨВ</p>
      <h2>Төлөлтийн гүйцэтгэл</h2>
      <p className="erp-note">Тохиролцсон нийт дүн ба баталгаажсан орлого</p>
      <div
        className="erp-donut"
        style={{
          background: `conic-gradient(#00714e 0 ${progress}%, #e3e8fa ${progress}% 100%)`,
        }}
        role="img"
        aria-label={`Төлөлтийн гүйцэтгэл ${progress.toFixed(1)} хувь`}
      >
        <div>
          <span>Биелэлт</span>
          <strong>{progress.toFixed(1)}%</strong>
          <small>
            {Number(f.agreed) > 0
              ? "Бүртгэлд үндэслэв"
              : "Гэрээний дүн бүртгэгдээгүй"}
          </small>
        </div>
      </div>
      <dl>
        <div>
          <dt>Орсон орлого</dt>
          <dd>{currency(f.paid)}</dd>
        </div>
        <div>
          <dt>Нийт үлдэгдэл</dt>
          <dd>{currency(f.remaining)}</dd>
        </div>
        <div>
          <dt>Хугацаа хэтэрсэн</dt>
          <dd>{currency(f.overdue)}</dd>
        </div>
      </dl>
      <Link href="/building/manage/payments">
        Сарын төлөлтийн дэлгэрэнгүй →
      </Link>
    </section>
  );
}
