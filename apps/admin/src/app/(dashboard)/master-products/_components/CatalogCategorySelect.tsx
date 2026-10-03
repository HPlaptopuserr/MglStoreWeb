"use client";
import { useId, useState } from "react";
import { API } from "@/lib/api";
import { useAdminResource } from "@/lib/use-admin-resource";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}
export function CatalogCategorySelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className: string;
}) {
  const [query, setQuery] = useState("");
  const statusId = useId();
  const { data, loading, error, reload } = useAdminResource<Category[]>(
    `${API}/business-categories`,
  );
  const categories = data ?? [];
  const byId = new Map(categories.map((category) => [category.id, category]));
  function label(category: Category) {
    const path = [category.name];
    const visited = new Set([category.id]);
    let parentId = category.parentId;
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) break;
      path.unshift(parent.name);
      parentId = parent.parentId;
    }
    return path.join(" → ");
  }
  const options = [
    ...new Map(
      categories.map((category) => [
        category.name,
        { ...category, label: label(category) },
      ]),
    ).values(),
  ].sort((a, b) => a.label.localeCompare(b.label, "mn"));
  const terms = query
    .normalize("NFKC")
    .toLocaleLowerCase("mn")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const filteredOptions = options.filter((option) =>
    terms.every((term) =>
      option.label.normalize("NFKC").toLocaleLowerCase("mn").includes(term),
    ),
  );
  const selectedOutsideResults = options.find(
    (option) =>
      option.name === value &&
      !filteredOptions.some((result) => result.id === option.id),
  );
  const legacy =
    value && !categories.some((category) => category.name === value);
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700">
        Ангилал хайх
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Үндсэн эсвэл дэд ангиллын нэр…"
          disabled={loading || Boolean(error) || !categories.length}
          className={className}
          aria-describedby={statusId}
        />
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Ангилал
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={loading || Boolean(error) || !categories.length}
          className={className}
          aria-describedby={statusId}
        >
          <option value="">
            {loading ? "Ангилал ачааллаж байна…" : "Ангилал сонгох"}
          </option>
          {legacy && <option value={value}>{value} (одоогийн ангилал)</option>}
          {selectedOutsideResults && (
            <option value={selectedOutsideResults.name}>
              {selectedOutsideResults.label} (сонгосон)
            </option>
          )}
          {filteredOptions.map((category) => (
            <option key={category.id} value={category.name}>
              {category.label}
            </option>
          ))}
        </select>
      </label>
      <div
        id={statusId}
        aria-live="polite"
        className="mt-1 text-xs text-slate-500"
      >
        {error ? (
          <span role="alert">
            {error}{" "}
            <button
              type="button"
              onClick={reload}
              className="font-semibold text-blue-600 underline"
            >
              Дахин татах
            </button>
          </span>
        ) : !loading && !categories.length ? (
          "Идэвхтэй ангилал олдсонгүй."
        ) : !loading && terms.length > 0 ? (
          filteredOptions.length ? (
            `${filteredOptions.length} ангилал олдлоо.`
          ) : (
            "Тохирох ангилал олдсонгүй. Хайх үгээ өөрчилнө үү."
          )
        ) : null}
      </div>
    </div>
  );
}
