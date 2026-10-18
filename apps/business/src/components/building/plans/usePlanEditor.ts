"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyLibrary,
  makePlan,
  parseLibrary,
  type FloorPlan,
  type PlanLibrary,
} from "./plan-model";
import { managementFetch, responseError } from "@/lib/building-management";
import type { WebsiteProject } from "@mgl/types/building-website";
import { createFourUnitPlan } from "./plan-presets";
import { loadPlanLibrary, savePlanLibrary } from "./plan-storage";
interface EditorHistory {
  past: PlanLibrary[];
  present: PlanLibrary;
  future: PlanLibrary[];
}
export function usePlanEditor(projectId?: string, blockId?: string) {
  const revision = useRef("");
  const selectionKey = `building-plan-selection:${projectId ?? "demo"}:${blockId ?? "demo"}`;
  const [floorNumbers, setFloorNumbers] = useState<number[] | undefined>();
  async function loadLibrary() {
    if (!projectId || !blockId) return loadPlanLibrary();
    const response = await managementFetch(
      `admin/projects/${projectId}/website`,
    );
    if (!response.ok)
      throw new Error(await responseError(response, "План ачаалж чадсангүй"));
    const { project } = (await response.json()) as { project: WebsiteProject };
    revision.current = project.updatedAt;
    const block = project.blocks.find((value) => value.id === blockId);
    if (!block) throw new Error("Блок олдсонгүй");
    setFloorNumbers(block.floors.map((floor) => floor.number));
    return block.id in project.website.plansByBlock
      ? project.website.plansByBlock[block.id]
      : emptyLibrary();
  }
  async function persistLibrary(value: PlanLibrary) {
    const validated = parseLibrary(value);
    if (!projectId || !blockId) return savePlanLibrary(validated);
    // Unit details share the project revision, but do not change this plan.
    // Rebase those independent edits while retaining conflicts on plan changes.
    const latestResponse = await managementFetch(
      `admin/projects/${projectId}/website`,
    );
    if (!latestResponse.ok)
      throw new Error(
        await responseError(latestResponse, "Мэдээлэл ачаалж чадсангүй."),
      );
    const { project: latest } = (await latestResponse.json()) as {
      project: WebsiteProject;
    };
    if (latest.updatedAt !== revision.current) {
      if (
        JSON.stringify(
          latest.website.plansByBlock[blockId] ?? emptyLibrary(),
        ) !== JSON.stringify(savedSnapshot)
      )
        throw new Error(
          "План өөр цонхонд өөрчлөгдсөн байна. Өөрчлөлтөө JSON экспортоор хадгалаад хуудсаа шинэчилнэ үү.",
        );
      revision.current = latest.updatedAt;
    }
    const response = await managementFetch(
      `admin/projects/${projectId}/website`,
      {
        method: "PATCH",
        body: JSON.stringify({
          updatedAt: revision.current,
          blockId,
          floorCount: Math.max(0, ...(floorNumbers ?? [])),
          planLibrary: validated,
        }),
      },
    );
    if (!response.ok)
      throw new Error(await responseError(response, "Хадгалж чадсангүй"));
    const result = (await response.json()) as {
      project: { updatedAt: string };
    };
    revision.current = result.project.updatedAt;
  }
  const [history, setHistory] = useState<EditorHistory>({
    past: [],
    present: emptyLibrary(),
    future: [],
  });
  const [activeId, setActiveId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState<PlanLibrary | null>(null);
  const library = history.present,
    active =
      library.plans.find((plan) => plan.id === activeId) ?? library.plans[0];
  const dirty = library !== savedSnapshot;
  const loadRef = useRef(loadLibrary);
  useEffect(() => {
    let cancelled = false;
    void loadRef
      .current()
      .then((value) => {
        if (cancelled) return;
        const loaded = value.plans.length
          ? value
          : {
              ...value,
              plans: [projectId ? makePlan() : createFourUnitPlan()],
            };
        setHistory({ past: [], present: loaded, future: [] });
        setSavedSnapshot(loaded);
        let remembered: string | null = null;
        try {
          remembered = localStorage.getItem(selectionKey);
        } catch {
          /* Selection persistence is optional. */
        }
        setActiveId(
          loaded.plans.find((plan) => plan.id === remembered)?.id ??
            loaded.plans[0].id,
        );
      })
      .catch((cause) => {
        if (!cancelled)
          setError(
            cause instanceof Error ? cause.message : "План ачаалж чадсангүй.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, selectionKey]);
  useEffect(() => {
    if (loading || !activeId) return;
    try {
      localStorage.setItem(selectionKey, activeId);
    } catch {
      /* Saving the plan still works without this preference. */
    }
  }, [activeId, loading, selectionKey]);
  useEffect(() => {
    if (!dirty || loading) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, loading]);
  const commit = useCallback(
    (update: (library: PlanLibrary) => PlanLibrary) => {
      setHistory((previous) => ({
        past: [...previous.past.slice(-29), previous.present],
        present: update(previous.present),
        future: [],
      }));
      setNotice("");
    },
    [],
  );
  function updatePlan(update: (plan: FloorPlan) => FloorPlan) {
    if (!active) return;
    commit((value) => ({
      ...value,
      plans: value.plans.map((plan) =>
        plan.id === active.id ? update(plan) : plan,
      ),
    }));
  }
  function undo() {
    setHistory((value) =>
      value.past.length
        ? {
            past: value.past.slice(0, -1),
            present: value.past[value.past.length - 1],
            future: [value.present, ...value.future],
          }
        : value,
    );
    setSelectedId(null);
  }
  function redo() {
    setHistory((value) =>
      value.future.length
        ? {
            past: [...value.past, value.present],
            present: value.future[0],
            future: value.future.slice(1),
          }
        : value,
    );
    setSelectedId(null);
  }
  function addPlan(copy = false) {
    if (library.plans.length >= 30) {
      setError("Хамгийн ихдээ 30 план хадгална.");
      return;
    }
    const plan =
      copy && active
        ? {
            ...active,
            id: crypto.randomUUID(),
            name: `${active.name.slice(0, 85)} (хуулбар)`,
            shapes: active.shapes.map((shape) => ({
              ...shape,
              id: crypto.randomUUID(),
            })),
          }
        : makePlan();
    commit((value) => ({ ...value, plans: [...value.plans, plan] }));
    setActiveId(plan.id);
    setSelectedId(null);
  }
  async function save(): Promise<boolean> {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await persistLibrary(library);
      setSavedSnapshot(library);
      setNotice(
        projectId
          ? "План серверт хадгалагдлаа. Оноосон давхрын төлөв шинэчлэгдэнэ."
          : "Энэ хөтөч дээр хадгаллаа. Оноосон давхрыг хэрэглэгчийн жишээнээс үзээрэй.",
      );
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Хадгалж чадсангүй.");
      return false;
    } finally {
      setSaving(false);
    }
  }
  function importLibrary(value: unknown) {
    const parsed = parseLibrary(value);
    commit(() => parsed);
    setActiveId(parsed.plans[0]?.id ?? "");
    setSelectedId(null);
    setNotice("Файл нээгдлээ. Хадгалах товч дарж баталгаажуулна уу.");
  }
  return {
    floorNumbers,
    setFloorCount: (count: number) => {
      if (!Number.isInteger(count) || count < 1 || count > 100) return;
      setFloorNumbers((current) =>
        [
          ...new Set([
            ...(current ?? []),
            ...Array.from({ length: count }, (_, i) => i + 1),
          ]),
        ].sort((a, b) => a - b),
      );
      commit((value) => ({ ...value }));
    },
    library,
    active,
    activeId,
    setActiveId,
    selectedId,
    setSelectedId,
    loading,
    saving,
    error,
    setError,
    notice,
    dirty,
    commit,
    updatePlan,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    addPlan,
    save,
    importLibrary,
  };
}
