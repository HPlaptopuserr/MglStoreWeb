"use client";
import { useEffect, useState } from "react";
import type {
  BuildingInventoryResponse,
  BuildingInventoryUnit,
} from "@mgl/types";
import { managementFetch, responseError } from "@/lib/building-management";
import { BuildingDialog } from "./BuildingDialog";
import { PurchaseDetails } from "./PurchaseDetails";
const statuses: Record<string, string> = {
  ALL: "Бүх байр",
  AVAILABLE: "Боломжтой",
  SOLD: "Зарагдсан",
  RESERVED: "Захиалгатай",
  CONTRACT_PENDING: "Гэрээ хүлээгдэж буй",
  HOLD: "Түр хаасан",
  CANCELLED: "Цуцлагдсан",
};
export function InventoryDashboard() {
  const [selectedUnit, setSelectedUnit] =
    useState<BuildingInventoryUnit | null>(null);
  const [data, setData] = useState<BuildingInventoryResponse | null>(null);
  const [status, setStatus] = useState("ALL"),
    [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await managementFetch(
          `admin/inventory?status=${status}&page=${page}`,
          { signal: controller.signal },
        );
        if (!response.ok)
          throw new Error(
            await responseError(response, "Байрны мэдээлэл ачаалж чадсангүй"),
          );
        const result = (await response.json()) as BuildingInventoryResponse;
        if (!controller.signal.aborted) setData(result);
      } catch (cause: unknown) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Алдаа гарлаа");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [status, page, revision]);
  const summary = data?.summary;
  const stats = [
    ["Нийт блок", summary?.blocks],
    ["Нийт байр", summary?.total],
    ["Зарагдсан", summary?.sold],
    ["Зарагдаагүй", summary?.unsold],
    ["Боломжтой", summary?.available],
    ["Захиалгатай", summary?.reserved],
    ["Гэрээ хүлээгдэж буй", summary?.contractPending],
    [
      "Түр хаасан / цуцлагдсан",
      summary ? summary.hold + summary.cancelled : undefined,
    ],
  ] as const;
  return (
    <section
      className="inventory-dashboard"
      aria-label="Байгууллагын байрны борлуулалт"
    >
      <div className="management-list-heading">
        <div>
          <h2>Блок, байрны борлуулалтын тойм</h2>
          <p>Нэвтэрсэн байгууллагын бүх блокийн нийлбэр</p>
        </div>
        <button
          type="button"
          className="building-secondary"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          Шинэчлэх
        </button>
      </div>
      {error ? (
        <div className="building-alert" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="building-secondary"
            onClick={() => setRevision((value) => value + 1)}
          >
            Дахин оролдох
          </button>
        </div>
      ) : (
        <>
          <div className="management-stats">
            {stats.map(([label, count]) => (
              <section key={label}>
                <span>{label}</span>
                <strong>{loading ? "—" : (count ?? 0)}</strong>
              </section>
            ))}
          </div>
          <p className="management-footnote">
            Зарагдаагүйд захиалгатай, гэрээ хүлээгдэж буй, түр хаасан болон
            цуцлагдсан байр орно. «Боломжтой» нь бүртгэлийн төлөв бөгөөд
            худалдаанд нийтэлсэн гэсэн үг биш.
          </p>
          <div className="management-list-tools">
            <label>
              Байрны төлөв
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                {Object.entries(statuses).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <span>
              {loading ? "Ачаалж байна…" : `${data?.total ?? 0} байр`}
            </span>
          </div>
          {loading ? (
            <p role="status" className="management-loading">
              Байрны мэдээлэл ачаалж байна…
            </p>
          ) : !data?.units.length ? (
            <div className="project-block-empty">
              Энэ төлөвтэй байр бүртгэгдээгүй байна.
            </div>
          ) : (
            <div className="inventory-unit-list">
              {data.units.map((unit) => (
                <article key={unit.id} className="inventory-card">
                  <div>
                    <p>{unit.floor.block.name}</p>
                    <h3>{unit.unitNo} тоот</h3>
                    <span>
                      {unit.floor.number}-р давхар · {unit.rooms ?? "—"} өрөө ·{" "}
                      {unit.areaM2 ?? "—"} м²
                    </span>
                  </div>
                  <span
                    className={`inventory-badge inventory-badge-${unit.status.toLowerCase()}`}
                  >
                    {statuses[unit.status] ?? unit.status}
                  </span>
                  <button
                    type="button"
                    className="building-secondary"
                    aria-haspopup="dialog"
                    aria-label={`${unit.floor.block.name}, ${unit.unitNo} тоотын дэлгэрэнгүй`}
                    onClick={() => setSelectedUnit(unit)}
                  >
                    Дэлгэрэнгүй →
                  </button>
                </article>
              ))}
            </div>
          )}
          {data && data.total > data.pageSize && (
            <nav className="inventory-actions" aria-label="Байрны хуудас">
              <button
                type="button"
                className="building-secondary"
                disabled={loading || page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Өмнөх
              </button>
              <span>
                {page} / {Math.ceil(data.total / data.pageSize)}
              </span>
              <button
                type="button"
                className="building-secondary"
                disabled={loading || page * data.pageSize >= data.total}
                onClick={() => setPage((value) => value + 1)}
              >
                Дараах
              </button>
            </nav>
          )}
        </>
      )}
      {selectedUnit && (
        <BuildingDialog
          title={`${selectedUnit.unitNo} тоот · ${statuses[selectedUnit.status] ?? selectedUnit.status}`}
          subtitle={selectedUnit.floor.block.name}
          onClose={() => setSelectedUnit(null)}
        >
          <PurchaseDetails unit={selectedUnit} />
        </BuildingDialog>
      )}
    </section>
  );
}
