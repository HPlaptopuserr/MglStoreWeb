import Link from "next/link";
import { useState } from "react";
import type {
  WebsiteInventoryUnit,
  WebsiteProject,
} from "@mgl/types/building-website";
import { managementFetch, responseError } from "@/lib/building-management";
import { BuildingDialog } from "../manage/BuildingDialog";
import { ProjectStatus } from "../manage/ProjectStatus";
export function UnitContentEditor({
  project,
  onSaved,
}: {
  project: WebsiteProject;
  onSaved: () => void;
}) {
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState<WebsiteInventoryUnit | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const units = project.blocks.flatMap((block) =>
    block.floors.flatMap((floor) =>
      floor.units.map((unit) => ({
        ...unit,
        blockName: block.name,
        floorNumber: floor.number,
      })),
    ),
  );
  const filtered = units.filter(
    (unit) =>
      (statusFilter === "ALL" || unit.status === statusFilter) &&
      `${unit.unitNo} ${unit.blockName}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  async function save() {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const response = await managementFetch(
        `admin/projects/${project.id}/units/${selected.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ ...selected, updatedAt: project.updatedAt }),
        },
      );
      if (!response.ok)
        throw new Error(await responseError(response, "Хадгалж чадсангүй"));
      setSelected(null);
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="website-form-section">
      <h2>Үндсэн мэдээлэл · Байрны м²-ийн үнэ, төлөв</h2>
      <Link className="building-primary" href={`/building/manage/${project.id}/edit`}>+ Байр нэмэх</Link>
      <p>Блокийн «Байр нэмэх / засах» хэсэгт давхраа сонгож, тоот, өрөөний тоо, м² оруулна.</p>
      <label>
        Байр, блокийн дугаараар хайх
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
        />
      </label>
      <label>
        Борлуулалтын төлөв
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(0);
          }}
        >
          {[
            ["ALL", "Бүх төлөв"],
            ["AVAILABLE", "Боломжтой"],
            ["RESERVED", "Захиалгатай"],
            ["SOLD", "Зарагдсан"],
            ["HOLD", "Түр түгжсэн"],
            ["CONTRACT_PENDING", "Гэрээ хүлээж буй"],
            ["CANCELLED", "Цуцалсан"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p>{filtered.length} нэгж · Байраа сонгоод үнэ, төлөвийг засна.</p>
      <div className="website-units">
        {filtered.slice(page * 24, (page + 1) * 24).map((unit) => (
          <button
            key={unit.id}
            type="button"
            onClick={() => {
              setError("");
              setSelected(unit);
            }}
          >
            <strong>
              {unit.blockName} / {unit.floorNumber} давхар / № {unit.unitNo}
            </strong>
            <span>
              {unit.areaM2 ?? "—"} м² ·{" "}
              {unit.priceTotal
                ? `${Number(unit.priceTotal).toLocaleString()} ₮`
                : "Үнэ оруулаагүй"}
            </span>
            <small>
              <ProjectStatus status={unit.status} /> ·{" "}
              {unit.published ? "Нийтэлсэн" : "Нууцалсан"}
            </small>
          </button>
        ))}
      </div>
      {filtered.length > 24 && (
        <div className="management-pagination">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            ← Өмнөх
          </button>
          <span>
            {page + 1} / {Math.ceil(filtered.length / 24)}
          </span>
          <button
            disabled={(page + 1) * 24 >= filtered.length}
            onClick={() => setPage(page + 1)}
          >
            Дараах →
          </button>
        </div>
      )}
      {!filtered.length && <p>Тохирох нэгж алга.</p>}
      {selected && (
        <BuildingDialog
          title={`№ ${selected.unitNo} — Үнэ, төлөв`}
          subtitle="Нэгжийн мэдээлэл"
          onClose={() => !saving && setSelected(null)}
          footer={
            <button
              className="building-primary"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "Хадгалж байна…" : "Хадгалах"}
            </button>
          }
        >
          <div className="website-form-section">
            <fieldset disabled={saving}>
              <label>
                Төрөл / зориулалт
                <input
                  value={selected.typeLabel ?? ""}
                  onChange={(event) =>
                    setSelected({ ...selected, typeLabel: event.target.value })
                  }
                />
              </label>
              <div className="website-field-grid">
                <label>
                  Өрөө
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={selected.rooms ?? ""}
                    onChange={(event) =>
                      setSelected({
                        ...selected,
                        rooms: event.target.value
                          ? Number(event.target.value)
                          : null,
                      })
                    }
                  />
                </label>
                <label>
                  Талбай м²
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={selected.areaM2 ?? ""}
                    onChange={(event) =>
                      setSelected({ ...selected, areaM2: event.target.value, priceTotal: selected.pricePerM2 !== null && event.target.value ? String(Math.round(Number(selected.pricePerM2) * Number(event.target.value) * 100) / 100) : null })
                    }
                  />
                </label>
              </div>
              <label>
                М²-ийн үнэ ₮
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={selected.pricePerM2 ?? ""}
                  onChange={(event) =>
                    setSelected({ ...selected, pricePerM2: event.target.value || null, priceTotal: event.target.value && selected.areaM2 ? String(Math.round(Number(event.target.value) * Number(selected.areaM2) * 100) / 100) : null })
                  }
                />
              </label>
              <p role="status">Нийт үнэ: {selected.priceTotal !== null ? Number(selected.priceTotal).toLocaleString("mn-MN") + " ₮" : "—"} · Талбай × м²-ийн үнэ</p>
              <label>
                Борлуулалтын төлөв
                <select
                  value={selected.status}
                  onChange={(event) =>
                    setSelected({ ...selected, status: event.target.value })
                  }
                >
                  {[
                    ["AVAILABLE", "Боломжтой"],
                    ["RESERVED", "Захиалгатай"],
                    ["SOLD", "Зарагдсан"],
                    ["CONTRACT_PENDING", "Гэрээ хүлээгдэж буй"],
                    ["HOLD", "Түр хаасан"],
                    ["CANCELLED", "Цуцлагдсан"],
                  ].map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="website-checkbox">
                <input
                  type="checkbox"
                  checked={selected.published}
                  onChange={(event) =>
                    setSelected({
                      ...selected,
                      published: event.target.checked,
                    })
                  }
                />
                Хэрэглэгчийн хуудсанд харуулах
              </label>
            </fieldset>
            {error && <p role="alert">{error}</p>}
          </div>
        </BuildingDialog>
      )}
    </section>
  );
}
