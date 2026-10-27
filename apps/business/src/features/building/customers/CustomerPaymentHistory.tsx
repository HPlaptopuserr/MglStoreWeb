import type { CustomerRecord } from "./model";
import { currency } from "../dashboard/model";
const paymentKinds: Record<string, string> = {
  DOWN_PAYMENT: "Урьдчилгаа",
  MONTHLY: "Сарын төлөлт",
  FULL_PAYMENT: "Бүтэн төлөлт",
};
function paymentDate(value: string | null) {
  if (!value) return "Огноо бүртгээгүй";
  return new Intl.DateTimeFormat("mn-MN", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
export function CustomerPaymentHistory({ record }: { record: CustomerRecord }) {
  const hasDownPayment = record.payments.some(
    (payment) => payment.kind === "DOWN_PAYMENT",
  );
  return (
    <section
      className="crm-payment-history"
      aria-label="Төлсөн төлбөрийн дэлгэрэнгүй"
    >
      <h3>Урьдчилгаа төлбөр</h3>
      <div className="crm-down-payment">
        <div>
          <span>
            Тохиролцсон урьдчилгаа
            {record.downPaymentPercent !== null
              ? ` · ${record.downPaymentPercent}%`
              : ""}
          </span>
          <strong>
            {record.downPaymentExpected === null
              ? "Тохируулаагүй"
              : currency(record.downPaymentExpected)}
          </strong>
        </div>
        <div>
          <span>
            {hasDownPayment
              ? "Баталгаажсан урьдчилгаа"
              : "Урьдчилгаа төлөлт бүртгэгдээгүй"}
          </span>
          <strong>{currency(record.downPaymentPaid)}</strong>
        </div>
      </div>
      <h3>Сар бүр төлсөн дүн</h3>
      {record.monthlyPayments.length ? (
        <div className="crm-payment-table">
          <table>
            <thead>
              <tr>
                <th>Сар</th>
                <th>Урьдчилгаа</th>
                <th>Сарын төлөлт</th>
                <th>Бүтэн төлөлт</th>
                <th>Нийт</th>
              </tr>
            </thead>
            <tbody>
              {record.monthlyPayments.map((month) => (
                <tr key={month.month}>
                  <th scope="row">
                    {month.month === "unknown"
                      ? "Огноогүй"
                      : month.month.replace("-", ".")}
                    <small>{month.count} төлөлт</small>
                  </th>
                  <td>{currency(month.downPayment)}</td>
                  <td>{currency(month.monthly)}</td>
                  <td>{currency(month.fullPayment)}</td>
                  <td>
                    <strong>{currency(month.total)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Баталгаажсан төлөлт хараахан байхгүй.</p>
      )}
      <h3>Төлөлт нэг бүрийн задаргаа</h3>
      <p className="crm-payment-note">
        Зөвхөн баталгаажсан гүйлгээг тооцов. Огноог Улаанбаатарын цагаар
        харуулна.
      </p>
      <div className="crm-payment-transactions">
        {record.payments.map((payment) => (
          <article key={payment.id}>
            <div>
              <span className="crm-payment-kind">
                {paymentKinds[payment.kind] || payment.kind}
              </span>
              <strong>{currency(payment.amount)}</strong>
            </div>
            <dl>
              <div>
                <dt>Төлсөн огноо</dt>
                <dd>{paymentDate(payment.paidAt)}</dd>
              </div>
              <div>
                <dt>Төлбөрийн суваг</dt>
                <dd>
                  {payment.provider === "MINU_POS"
                    ? "MINU POS"
                    : payment.provider}
                </dd>
              </div>
              <div>
                <dt>Нэхэмжлэх №</dt>
                <dd>{payment.invoiceNumber}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <p className="crm-payment-note">
        Банк, данс, бэлэн мөнгө эсвэл картын аргын мэдээлэл энэ бүртгэлд
        хадгалагдаагүй.
      </p>
    </section>
  );
}
