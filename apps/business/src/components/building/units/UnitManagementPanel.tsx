"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { WebsiteProject } from "@mgl/types/building-website";
import { managementFetch, responseError } from "@/lib/building-management";
import { resolveFloorPlanUnits } from "../content/floor-plan-units";
import { ProjectStatus } from "../manage/ProjectStatus";
import { UnitDetailsEditor } from "./UnitDetailsEditor";
import "./unit-editor.css";

export function UnitManagementPanel({
  initial,
  blockId,
}: {
  initial: WebsiteProject;
  blockId: string;
}) {
  const search = useSearchParams();
  const [project, setProject] = useState(initial);
  const [loading, setLoading] = useState(true);
  const block = project.blocks.find((item) => item.id === blockId);
  const [number, setNumber] = useState(
    Number(search.get("floor")) || block?.floors[0]?.number || 1,
  );
  const floor =
    block?.floors.find((item) => item.number === number) ?? block?.floors[0];
  const library = project.website.plansByBlock[blockId];
  const plan = library?.plans.find(
    (item) => item.id === library.assignments[String(floor?.number)],
  );
  const entries =
    floor && plan
      ? resolveFloorPlanUnits(floor.units, plan, {
          floorId: floor.id,
          bindings: project.website.unitBindings,
        })
      : [];
  const [selectedId, setSelectedId] = useState<string | null>(
    search.get("region"),
  );
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const selected = entries.find((entry) => entry.id === selectedId);
  async function refresh() {
    const response = await managementFetch(
      `admin/projects/${project.id}/website`,
    );
    if (!response.ok)
      throw new Error(
        await responseError(response, "Мэдээлэл ачаалж чадсангүй."),
      );
    const result = (await response.json()) as { project: WebsiteProject };
    setProject(result.project);
  }
  useEffect(() => {
    const controller = new AbortController();
    void managementFetch(`admin/projects/${initial.id}/website`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            await responseError(response, "Мэдээлэл ачаалж чадсангүй."),
          );
        return response.json() as Promise<{ project: WebsiteProject }>;
      })
      .then((result) => {
        if (!controller.signal.aborted) setProject(result.project);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Алдаа гарлаа.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [initial.id]);
  async function prepare(regionId?: string) {
    setBusy(true);
    setError("");
    try {
      const response = await managementFetch(
        `admin/projects/${project.id}/website`,
        {
          method: "PATCH",
          body: JSON.stringify({
            updatedAt: project.updatedAt,
            blockId,
            syncPlanUnits: true,
          }),
        },
      );
      if (!response.ok)
        throw new Error(
          await responseError(response, "Байрны мэдээлэл бэлтгэж чадсангүй."),
        );
      await refresh();
      setNotice("Байрны бүртгэлүүд бэлэн боллоо.");
      if (regionId) setSelectedId(regionId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  }
  const filtered = entries.filter((entry) =>
    `${entry.label} ${entry.unitNo ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  if (loading)
    return (
      <section className="website-form-section" role="status">
        Байрны мэдээлэл ачаалж байна…
      </section>
    );
  return (
    <section className="website-form-section unit-management">
      <header>
        <div>
          <h2>Байрны мэдээлэл, зураг</h2>
          <p>
            Давхраа сонгоод байр бүрийн мэдээлэл, 2D/3D зураг, үнэ, төлөвийг
            засна.
          </p>
        </div>
      </header>
      <div className="website-field-grid">
        <label>
          Давхар
          <select
            value={floor?.number ?? ""}
            onChange={(event) => {
              setNumber(Number(event.target.value));
              setSelectedId(null);
            }}
          >
            {block?.floors.map((item) => (
              <option key={item.id} value={item.number}>
                {item.number}-р давхар
              </option>
            ))}
          </select>
        </label>
        <label>
          Байр хайх
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Нэр, тоот"
          />
        </label>
      </div>
      <p>
        {plan?.name ?? "Энэ давхарт план оноогоогүй байна."} · {entries.length}{" "}
        байр
      </p>
      {entries.some((entry) => !entry.unit) && (
        <div className="unit-prepare">
          <p>Өмнө хадгалсан планын бүсүүдийн байрны мэдээллийг бэлтгэнэ.</p>
          <button
            type="button"
            className="building-primary"
            disabled={busy}
            onClick={() => void prepare()}
          >
            {busy ? "Бэлтгэж байна…" : "Байрны мэдээлэл бэлтгэх"}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="building-alert">
          {error}
          <button
            onClick={() =>
              void refresh()
                .then(() => setError(""))
                .catch(() => setError("Дахин ачаалж чадсангүй."))
            }
          >
            Дахин ачаалах
          </button>
        </p>
      )}
      {notice && (
        <p role="status" className="website-notice">
          {notice}
        </p>
      )}
      <div className="unit-management-grid">
        {filtered.map((entry) => {
          const content = entry.unit
            ? project.website.unitContent?.[entry.unit.id]
            : undefined;
          return (
            <button
              key={entry.id}
              type="button"
              disabled={busy}
              onClick={() =>
                entry.unit ? setSelectedId(entry.id) : void prepare(entry.id)
              }
            >
              <strong>{entry.label}</strong>
              <span>
                № {entry.unitNo ?? "—"} · {entry.areaM2 ?? "—"} м² ·{" "}
                {entry.rooms ?? "—"} өрөө
              </span>
              {entry.unit && <ProjectStatus status={entry.unit.status} />}
              <small>
                {entry.areaM2 === null ? "Талбай дутуу" : "Мэдээлэлтэй"} ·{" "}
                {content?.layout2d || content?.layout3d
                  ? "Зурагтай"
                  : "Зураг дутуу"}{" "}
                · {entry.unit?.published ? "Нийтэлсэн" : "Ноорог"}
              </small>
              <span className="unit-card-edit">Мэдээлэл засах →</span>
            </button>
          );
        })}
      </div>
      {entries.length > 0 && !filtered.length && (
        <p>Хайлтад тохирох байр олдсонгүй.</p>
      )}
      {!entries.length && (
        <p>
          «План засах» хэсэгт байрны бүс үүсгэж, планыг энэ давхарт оноогоод
          хадгална уу.
        </p>
      )}
      {selected?.unit && floor && (
        <UnitDetailsEditor
          key={`${selected.id}:${project.updatedAt}`}
          project={project}
          unit={selected.unit}
          blockId={blockId}
          floorNumber={floor.number}
          regionId={selected.id}
          onClose={() => setSelectedId(null)}
          onSaved={async () => {
            await refresh();
            setNotice("Байрны мэдээлэл хадгалагдлаа.");
          }}
        />
      )}
    </section>
  );
}
