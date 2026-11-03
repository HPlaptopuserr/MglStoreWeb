"use client";

import { EditorSteps, type EditorStep } from "./EditorSteps";
import { ProjectFacadeEditor } from "./ProjectFacadeEditor";
import { UnitManagementPanel } from "../units/UnitManagementPanel";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { WebsiteProject } from "@mgl/types/building-website";

const PlanEditor = dynamic(
  () => import("../plans/PlanEditor").then((module) => module.PlanEditor),
  { loading: () => <p role="status">План засварлагчийг ачаалж байна…</p> },
);

const planSteps: EditorStep[] = [
  {
    id: "facade",
    title: "Фасад, давхар",
    description:
      "Автомат фасад ашиглах эсвэл өөрийн зургаа оруулж давхруудаа тэмдэглэнэ. Энэ алхам сонголттой.",
  },
  {
    id: "plan",
    title: "Давхрын план",
    description:
      "План зургаа оруулаад байрны хүрээг зурж, давхруудад оноон хадгална.",
  },
  {
    id: "units",
    title: "План дээр мэдээлэл оруулах",
    description:
      "Хадгалсан планын бүс дээр дарж байрны мэдээлэл, зураг оруулна.",
  },
];
interface ProjectPlanStudioProps {
  project: WebsiteProject;
  blockId: string;
  onBlockChange: (id: string) => void;
  onNext: () => void;
  onFacadeSaved: () => void;
}

export function ProjectPlanStudio({
  project,
  blockId,
  onBlockChange,
  onNext,
  onFacadeSaved,
}: ProjectPlanStudioProps) {
  const search = useSearchParams();
  const [preferredPlans, setPreferredPlans] = useState<Record<string, string>>(
    {},
  );
  const [mode, setMode] = useState(
    search.get("tab") === "facade"
      ? "facade"
      : search.get("tab") === "units"
        ? "units"
        : search.get("tab") === "plans"
          ? "plan"
          : "facade",
  );
  const selectedBlockId = project.blocks.some((block) => block.id === blockId)
    ? blockId
    : project.blocks[0]?.id;
  const [openedBlocks, setOpenedBlocks] = useState<string[]>([
    selectedBlockId ?? "",
  ]);
  if (!selectedBlockId) {
    return (
      <section className="website-form-section">
        <h2>Эхлээд блок нэмнэ үү</h2>
        <p>
          Блок нэмсний дараа энд зураг, план болон байрны мэдээллээ оруулна.
        </p>
        <Link
          className="building-primary"
          href={`/building/manage/${project.id}/edit`}
        >
          Блок нэмэх →
        </Link>
      </section>
    );
  }
  return (
    <section className="plan-studio-workspace" aria-label="Зураг, план ба байр">
      <div className="plan-studio-block-select">
        <label>
          Засварлах блок
          <select
            value={selectedBlockId}
            onChange={(event) => {
              const nextId = event.target.value;
              setOpenedBlocks((ids) =>
                ids.includes(nextId) ? ids : [...ids, nextId],
              );
              onBlockChange(nextId);
            }}
          >
            {project.blocks.map((block) => (
              <option key={block.id} value={block.id}>
                {block.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <EditorSteps steps={planSteps} current={mode} onChange={setMode} />
      <div hidden={mode !== "facade"}>
        <ProjectFacadeEditor
          key={selectedBlockId}
          project={project}
          blockId={selectedBlockId}
          onSaved={onFacadeSaved}
        />
      </div>
      <div hidden={mode !== "units"}>
        <UnitManagementPanel
          active={mode === "units"}
          preferredPlanId={preferredPlans[selectedBlockId]}
          key={selectedBlockId}
          initial={project}
          blockId={selectedBlockId}
        />
      </div>
      {project.blocks.map((block) => (
        <div
          key={block.id}
          hidden={mode !== "plan" || block.id !== selectedBlockId}
        >
          {(block.id === selectedBlockId ||
            openedBlocks.includes(block.id)) && (
            <PlanEditor
              projectId={project.id}
              blockId={block.id}
              embedded
              onNext={(planId) => {
                setPreferredPlans((current) => ({
                  ...current,
                  [block.id]: planId,
                }));
                setMode("units");
              }}
            />
          )}
        </div>
      ))}
      <div className="editor-step-actions">
        <button
          type="button"
          className="building-secondary"
          disabled={mode === "facade"}
          onClick={() => setMode(mode === "units" ? "plan" : "facade")}
        >
          ← Өмнөх
        </button>
        <small>
          Дараагийн хэсэгт орохоос өмнө өөрчлөлтөө тухайн хэсгийн хадгалах
          товчоор хадгална уу.
        </small>
        <button
          type="button"
          className="building-primary"
          onClick={() =>
            mode === "units"
              ? onNext()
              : setMode(mode === "facade" ? "plan" : "units")
          }
        >
          {mode === "facade"
            ? "Давхрын план →"
            : mode === "plan"
              ? "План дээр мэдээлэл оруулах →"
              : "Танилцуулга бэлтгэх →"}
        </button>
      </div>
    </section>
  );
}
