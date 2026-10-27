"use client";
import { useState } from "react";
import { CustomerPaymentHistory } from "./CustomerPaymentHistory";
import Link from "next/link";
import type { CustomerRecord } from "./model";
import { currency, percentage } from "../dashboard/model";
export function CustomerDetails({ record: r }: { record: CustomerRecord }) {
  const [tab, setTab] = useState<"schedule" | "payments" | "notes">("schedule");
  return (
    <aside
      className="crm-details erp-card"
      aria-label="Харилцагчийн дэлгэрэнгүй"
    >
      <header>
        <span className="crm-avatar">
          {(r.customerName || "?").slice(0, 2)}
        </span>
        <div>
          <h2>{r.customerName || "Нэр оруулаагүй"}</h2>
          <small title={r.id}>Бүртгэл № {r.id.slice(0, 8)}</small>
        </div>
      </header>
      <p>
        Утасны дугаар
        <br />
        {r.customerPhone ? (
          <a href={`tel:${r.customerPhone.replace(/[^+\d]/g, "")}`}>
            {r.customerPhone}
          </a>
        ) : (
          "Оруулаагүй"
        )}
      </p>
      <section className="crm-property">
        <h3>
          {r.unit.floor.block.name} / {r.unit.unitNo} тоот
        </h3>
        <p>
          {r.unit.rooms ?? "—"} өрөө · {r.unit.areaM2 ?? "—"} м² ·{" "}
          {r.unit.floor.number}-р давхар
        </p>
        <p>
          1 м² үнэ:{" "}
          <b>
            {r.agreedPricePerM2 ? currency(r.agreedPricePerM2) : "Оруулаагүй"}
          </b>
        </p>
        <p>
          Тохиролцсон нийт дүн:{" "}
          <b>
            {r.agreedPriceTotal ? currency(r.agreedPriceTotal) : "Оруулаагүй"}
          </b>
        </p>
      </section>
      <div className="crm-finance-metrics">
        <article><span>Нийт төлбөр</span><strong>{r.agreedPriceTotal ? currency(r.agreedPriceTotal) : "—"}</strong></article>
        <article><span>Баталгаажсан төлөлт</span><strong>{currency(r.paid)}</strong><small>{percentage(r.paid, r.agreedPriceTotal ?? 0).toFixed(1)}% биелсэн</small></article>
        <article><span>Үлдэгдэл</span><strong>{r.remaining === null ? "—" : currency(r.remaining)}</strong></article>
        <article><span>Хугацаа хэтэрсэн</span><strong>{currency(r.overdue)}</strong></article>
      </div>
      <progress aria-label="Төлбөрийн биелэлт" max={100} value={percentage(r.paid, r.agreedPriceTotal ?? 0)} />
      <div className="crm-detail-tabs" aria-label="Харилцагчийн мэдээлэл">
        <button type="button" aria-pressed={tab === "schedule"} onClick={() => setTab("schedule")}>Төлбөрийн график & хуваарь</button>
        <button type="button" aria-pressed={tab === "payments"} onClick={() => setTab("payments")}>Гүйлгээний түүх ({r.payments.length})</button>
        <button type="button" aria-pressed={tab === "notes"} onClick={() => setTab("notes")}>Бүртгэлийн тэмдэглэл</button>
      </div>
      {tab === "payments" && <CustomerPaymentHistory record={r} />}
      {tab === "schedule" && <section>
      <div className="crm-schedule-table"><table><thead><tr><th>Төлөх огноо</th><th>Төлбөрийн хуваарь</th><th>Хувь</th><th>Төлөх дүн</th><th>Төлөв</th></tr></thead><tbody>
        {r.paymentSchedule.map((schedule, index) => <tr key={schedule.id}>
          <td><strong>{new Date(schedule.dueDate).toLocaleDateString("mn-MN", { timeZone: "Asia/Ulaanbaatar" })}</strong>{schedule.paidAt && <small>Төлсөн: {new Date(schedule.paidAt).toLocaleDateString("mn-MN", { timeZone: "Asia/Ulaanbaatar" })}</small>}</td>
          <td>{index + 1}-р төлөх хуваарь</td>
          <td>{percentage(schedule.amount, r.agreedPriceTotal ?? 0).toFixed(1)}%</td>
          <td><strong>{currency(schedule.amount)}</strong></td>
          <td><span className={`crm-schedule-status ${schedule.status === "PAID" ? "paid" : "pending"}`}>{schedule.status === "PAID" ? "Бүрэн төлөгдсөн" : schedule.status === "OVERDUE" ? "Хугацаа хэтэрсэн" : "Төлөлт хүлээгдэж буй"}</span></td>
        </tr>)}
      </tbody></table>{!r.paymentSchedule.length && <p>Төлбөрийн хуваарь бүртгэгдээгүй.</p>}</div>
      </section>}
      {tab === "notes" && <section><h3>Бүртгэлийн тэмдэглэл</h3>
      <p>{r.note || "Тэмдэглэл оруулаагүй."}</p></section>}
      <Link href={`/building/manage/${r.unit.floor.block.projectId}/website`}>
        Төсөл, байр удирдах →
      </Link>
    </aside>
  );
}
