"use client";
import { useEffect, useState } from "react";
import type {
  BuildingInventoryResponse,
  BuildingInventoryUnit,
} from "@mgl/types";
import {
  managementFetch,
  responseError,
} from "@/features/building/api/management-client";
import { BuildingDialog } from "./BuildingDialog";
import { PurchaseDetails } from "./PurchaseDetails";
import { InventoryUnitTable } from "./InventoryUnitTable";
import "./inventory-workspace.css";
const statuses: Record<string, string> = {
  ALL: "Бүх байр, талбай",
  AVAILABLE: "Боломжтой",
  SOLD: "Зарагдсан",
  RESERVED: "Захиалгатай",
  CONTRACT_PENDING: "Гэрээ хүлээгдэж буй",
  HOLD: "Түр хаасан",
  CANCELLED: "Цуцлагдсан",
};
import {
  InventoryLocationFilters,
  type InventoryFilters,
} from "./InventoryLocationFilters";
import { PurchaseWizard } from "../purchases/PurchaseWizard";
export function InventoryDashboard({
  booking = false,
  scope,
}: {
  booking?: boolean;
  scope?: { project: string; block: string };
}) {
  const [filters, setFilters] = useState<InventoryFilters>({
    project: "",
    block: "",
    floor: "",
    search: "",
  });
  const projectId = scope?.project;
  const blockId = scope?.block;
  const scopedFilters: InventoryFilters = {
    ...filters,
    project: projectId ?? filters.project,
    block: blockId ?? filters.block,
  };
  const [selectedUnit, setSelectedUnit] =
    useState<BuildingInventoryUnit | null>(null);
  const [data, setData] = useState<BuildingInventoryResponse | null>(null);
  const [status, setStatus] = useState(booking ? "AVAILABLE" : "ALL"),
    [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const query = new URLSearchParams({
    ...scopedFilters,
    status,
    page: String(page),
  }).toString();
  const searchDelay = filters.search ? 200 : 0;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await managementFetch(`admin/inventory?${query}`, {
          signal: controller.signal,
        });
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
    const timer = setTimeout(() => void load(), searchDelay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, revision, searchDelay]);
  const summary = data?.summary;
  const stats = [
    ["Нийт блок", summary?.blocks],
    ["Нийт нэгж", summary?.total],
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
          <h2>
            {scope ? "Байрны бүртгэл" : "Байр, талбайн борлуулалтын тойм"}
          </h2>
          <p>Орон сууц, үйлчилгээ, гарааш, зогсоолын нэгдсэн бүртгэл</p>
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
          {!scope && (
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
            </>
          )}
          <InventoryLocationFilters
            value={scopedFilters}
            lockLocation={Boolean(scope)}
            onChange={(value) => {
              setFilters(value);
              setPage(1);
            }}
          />
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
              {loading ? "Ачаалж байна…" : `${data?.total ?? 0} нэгж`}
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
            <InventoryUnitTable
              booking={booking}
              units={data.units}
              statuses={statuses}
              onSelect={setSelectedUnit}
            />
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
          onClose={() => {
            setSelectedUnit(null);
            setRevision((value) => value + 1);
          }}
        >
          {booking && selectedUnit.status === "AVAILABLE" ? (
            <PurchaseWizard unit={selectedUnit} />
          ) : (
            <PurchaseDetails unit={selectedUnit} />
          )}
        </BuildingDialog>
      )}
    </section>
  );
}
