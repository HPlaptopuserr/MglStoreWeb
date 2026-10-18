"use client";
import { BuildingDialog } from "../manage/BuildingDialog";
import { PlanUnitsDialog } from "./PlanUnitsDialog";
import "../manage/management-workspace.css";
import { usePlanShortcuts } from "./usePlanShortcuts";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Download, ImagePlus, Upload } from "lucide-react";
import { PlanImageTemplates } from "./PlanImageTemplates";
import { PlanCanvas, type PlanTool } from "./PlanCanvas";
import { PlanLayers } from "./PlanLayers";
import { PlanInspector } from "./PlanInspector";
import { PlanToolbar } from "./PlanToolbar";
import { PlanAssignments } from "./PlanAssignments";
import { usePlanEditor } from "./usePlanEditor";
import { readPlanImage } from "./plan-storage";
import { canonicalPlanRegionId } from "@mgl/types/building-plans";
import { rectPoints, shapeLabels, type PlanShapeKind } from "./plan-model";
import "./plan-editor.css";
import "./plan-studio.css";
export function PlanEditor({
  projectId,
  blockId,
  embedded = false,
  onNext,
}: {
  projectId?: string;
  blockId?: string;
  embedded?: boolean;
  onNext?: () => void;
}) {
  const editor = usePlanEditor(projectId, blockId);
  const editorElement = useRef<HTMLElement>(null);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const changed = () =>
      setFullscreen(document.fullscreenElement === editorElement.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === editorElement.current)
        await document.exitFullscreen();
      else await editorElement.current?.requestFullscreen();
    } catch {
      editor.setError(
        "Бүтэн дэлгэцээр нээж чадсангүй. Хөтчийн бүтэн дэлгэцийн зөвшөөрлийг шалгана уу.",
      );
    }
  }
  const [tool, setTool] = useState<PlanTool>("select");
  const imageInput = useRef<HTMLInputElement>(null),
    jsonInput = useRef<HTMLInputElement>(null);
  const [imageMode, setImageMode] = useState<"3d" | "source">("3d");
  const original = editor.active;
  const active =
    original && imageMode === "source"
      ? {
          ...original,
          background: original.source?.background ?? null,
          shapes: original.source?.shapes ?? [],
        }
      : original;
  function updateVisible(
    update: (plan: NonNullable<typeof active>) => NonNullable<typeof active>,
  ) {
    editor.updatePlan((plan) => {
      if (imageMode === "3d") return update(plan);
      const next = update({
        ...plan,
        background: plan.source?.background ?? null,
        shapes: plan.source?.shapes ?? [],
      });
      return {
        ...plan,
        source: { background: next.background, shapes: next.shapes },
      };
    });
  }
  const onEditorKeyDown = usePlanShortcuts({
    shapes: active?.shapes ?? [],
    selectedId: editor.selectedId,
    onChange: (shapes) => updateVisible((plan) => ({ ...plan, shapes })),
    onSelect: editor.setSelectedId,
    undo: editor.undo,
    redo: editor.redo,
    save: () => {
      if (editor.dirty) void editor.save();
    },
    busy: editor.saving || editor.loading,
  });
  async function uploadImage(file?: File) {
    if (!file) return;
    editor.setError("");
    try {
      const background = await readPlanImage(file);
      updateVisible((plan) => ({ ...plan, background }));
    } catch (cause) {
      editor.setError(
        cause instanceof Error ? cause.message : "Зураг оруулж чадсангүй.",
      );
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 30_000_000)
        throw new Error("Файлын хэмжээ 30 MB-аас их байна.");
      editor.importLibrary(JSON.parse(await file.text()) as unknown);
    } catch (cause) {
      editor.setError(
        cause instanceof Error ? cause.message : "Файл нээж чадсангүй.",
      );
    }
  }
  function exportFile() {
    const blob = new Blob([JSON.stringify(editor.library, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = "building-floor-plans.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function addObject(kind: PlanShapeKind) {
    if (!active || active.shapes.length >= 200) return;
    const shape = {
      id: crypto.randomUUID(),
      kind,
      label: shapeLabels[kind],
      unitSlot: null,
      points: rectPoints(
        400,
        300,
        kind === "wall" ? 200 : 160,
        kind === "wall" ? 15 : 120,
      ),
    };
    updateVisible((plan) => ({ ...plan, shapes: [...plan.shapes, shape] }));
    editor.setSelectedId(shape.id);
    setTool("select");
  }
  if (editor.loading)
    return (
      <div className="plan-loading" role="status">
        Хадгалсан плануудыг ачаалж байна…
      </div>
    );
  return (
    <div
      className="plan-editor plan-studio"
      onKeyDownCapture={onEditorKeyDown}
      tabIndex={-1}
    >
      {!embedded && (
        <header className="plan-editor-heading">
          <div>
            <p className="building-eyebrow">БАРИЛГА / ПЛАН ЗАСВАРЛАГЧ</p>
            <h1>Давхрын план студи</h1>
            <p>
              Зураг оруулах → Байрны бүс зурах → Давхарт оноох → Байрны мэдээлэл
            </p>
          </div>
          <Link
            className="building-secondary"
            href={
              projectId
                ? `/building/manage/${projectId}/preview`
                : "/building/demo?floor=14"
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            Урьдчилан харах
            <ArrowUpRight size={16} />
          </Link>
        </header>
      )}
      {editor.error && (
        <div className="building-alert" role="alert">
          {editor.error}
          <button onClick={() => editor.setError("")}>Хаах</button>
        </div>
      )}
      {editor.notice && (
        <p className="plan-save-notice" role="status">
          {editor.notice}
        </p>
      )}
      {active ? (
        <div className="plan-studio-layout">
          <aside
            className="plan-studio-library"
            aria-label="План ба давхрын тохиргоо"
          >
            <h2>Планууд</h2>
            <div className="plan-library-bar">
              <label>
                Миний планууд
                <select
                  aria-label="План сонгох"
                  value={active?.id ?? ""}
                  onChange={(event) => {
                    editor.setActiveId(event.target.value);
                    editor.setSelectedId(null);
                    setTool("select");
                  }}
                >
                  {editor.library.plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={() => editor.addPlan()}>+ Шинэ план</button>
              <button disabled={!active} onClick={() => editor.addPlan(true)}>
                План хувилах
              </button>
              <button onClick={() => jsonInput.current?.click()}>
                <Upload size={15} />
                JSON нээх
              </button>
              <button onClick={exportFile}>
                <Download size={15} />
                Экспорт
              </button>
              <input
                ref={jsonInput}
                hidden
                type="file"
                accept=".json,application/json"
                onChange={(event) => {
                  void importFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
            <PlanImageTemplates
              disabled={editor.library.plans.length >= 30 || editor.saving}
              onError={editor.setError}
              onAdd={(plan) => {
                editor.commit((library) => ({
                  ...library,
                  plans: [...library.plans, plan],
                }));
                editor.setActiveId(plan.id);
                editor.setSelectedId(null);
                setTool("polygon");
              }}
            />
            <details className="studio-settings" open>
              <summary>Зураг ба нэр</summary>{" "}
              <div className="plan-title-bar">
                <label>
                  Планын нэр
                  <input
                    aria-label="Планын нэр"
                    maxLength={100}
                    value={active.name}
                    onChange={(event) =>
                      editor.updatePlan((plan) => ({
                        ...plan,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <div>
                  <button onClick={() => imageInput.current?.click()}>
                    <ImagePlus size={16} />
                    План зураг оруулах
                  </button>
                  {active.background && (
                    <button
                      onClick={() =>
                        updateVisible((plan) => ({ ...plan, background: null }))
                      }
                    >
                      Дэвсгэр арилгах
                    </button>
                  )}
                  <small>
                    PNG / JPG / WebP · 20 MB хүртэл · хадгалахад автоматаар
                    шахна
                  </small>
                </div>
                <input
                  ref={imageInput}
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    void uploadImage(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </div>
            </details>
            <button
              type="button"
              className="studio-assign-button"
              onClick={() => {
                setAssignmentsOpen(true);
                editorElement.current?.scrollIntoView({
                  block: "start",
                  behavior: "smooth",
                });
              }}
            >
              Давхарт оноох →
            </button>
          </aside>
          <div className="plan-studio-main">
            <section
              ref={editorElement}
              className="plan-focus-workspace"
              aria-label="План зурах ажлын талбар"
            >
              <div className="plan-toolbar plan-workspace-actions">
                <button type="button" onClick={() => setUnitsOpen(true)}>
                  Байрны мэдээлэл (
                  {
                    active.shapes.filter((shape) => shape.kind === "unit")
                      .length
                  }
                  )
                </button>
                <button
                  type="button"
                  aria-expanded={assignmentsOpen}
                  aria-controls="studio-floor-assignments"
                  onClick={() => setAssignmentsOpen((open) => !open)}
                >
                  Давхарт оноох
                </button>
                <button
                  type="button"
                  aria-pressed={fullscreen}
                  onClick={() => void toggleFullscreen()}
                >
                  {fullscreen
                    ? "↙ Хэвийн хэмжээнд буцах"
                    : "⛶ Бүтэн дэлгэцээр нээх"}
                </button>
                {onNext && (
                  <button
                    className="studio-save"
                    type="button"
                    disabled={editor.saving}
                    onClick={async () => {
                      if (await editor.save()) {
                        if (
                          document.fullscreenElement === editorElement.current
                        )
                          await document
                            .exitFullscreen()
                            .catch(() => undefined);
                        onNext();
                      }
                    }}
                  >
                    {editor.saving
                      ? "Хадгалж байна…"
                      : "Хадгалаад дараагийн алхам →"}
                  </button>
                )}
                <button
                  className="studio-save"
                  type="button"
                  disabled={editor.saving || !editor.dirty}
                  onClick={() => void editor.save()}
                >
                  {editor.saving ? "Хадгалж байна…" : "Хадгалах"}
                </button>
                <button
                  type="button"
                  aria-pressed={imageMode === "3d"}
                  onClick={() => {
                    setImageMode("3d");
                    editor.setSelectedId(null);
                  }}
                >
                  3D зураг
                </button>
                <button
                  type="button"
                  aria-pressed={imageMode === "source"}
                  onClick={() => {
                    setImageMode("source");
                    editor.setSelectedId(null);
                  }}
                >
                  Эх зураг
                </button>
                <button
                  type="button"
                  onClick={() => imageInput.current?.click()}
                >
                  Зураг оруулах
                </button>
                <span role="status">
                  {editor.notice ||
                    (editor.dirty
                      ? "Хадгалаагүй өөрчлөлт байна"
                      : "Өөрчлөлт хадгалагдсан")}
                </span>
                {editor.error && <p role="alert">{editor.error}</p>}
              </div>
              {unitsOpen && (
                <PlanUnitsDialog
                  shapes={active.shapes}
                  onChange={(shapes) =>
                    updateVisible((plan) => ({ ...plan, shapes }))
                  }
                  onClose={() => setUnitsOpen(false)}
                  onSave={editor.save}
                  saving={editor.saving}
                  error={editor.error}
                />
              )}
              {assignmentsOpen && (
                <BuildingDialog
                  title="Давхарт оноох"
                  subtitle={active.name}
                  onClose={() => setAssignmentsOpen(false)}
                >
                  <div className="plan-editor">
                    <div className="plan-toolbar">
                      <strong>Давхрын тохиргоо</strong>
                      <button
                        type="button"
                        onClick={() => setAssignmentsOpen(false)}
                      >
                        Хаах
                      </button>
                      <button
                        type="button"
                        disabled={editor.saving || !editor.dirty}
                        onClick={() => void editor.save()}
                      >
                        {editor.saving
                          ? "Хадгалж байна…"
                          : "Өөрчлөлтийг хадгалах"}
                      </button>
                    </div>
                    <label>
                      Блокийн давхрын тоо
                      <input
                        type="number"
                        min={Math.max(1, ...(editor.floorNumbers ?? []))}
                        max={100}
                        value={Math.max(1, ...(editor.floorNumbers ?? []))}
                        onChange={(event) =>
                          editor.setFloorCount(Number(event.target.value))
                        }
                      />
                    </label>
                    <PlanAssignments
                      key={active.id}
                      floors={editor.floorNumbers}
                      library={editor.library}
                      planId={active.id}
                      onChange={(assignments) =>
                        editor.commit((value) => ({ ...value, assignments }))
                      }
                    />
                    {editor.error && <p role="alert">{editor.error}</p>}
                  </div>
                </BuildingDialog>
              )}
              <PlanToolbar
                tool={tool}
                onTool={setTool}
                canUndo={editor.canUndo}
                canRedo={editor.canRedo}
                undo={editor.undo}
                redo={editor.redo}
                onAdd={addObject}
              />
              <div className="plan-editor-workspace">
                <PlanLayers
                  shapes={active.shapes}
                  selectedId={editor.selectedId}
                  onSelect={(id) => {
                    setTool("select");
                    editor.setSelectedId(id);
                  }}
                  onRename={(id, name) =>
                    updateVisible((plan) => ({
                      ...plan,
                      shapes: plan.shapes.map((shape) =>
                        shape.id === id ? { ...shape, label: name } : shape,
                      ),
                    }))
                  }
                />
                <PlanCanvas
                  key={`${active.id}-${imageMode}`}
                  plan={active}
                  tool={tool}
                  selectedId={editor.selectedId}
                  onSelect={editor.setSelectedId}
                  onChange={(shapes) =>
                    updateVisible((plan) => ({ ...plan, shapes }))
                  }
                />
                <PlanInspector
                  onOpenUnits={() => setUnitsOpen(true)}
                  onOpenDetails={
                    projectId && blockId
                      ? async () => {
                          const floor = Object.entries(
                            editor.library.assignments,
                          ).find(([, id]) => id === active.id)?.[0];
                          if (!floor) {
                            setAssignmentsOpen(true);
                            editor.setError(
                              "Эхлээд энэ планыг давхарт онооно уу.",
                            );
                            return;
                          }
                          const shape = active.shapes.find(
                            (item) => item.id === editor.selectedId,
                          );
                          const regionId =
                            original && shape
                              ? canonicalPlanRegionId(original, shape)
                              : null;
                          if (!regionId) {
                            editor.setError(
                              "Энэ бүсийн үндсэн план дахь байрыг тодорхойлж чадсангүй.",
                            );
                            return;
                          }
                          if (!editor.dirty || (await editor.save()))
                            window.location.assign(
                              `/building/manage/${projectId}/website?tab=units&block=${blockId}&floor=${floor}&region=${encodeURIComponent(regionId)}`,
                            );
                        }
                      : undefined
                  }
                  onError={editor.setError}
                  plan={active}
                  selectedId={editor.selectedId}
                  onSelect={editor.setSelectedId}
                  onChange={(shapes) =>
                    updateVisible((plan) => ({ ...plan, shapes }))
                  }
                />
              </div>
            </section>
            <p className="plan-save-status">
              {editor.dirty
                ? "● Хадгалаагүй өөрчлөлт байна"
                : "✓ Бүх өөрчлөлт хадгалагдсан"}{" "}
              · {active.shapes.length} объект / 200 ·{" "}
              {editor.library.plans.length} план / 30
            </p>
          </div>
        </div>
      ) : (
        <div className="building-empty">
          <h2>План алга</h2>
          <p>«Шинэ план» товч дарж эхлээрэй.</p>
        </div>
      )}
    </div>
  );
}
