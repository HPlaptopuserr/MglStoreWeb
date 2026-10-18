"use client";
import { useMemo, useState } from "react";
import { createDemoInventory } from "../sales/demo-inventory";
export function usePropertyViewer(
  initialFloor: number,
  initialUnit: string | null,
) {
  const [units, setUnits] = useState(createDemoInventory);
  const [floor, setFloor] = useState(initialFloor);
  const [selectedId, setSelectedId] = useState<string | null>(initialUnit);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const floorUnits = useMemo(
    () => units.filter((unit) => unit.floor === floor),
    [units, floor],
  );
  const selected = floorUnits.find((unit) => unit.id === selectedId);
  const minimumPrice = Math.min(
    ...floorUnits
      .filter((unit) => unit.status === "available")
      .map((unit) => unit.price),
  );
  function changeFloor(next: number) {
    setFloor(next);
    setSelectedId(null);
    setHoveredId(null);
    setQuery("");
    setDetailsOpen(false);
    setCopyStatus("");
    setZoom(1);
  }
  async function copyLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("floor", String(floor));
    if (selectedId) url.searchParams.set("unit", selectedId);
    else url.searchParams.delete("unit");
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyStatus("Холбоос хууллаа");
    } catch {
      setCopyStatus("Хуулж чадсангүй. Хөтчийн хаягийг хуулна уу.");
    }
  }
  return {
    units,
    setUnits,
    floor,
    selectedId,
    setSelectedId,
    hoveredId,
    setHoveredId,
    availableOnly,
    setAvailableOnly,
    query,
    setQuery,
    zoom,
    setZoom,
    detailsOpen,
    setDetailsOpen,
    copyStatus,
    floorUnits,
    selected,
    minimumPrice,
    changeFloor,
    copyLink,
  };
}
