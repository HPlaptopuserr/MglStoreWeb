"use client";
import { SalesHero } from "./SalesHero";
import { useSalesInventory, PAGE_SIZE } from "./useSalesInventory";
import {
  Building2,
  CarFront,
  House,
  RotateCcw,
  Search,
  Store,
} from "lucide-react";
import {
  floorLabel,
  kinds,
  statusLabels,
  type UnitStatus,
} from "./demo-inventory";
import { FloorSelector } from "./FloorSelector";
import { UnitMatrix } from "./UnitMatrix";
import { UnitCard } from "./UnitCard";
import { UnitDetails } from "./UnitDetails";
import "./sales.css";
export function SalesWorkspace() {
  const {
    view,
    setView,
    units,
    kind,
    floor,
    rooms,
    setRooms,
    status,
    setStatus,
    query,
    setQuery,
    setPage,
    selected,
    setSelectedId,
    message,
    filtered,
    matrix,
    pages,
    currentPage,
    totals,
    changeKind,
    changeFloor,
    resetFilters,
    reserve,
  } = useSalesInventory();
  const icons = [House, Store, Building2, CarFront];
  return (
    <div className="sales-workspace">
      <SalesHero />
      <div className="sales-demo-note">
        <span>ТЕСТ ӨГӨГДӨЛ</span> Үнэ болон борлуулалтын төлөв нь жишээ. Тест
        захиалга зөвхөн энэ хуудсыг шинэчлэх хүртэл хадгалагдана.
      </div>
      <section className="sales-metrics" aria-label="Барилгын нэгжүүд">
        {totals.map((item, index) => {
          const Icon = icons[index];
          return (
            <button
              key={item.id}
              onClick={() => changeKind(item.id)}
              aria-pressed={kind === item.id}
              className={kind === item.id ? "active" : ""}
            >
              <div>
                <Icon size={19} />
                <span>{item.label}</span>
              </div>
              <strong>
                {item.total.toLocaleString("en-US")}{" "}
                <small>
                  {item.id === "commercial"
                    ? "талбай"
                    : item.id === "apartment"
                      ? "байр"
                      : "зогсоол"}
                </small>
              </strong>
              <p>{item.description}</p>
              <span className="sales-metric-available">
                {item.available} боломжтой
              </span>
            </button>
          );
        })}
      </section>
      <div className="sales-content">
        <FloorSelector units={units} floor={floor} onSelect={changeFloor} />
        <section className="sales-list">
          <header className="sales-list-header">
            <div>
              <p className="sales-eyebrow">ӨӨРИЙН ОРОН ЗАЙГАА СОНГОХ</p>
              <h2>
                {kinds.find((item) => item.id === kind)?.label}{" "}
                <span>{floor === null ? "Бүх давхар" : floorLabel(floor)}</span>
              </h2>
            </div>
            <button className="sales-reset" onClick={resetFilters}>
              <RotateCcw size={14} />
              Шүүлтүүр арилгах
            </button>
          </header>
          <div className="sales-filters">
            <label className="sales-search">
              <Search size={17} />
              <input
                aria-label="Нэгжийн дугаараар хайх"
                placeholder="Дугаараар хайх…"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            {kind === "apartment" && (
              <select
                aria-label="Өрөөний тоо"
                value={rooms}
                onChange={(event) => {
                  setRooms(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Бүх өрөө</option>
                {[1, 2, 3, 4].map((value) => (
                  <option key={value} value={value}>
                    {value} өрөө
                  </option>
                ))}
              </select>
            )}
            <select
              aria-label="Борлуулалтын төлөв"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Бүх төлөв</option>
              {(Object.entries(statusLabels) as [UnitStatus, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>
          {(kind === "apartment" || kind === "commercial") && (
            <div className="building-tabs sales-view" aria-label="Харагдац">
              <button
                className={view === "matrix" ? "active" : ""}
                aria-pressed={view === "matrix"}
                onClick={() => setView("matrix")}
              >
                Давхрын матриц
              </button>
              <button
                className={view === "cards" ? "active" : ""}
                aria-pressed={view === "cards"}
                onClick={() => setView("cards")}
              >
                Байрны карт
              </button>
            </div>
          )}
          <div className="sales-result" role="status">
            {filtered.length} нэгж олдлоо <span>Үнэ нь жишээ тооцоолол</span>
          </div>
          {message && (
            <div className="sales-feedback" role="status">
              {message}
            </div>
          )}
          {filtered.length ? (
            matrix ? (
              <UnitMatrix
                units={filtered}
                onSelect={(unit) => setSelectedId(unit.id)}
              />
            ) : (
              <div className="sales-unit-grid">
                {filtered
                  .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                  .map((unit) => (
                    <UnitCard
                      key={unit.id}
                      unit={unit}
                      onSelect={(value) => setSelectedId(value.id)}
                    />
                  ))}
              </div>
            )
          ) : (
            <div className="sales-empty">
              <Search size={32} />
              <h3>Тохирох нэгж олдсонгүй</h3>
              <p>Давхар, өрөө эсвэл төлөвийн шүүлтүүрээ өөрчилнө үү.</p>
              <button className="building-secondary" onClick={resetFilters}>
                Бүх нэгжийг харах
              </button>
            </div>
          )}
          {!matrix && (
            <nav className="sales-pagination" aria-label="Нэгжийн хуудас">
              <span>
                {filtered.length
                  ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} / ${filtered.length}`
                  : "0 нэгж"}
              </span>
              <div>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  ← Өмнөх
                </button>
                <span>
                  {currentPage} / {pages}
                </span>
                <button
                  disabled={currentPage === pages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Дараах →
                </button>
              </div>
            </nav>
          )}
        </section>
      </div>
      {selected && (
        <UnitDetails
          unit={selected}
          onClose={() => setSelectedId(null)}
          onReserve={reserve}
        />
      )}
    </div>
  );
}
