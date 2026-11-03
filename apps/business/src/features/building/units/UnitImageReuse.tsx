"use client";
import { useState } from "react";
import Image from "next/image";
import type { BuildingUnitContent } from "@mgl/types/building-website";
import { copyUnitLayouts, type UnitImageSource } from "./unit-image-library";

export function UnitImageReuse({
  sources,
  value,
  onChange,
}: {
  sources: UnitImageSource[];
  value: BuildingUnitContent;
  onChange: (value: BuildingUnitContent) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [notice, setNotice] = useState("");
  const selected = sources.find((source) => source.unitId === selectedId);
  const filtered = sources.filter((source) =>
    `${source.label} ${source.areaM2 ?? ""}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <details className="unit-image-reuse">
      <summary>Өмнө оруулсан байрны зураг ашиглах ({sources.length})</summary>
      <p>
        Ижил загварын байрны зургийг сонгож энэ байранд ашиглана. Эх байрны
        мэдээлэл өөрчлөгдөхгүй.
      </p>
      {!sources.length ? (
        <p>Эхлээд аль нэг байрны 2D эсвэл 3D зургийг оруулж хадгална уу.</p>
      ) : (
        <>
          <label>
            Эх байр хайх
            <input
              type="search"
              placeholder="Загвар, тоот, талбай…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedId("");
                setNotice("");
              }}
            />
          </label>
          <label>
            Зураг авах байр
            <select
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setNotice("");
              }}
            >
              <option value="">Байр сонгох</option>
              {filtered.map((source) => (
                <option key={source.unitId} value={source.unitId}>
                  {source.label} · {source.areaM2 ?? "—"} м²
                </option>
              ))}
            </select>
          </label>
          {!filtered.length && <p>Тохирох байр олдсонгүй.</p>}
          {selected && (
            <div className="unit-reuse-preview">
              <Image
                src={selected.content.layout3d || selected.content.layout2d}
                alt={`${selected.label} — сонгосон эх зураг`}
                width={480}
                height={320}
                unoptimized
              />
              <p>
                {selected.label} · {selected.rooms ?? "—"} өрөө ·{" "}
                {selected.areaM2 ?? "—"} м²
              </p>
              <p>
                Эх байранд байгаа 2D/3D зураг таны одоогийн зургийг солино.
                Байрны талбай, үнэ, тоот хэвээр үлдэнэ.
              </p>
              <button
                type="button"
                className="building-secondary"
                onClick={() => {
                  onChange(copyUnitLayouts(value, selected.content));
                  setNotice(
                    "Зураг сонгогдлоо. Энэ байранд оноохын тулд Хадгалах товч дарна уу.",
                  );
                }}
              >
                Сонгосон зургийг энэ байранд ашиглах
              </button>
            </div>
          )}
        </>
      )}
      {notice && <p role="status">{notice}</p>}
    </details>
  );
}
