"use client";

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

interface ProjectPlanStudioProps {
  project: WebsiteProject;
  blockId: string;
  onBlockChange: (id: string) => void;
  onNext: () => void;
}

export function ProjectPlanStudio({
  project,
  blockId,
  onBlockChange,
  onNext,
}: ProjectPlanStudioProps) {
  const search = useSearchParams();
  const [mode, setMode] = useState(
    search.get("tab") === "units" ? "units" : "plan",
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
    <section aria-label="Зураг, план ба байр">
      <div className="website-form-section">
        <label>
          План оруулах блок
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
        <p>
          Зураг оруулж, байрны бүс бүрийн өрөө, м²-ийг бөглөөд хадгалж дараагийн
          алхамд шилжинэ.
        </p>
      </div>
      <div className="building-tabs">
        <button
          type="button"
          aria-pressed={mode === "plan"}
          className={mode === "plan" ? "active" : ""}
          onClick={() => {
            setMode("plan");
          }}
        >
          План засах
        </button>
        <button
          type="button"
          aria-pressed={mode === "units"}
          className={mode === "units" ? "active" : ""}
          onClick={() => setMode("units")}
        >
          Байрны мэдээлэл, зураг
        </button>
      </div>
      {mode === "units" && (
        <UnitManagementPanel
          key={selectedBlockId}
          initial={project}
          blockId={selectedBlockId}
        />
      )}
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
              onNext={onNext}
            />
          )}
        </div>
      ))}
    </section>
  );
}
