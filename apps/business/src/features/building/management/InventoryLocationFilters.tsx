"use client";
import { useEffect, useState } from "react";
import { managementFetch } from "@/features/building/api/management-client";
export interface InventoryFilters {
  project: string;
  block: string;
  floor: string;
  search: string;
}
interface Option {
  id: string;
  title: string;
  blocks: { id: string; name: string; floors: { number: number }[] }[];
}
export function InventoryLocationFilters({
  value,
  onChange,
  lockLocation,
}: {
  value: InventoryFilters;
  lockLocation?: boolean;
  onChange: (value: InventoryFilters) => void;
}) {
  const [options, setOptions] = useState<Option[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    void managementFetch("admin/inventory-options", { signal: c.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const data = (await r.json()) as { projects: Option[] };
        if (!c.signal.aborted) setOptions(data.projects);
      })
      .catch(() => {
        if (!c.signal.aborted)
          setError("Блокийн шүүлтүүр ачаалсангүй. Хуудсаа шинэчилнэ үү.");
      });
    return () => c.abort();
  }, []);
  const blocks =
    options.find((p) => p.id === value.project)?.blocks ??
    options.flatMap((p) => p.blocks);
  const floors = blocks.find((b) => b.id === value.block)?.floors ?? [];
  return (
    <div className="purchase-filters">
      <label>
        Төсөл
        <select
          value={value.project}
          disabled={Boolean(lockLocation)}
          onChange={(e) =>
            onChange({
              ...value,
              project: e.target.value,
              block: "",
              floor: "",
            })
          }
        >
          <option value="">Бүх төсөл</option>
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Блок
        <select
          value={value.block}
          disabled={Boolean(lockLocation)}
          onChange={(e) =>
            onChange({ ...value, block: e.target.value, floor: "" })
          }
        >
          <option value="">Бүх блок</option>
          {blocks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Давхар
        <select
          value={value.floor}
          disabled={!value.block}
          onChange={(e) => onChange({ ...value, floor: e.target.value })}
        >
          <option value="">Бүх давхар</option>
          {floors.map((f) => (
            <option key={f.number} value={f.number}>
              {f.number < 0 ? `B${-f.number}` : f.number}
            </option>
          ))}
        </select>
      </label>
      <label>
        Тоот хайх
        <input
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="Жишээ: 1401"
        />
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
