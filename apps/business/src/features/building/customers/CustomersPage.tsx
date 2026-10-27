"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { managementFetch, responseError } from "@/features/building/api/management-client";
import { currency, percentage } from "../dashboard/model";
import { CustomerDetailsDialog } from "./CustomerDetailsDialog";
import { customerStatus, type CustomerResponse } from "./model";
import "../dashboard/dashboard.css";
import "./customers.css";
export function CustomersPage({ initialReservation = "" }: { initialReservation?: string }) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("ALL"),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(initialReservation),
    [data, setData] = useState<CustomerResponse | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    const timer = setTimeout(() => {
      void managementFetch(
        `admin/customers?search=${encodeURIComponent(search)}&status=${status}&page=${page}&reservation=${encodeURIComponent(initialReservation)}`,
        { signal: c.signal },
      )
        .then(async (r) => {
          if (!r.ok)
            throw new Error(
              await responseError(r, "Харилцагчдыг ачаалж чадсангүй"),
            );
          return r.json() as Promise<CustomerResponse>;
        })
        .then((d) => {
          if (!c.signal.aborted) setData(d);
        })
        .catch((e: unknown) => {
          if (!c.signal.aborted)
            setError(e instanceof Error ? e.message : "Алдаа гарлаа");
        })
        .finally(() => {
          if (!c.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [search, status, page, revision, initialReservation]);
  function pending() {
    setLoading(true);
    setError("");
    setSelected("");
  }
  const current = data?.records.find((r) => r.id === selected);
  return (
    <div className="erp-dashboard crm-page">
      <header className="erp-section-heading">
        <div>
          <p className="erp-eyebrow">БОРЛУУЛАЛТЫН УДИРДЛАГА / CRM</p>
          <h1>Худалдан авагчид & Харилцагчийн CRM</h1>
        </div>
        <div className="erp-actions">
          <button onClick={() => window.print()}>Хэвлэх</button>
          <Link href="/building/manage/purchases/new">
            Байр захиалах →
          </Link>
        </div>
      </header>
      <div className="crm-metrics">
        {[
          ["Харилцагчийн бүртгэл", data?.metrics.all],
          ["Гэрээнд шилжсэн", data?.metrics.converted],
          ["Захиалга / Lead шатанд", data?.metrics.active],
          ["Хугацаа хэтэрсэн", data?.metrics.overdue],
        ].map(([label, value]) => (
          <article className="erp-card" key={label}>
            <span>{label}</span>
            <strong className="erp-value">
              {loading || error ? "—" : (value ?? 0)}
            </strong>
          </article>
        ))}
      </div>
      <p className="erp-note">
        Нэг харилцагчийн өөр өөр байрны захиалгыг тусдаа бүртгэлээр харуулна.
      </p>
      {initialReservation && (
        <div className="erp-card erp-section-heading">
          <span>Сонгосон захиалгын байр ба төлбөрийн дэлгэрэнгүй</span>
          <Link href="/building/manage/customers">Бүх захиалгын жагсаалт →</Link>
        </div>
      )}
      {!initialReservation && <div className="erp-card crm-filter">
        <input
          aria-label="Худалдан авагч хайх"
          value={search}
          placeholder="Нэр, утас, байр, бүртгэлийн дугаараар хайх…"
          onChange={(e) => {
            pending();
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div>
          {[
            ["ALL", "Бүгд"],
            ["CONVERTED", "Гэрээтэй"],
            ["ACTIVE", "Захиалга"],
            ["OVERDUE", "Хэтэрсэн"],
            ["CANCELLED", "Цуцлагдсан"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={status === value}
              onClick={() => {
                if (status !== value) {
                  pending();
                  setStatus(value);
                  setPage(1);
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      }
      {loading ? (
        <div className="erp-empty" role="status">
          Харилцагчид ачаалж байна…
        </div>
      ) : error ? (
        <div role="alert" className="erp-empty">
          {error}
          <button
            onClick={() => {
              pending();
              setRevision((r) => r + 1);
            }}
          >
            Дахин оролдох
          </button>
        </div>
      ) : (
        data && (
          <div className="crm-layout">
            <section className="erp-card crm-list">
              <h2>
                Харилцагчдын нэгдсэн жагсаалт{" "}
                <small>{data.total} бүртгэл</small>
              </h2>
              <div className="erp-table-scroll">
                <table>
                  <thead>
                    <tr>
                      {[
                        "Харилцагч",
                        "Холбоо барих",
                        "Байршил & нэгж",
                        "Тохиролцсон дүн",
                        "Төлбөрийн биелэлт",
                        "Төлөв",
                      ].map((t) => (
                        <th key={t}>{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.records.map((r) => (
                      <tr
                        key={r.id}
                        className={current?.id === r.id ? "selected" : ""}
                        onClick={() => setSelected(r.id)}
                      >
                        <td>
                          <button
                            className="crm-select"
                            aria-haspopup="dialog"
                            onClick={() => setSelected(r.id)}
                          >
                            {r.customerName || "Нэр оруулаагүй"}
                          </button>
                          <small>{r.id.slice(0, 8)}</small>
                        </td>
                        <td>{r.customerPhone || "—"}</td>
                        <td>
                          {r.unit.floor.block.name} / {r.unit.unitNo}
                          <small>
                            {r.unit.rooms ?? "—"} өрөө · {r.unit.areaM2 ?? "—"}{" "}
                            м²
                          </small>
                        </td>
                        <td>
                          <strong>
                            {r.agreedPriceTotal
                              ? currency(r.agreedPriceTotal)
                              : "—"}
                          </strong>
                        </td>
                        <td>
                          {percentage(r.paid, r.agreedPriceTotal ?? 0).toFixed(
                            1,
                          )}
                          %
                          <progress
                            max={100}
                            value={percentage(r.paid, r.agreedPriceTotal ?? 0)}
                          />
                          <small>
                            Үлдэгдэл:{" "}
                            {r.remaining === null ? "—" : currency(r.remaining)}
                          </small>
                        </td>
                        <td>
                          <span
                            className={
                              Number(r.overdue) > 0
                                ? "erp-overdue-badge"
                                : "crm-status"
                            }
                          >
                            {Number(r.overdue) > 0
                              ? "Хугацаа хэтэрсэн"
                              : (customerStatus[r.status] ?? r.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.records.length && (
                <div className="erp-empty">
                  {initialReservation
                    ? "Захиалга олдсонгүй эсвэл харах эрхгүй байна."
                    : search || status !== "ALL"
                    ? "Шүүлтүүрт тохирох бүртгэл олдсонгүй."
                    : "Худалдан авагчийн захиалга хараахан бүртгэгдээгүй."}
                </div>
              )}
              <footer className="erp-pagination">
                <span>
                  Нийт {data.total} · {data.total ? (page - 1) * 10 + 1 : 0}–
                  {Math.min(page * 10, data.total)} харагдаж байна
                </span>
                <button
                  aria-label="Өмнөх хуудас"
                  disabled={page === 1}
                  onClick={() => {
                    pending();
                    setPage((p) => p - 1);
                  }}
                >
                  ←
                </button>
                <span>
                  {page} / {Math.max(1, Math.ceil(data.total / 10))}
                </span>
                <button
                  aria-label="Дараагийн хуудас"
                  disabled={page * 10 >= data.total}
                  onClick={() => {
                    pending();
                    setPage((p) => p + 1);
                  }}
                >
                  →
                </button>
              </footer>
            </section>
            {current && (
              <CustomerDetailsDialog
                record={current}
                onClose={() => setSelected("")}
              />
            )}
          </div>
        )
      )}
    </div>
  );
}
