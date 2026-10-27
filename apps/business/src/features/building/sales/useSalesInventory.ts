"use client";
import { useMemo, useState } from "react";
import { createDemoInventory, kinds, type UnitKind } from "./demo-inventory";
export const PAGE_SIZE = 12;
export function useSalesInventory() {
  const [view, setView] = useState<"cards" | "matrix">("matrix");
  const [units, setUnits] = useState(createDemoInventory);
  const [kind, setKind] = useState<UnitKind>("apartment");
  const [floor, setFloor] = useState<number | null>(null);
  const [rooms, setRooms] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const selected = units.find((unit) => unit.id === selectedId);
  const filtered = useMemo(
    () =>
      units.filter(
        (unit) =>
          unit.kind === kind &&
          (floor === null || unit.floor === floor) &&
          (!rooms || unit.rooms === Number(rooms)) &&
          (!status || unit.status === status) &&
          unit.number.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [units, kind, floor, rooms, status, query],
  );
  const matrix =
    view === "matrix" && (kind === "apartment" || kind === "commercial");
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const totals = useMemo(
    () =>
      kinds.map((item) => ({
        ...item,
        total: units.filter((unit) => unit.kind === item.id).length,
        available: units.filter(
          (unit) => unit.kind === item.id && unit.status === "available",
        ).length,
      })),
    [units],
  );
  function changeKind(next: UnitKind) {
    setKind(next);
    setFloor(null);
    setRooms("");
    setQuery("");
    setPage(1);
  }
  function changeFloor(next: number | null) {
    setFloor(next);
    if (next !== null)
      setKind(
        next > 3
          ? "apartment"
          : next > 0
            ? "commercial"
            : next < 0
              ? "garage"
              : "parking",
      );
    setRooms("");
    setQuery("");
    setPage(1);
  }
  function resetFilters() {
    setFloor(null);
    setRooms("");
    setStatus("");
    setQuery("");
    setPage(1);
  }
  function reserve() {
    if (!selected || selected.status !== "available") return;
    setUnits((previous) =>
      previous.map((unit) =>
        unit.id === selected.id ? { ...unit, status: "reserved" } : unit,
      ),
    );
    setMessage(`№ ${selected.number} нэгжийн тест захиалга үүслээ.`);
    setSelectedId(null);
  }
  return {
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
  };
}
