"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { WebsiteProject } from "@mgl/types/building-website";
import { managementFetch, responseError } from "@/features/building/api/management-client";
import { resolveFloorPlanUnits } from "../website/floor-plan-units";
import { UnitPlanPreview } from "./UnitPlanPreview";
import { UnitDetailsEditor } from "./UnitDetailsEditor";
import "./unit-editor.css";

export function UnitManagementPanel({
  initial,
  blockId,
  active = true,
  preferredPlanId,
}: {
  active?: boolean;
  preferredPlanId?: string;
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
  const library = project.website.plansByBlock[blockId];
  const assignedPlanIds = new Set(
    block?.floors.map((floor) => library?.assignments[String(floor.number)]) ??
      [],
  );
  const assignedPlans =
    library?.plans.filter((plan) => assignedPlanIds.has(plan.id)) ?? [];
  const [planId, setPlanId] = useState(
    preferredPlanId ||
      library?.assignments[String(number)] ||
      assignedPlans[0]?.id ||
      "",
  );
  const plan =
    assignedPlans.find((item) => item.id === planId) ?? assignedPlans[0];
  const assignedFloors =
    block?.floors
      .filter((item) => library?.assignments[String(item.number)] === plan?.id)
      .sort((a, b) => a.number - b.number) ?? [];
  const floor =
    assignedFloors.find((item) => item.number === number) ?? assignedFloors[0];
  const entries = plan
    ? resolveFloorPlanUnits(
        floor?.units ?? [],
        plan,
        floor
          ? {
              floorId: floor.id,
              bindings: project.website.unitBindings,
            }
          : undefined,
      )
    : [];
  const [selectedId, setSelectedId] = useState<string | null>(
    search.get("region"),
  );
  const [editorTab, setEditorTab] = useState<"basics" | "images">(
    search.get("edit") === "images" ? "images" : "basics",
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
    if (!active) return;
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
        if (!controller.signal.aborted) {
          setProject(result.project);
          if (preferredPlanId) setPlanId(preferredPlanId);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Алдаа гарлаа.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [initial.id, active, blockId, preferredPlanId]);
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
          <h2>План дээр байрны мэдээлэл оруулах</h2>
          <p>
            Планаа сонгоод өмнөх алхамд хадгалсан планын байрны бүс дээр дарна
            уу. Планын бүсийн зураг, талбай, өрөөний мэдээлэл оноосон бүх
            давхарт нийтлэг хадгалагдана.
          </p>
        </div>
      </header>
      <div className="website-field-grid">
        <label>
          План сонгох
          <select
            disabled={!assignedPlans.length || busy}
            value={plan?.id ?? ""}
            onChange={(event) => {
              setPlanId(event.target.value);
              setNumber(0);
              setQuery("");
              setSelectedId(null);
            }}
          >
            {!assignedPlans.length && (
              <option value="">Энэ блокт оноосон план байхгүй</option>
            )}
            {assignedPlans.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
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
        {plan?.name ?? "Энэ блокт оноосон план байхгүй байна."} ·{" "}
        {entries.length} байр
      </p>
      {plan && (
        <p className="unit-plan-scope">
          {assignedFloors.length
            ? `Оноосон давхар: ${assignedFloors.map((item) => item.number).join(", ")}. Бүсийн зураг, мэдээлэл эдгээр давхарт нийтлэг. Тоот, үнэ, төлөв: ${floor?.number}-р давхрын байр.`
            : "Энэ планыг давхарт оноогоогүй байна. 2-р алхамд давхарт оноож хадгалсны дараа байрны мэдээлэл оруулна."}
        </p>
      )}
      {floor && entries.some((entry) => !entry.unit) && (
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
      {plan && (
        <UnitPlanPreview
          key={plan.id}
          plan={plan}
          entries={entries}
          matchingIds={filtered.map((entry) => entry.id)}
          selectedId={selectedId}
          busy={busy}
          readOnly={!floor}
          onSelect={(id) => {
            setEditorTab("basics");
            const entry = entries.find((item) => item.id === id);
            if (entry?.unit) setSelectedId(id);
            else void prepare(id);
          }}
        />
      )}
      {entries.length > 0 && !filtered.length && (
        <p>Хайлтад тохирох байр олдсонгүй.</p>
      )}
      {!entries.length && (
        <p>
          2-р алхам «Давхрын план» хэсэгт байрны бүс үүсгэж, планыг энэ блокийн
          давхруудад оноогоод хадгална уу.
        </p>
      )}
      {active && selected?.unit && floor && (
        <UnitDetailsEditor
          key={`${selected.id}:${project.updatedAt}`}
          initialTab={editorTab}
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
