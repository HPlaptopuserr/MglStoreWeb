import { PlanIconButton } from "./PlanIconButton";
import {
  MousePointer2,
  Plus,
  Wrench,
  Pentagon,
  Square,
  Undo2,
  Redo2,
  FlipHorizontal2,
  FlipVertical2,
} from "lucide-react";
import type { PlanTool } from "./PlanCanvas";
import { shapeLabels, type PlanShapeKind } from "./plan-model";
export function PlanToolbar({
  tool,
  onTool,
  canUndo,
  canRedo,
  undo,
  redo,
  onAdd,
  canMirror,
  onMirror,
}: {
  canMirror: boolean;
  onMirror: (axis: "horizontal" | "vertical") => void;
  tool: PlanTool;
  onTool: (tool: PlanTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  onAdd: (kind: PlanShapeKind) => void;
}) {
  return (
    <div className="plan-toolbar" aria-label="Зурах хэрэгслүүд">
      <PlanIconButton
        label="Сонгох / зөөх"
        aria-pressed={tool === "select"}
        onClick={() => onTool("select")}
      >
        <MousePointer2 size={15} />
      </PlanIconButton>
      <PlanIconButton
        label="Дөрвөлжин бүс"
        aria-pressed={tool === "unit"}
        onClick={() => onTool("unit")}
      >
        <Square size={15} />
      </PlanIconButton>
      <PlanIconButton
        label="Олон өнцөгт"
        aria-pressed={tool === "polygon"}
        onClick={() => onTool("polygon")}
      >
        <Pentagon size={15} />
      </PlanIconButton>
      <details className="plan-extra-tools">
        <summary title="Нэмэлт хэрэгсэл" aria-label="Нэмэлт хэрэгсэл">
          <Wrench size={18} aria-hidden="true" />
        </summary>
        <div>
          {" "}
          {(["wall", "bed", "sofa", "stairs", "lift", "label"] as const).map(
            (kind) => (
              <button
                key={kind}
                aria-pressed={tool === kind}
                onClick={() => onTool(kind)}
              >
                {shapeLabels[kind]}
              </button>
            ),
          )}
        </div>
      </details>
      <PlanIconButton
        label="Зүүн–баруун толин тусгал"
        aria-label="Зүүн–баруун толин тусгал"
        disabled={!canMirror}
        onClick={() => onMirror("horizontal")}
      >
        <FlipHorizontal2 size={18} aria-hidden="true" />
      </PlanIconButton>
      <PlanIconButton
        label="Дээш–доош толин тусгал"
        aria-label="Дээш–доош толин тусгал"
        disabled={!canMirror}
        onClick={() => onMirror("vertical")}
      >
        <FlipVertical2 size={18} aria-hidden="true" />
      </PlanIconButton>
      <PlanIconButton label="Буцаах" disabled={!canUndo} onClick={undo}>
        <Undo2 size={16} />
      </PlanIconButton>
      <PlanIconButton label="Сэргээх" disabled={!canRedo} onClick={redo}>
        <Redo2 size={16} />
      </PlanIconButton>
      <PlanIconButton
        label="Төвд нэмэх"
        onClick={() =>
          onAdd(tool === "select" || tool === "polygon" ? "unit" : tool)
        }
      >
        <Plus size={18} aria-hidden="true" />
      </PlanIconButton>
    </div>
  );
}
