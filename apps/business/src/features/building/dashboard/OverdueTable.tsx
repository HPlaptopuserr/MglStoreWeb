"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Phone, ArrowUpRight } from "lucide-react";
const PAGE_SIZE = 5;
import { currency, type DashboardData } from "./model";
function reservationDetailsHref(reservationId: string): string {
  return `/building/manage/customers?reservation=${encodeURIComponent(reservationId)}`;
}

export function OverdueTable({ rows }: { rows: DashboardData["overdue"] }) {
  const [query, setQuery] = useState(""),
    [range, setRange] = useState("all"),
    [page, setPage] = useState(1);
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          `${r.customer} ${r.phone ?? ""} ${r.unit} ${r.reference}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (range === "all" ||
            (range === "30" && r.days <= 30) ||
            (range === "60" && r.days > 30 && r.days <= 60) ||
            (range === "more" && r.days > 60)),
      ),
    [rows, query, range],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  return (
    <section className="erp-card" id="overdue">
      <div className="erp-section-heading">
        <div>
          <span className="erp-alert-symbol">
            <AlertTriangle size={21} />
          </span>
          <h2>
            Хугацаа хэтэрсэн төлбөрийн хяналтын самбар{" "}
            <small>{filtered.length} төлөлт</small>
          </h2>
          <p className="erp-overdue-description">
            Хугацаа хэтэрсэн хуваарь, холбогдох худалдан авагчийн мэдээлэл
          </p>
        </div>
        <div className="erp-filters">
          <input
            aria-label="Төлөлт хайх"
            placeholder="Нэр, утас, байр, бүртгэлээр хайх…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label="Хоцролтын хугацаа"
            value={range}
            onChange={(e) => {
              setRange(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Бүх хугацаа</option>
            <option value="30">1–30 хоног</option>
            <option value="60">31–60 хоног</option>
            <option value="more">60-аас дээш</option>
          </select>
        </div>
      </div>
      <div className="erp-table-scroll">
        <table>
          <thead>
            <tr>
              {[
                "Бүртгэлийн №",
                "Худалдан авагч",
                "Блок / байр",
                "Төлөх өдөр",
                "Хоцролт",
                "Төлөх дүн",
                "Төлөв",
                "Үйлдэл",
              ].map((t) => (
                <th key={t}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered
              .slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
              .map((r) => (
                <tr key={r.id}>
                  <td title={r.reference}>
                    <Link href={reservationDetailsHref(r.reference)}>
                      {r.reference.slice(0, 8)}
                    </Link>
                    <small>Захиалгын бүртгэл</small>
                  </td>
                  <td>
                    <Link href={reservationDetailsHref(r.reference)}><strong>{r.customer}</strong></Link>
                    <small>{r.phone || "Утас оруулаагүй"}</small>
                  </td>
                  <td>
                    {r.block} / №{r.unit}
                  </td>
                  <td>
                    {new Date(r.dueDate).toLocaleDateString("mn-MN", {
                      timeZone: "Asia/Ulaanbaatar",
                    })}
                  </td>
                  <td>
                    <span
                      className={`erp-overdue-badge ${r.days > 60 ? "critical" : r.days > 30 ? "late" : "recent"}`}
                    >
                      {r.days} хоног
                    </span>
                  </td>
                  <td className="erp-debt-amount">{currency(r.amount)}</td>
                  <td>
                    <span
                      className={`erp-collection-status ${r.days > 60 ? "critical" : ""}`}
                    >
                      {r.days > 60
                        ? "Удаан хугацааны хоцролт"
                        : "Хугацаа хэтэрсэн"}
                    </span>
                  </td>
                  <td>
                    <Link
                      className="erp-row-action"
                      href={reservationDetailsHref(r.reference)}
                    >
                      <ArrowUpRight size={13} /> Нээх
                    </Link>
                    {r.phone && (
                      <a
                        href={`tel:${r.phone.replace(/[^+\d]/g, "")}`}
                        className="erp-call-action"
                        aria-label={`${r.customer} руу залгах`}
                      >
                        <Phone size={13} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <div className="erp-empty">
          {rows.length
            ? "Хайлтад тохирох төлөлт олдсонгүй."
            : "Хугацаа хэтэрсэн төлбөрийн хуваарь бүртгэгдээгүй байна."}
        </div>
      )}
      <footer className="erp-pagination">
        <span>
          Нийт {filtered.length} төлөлтөөс{" "}
          {Math.min(
            PAGE_SIZE,
            Math.max(0, filtered.length - (current - 1) * PAGE_SIZE),
          )}{" "}
          харагдаж байна · Нийт дүн:{" "}
          {currency(filtered.reduce((sum, row) => sum + Number(row.amount), 0))}
        </span>
        <button disabled={current === 1} onClick={() => setPage(current - 1)}>
          ← Өмнөх
        </button>
        {Array.from(
          { length: Math.min(5, pages) },
          (_, index) => Math.max(1, Math.min(current - 2, pages - 4)) + index,
        ).map((number) => (
          <button
            key={number}
            aria-current={number === current ? "page" : undefined}
            onClick={() => setPage(number)}
          >
            {number}
          </button>
        ))}
        <button
          disabled={current === pages}
          onClick={() => setPage(current + 1)}
        >
          Дараах →
        </button>
      </footer>
    </section>
  );
}
