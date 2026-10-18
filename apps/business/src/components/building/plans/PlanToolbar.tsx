import { MousePointer2, Pentagon, Square, Undo2, Redo2 } from "lucide-react";
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
}: {
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
      <button aria-pressed={tool === "select"} onClick={() => onTool("select")}>
        <MousePointer2 size={15} />
        Сонгох / зөөх
      </button>
      <button aria-pressed={tool === "unit"} onClick={() => onTool("unit")}>
        <Square size={15} />
        Дөрвөлжин бүс
      </button>
      <button
        aria-pressed={tool === "polygon"}
        onClick={() => onTool("polygon")}
      >
        <Pentagon size={15} />
        Олон өнцөгт
      </button>
      <details className="plan-extra-tools">
        <summary>Нэмэлт хэрэгсэл</summary>
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
      <button aria-label="Буцаах" disabled={!canUndo} onClick={undo}>
        <Undo2 size={16} />
      </button>
      <button aria-label="Сэргээх" disabled={!canRedo} onClick={redo}>
        <Redo2 size={16} />
      </button>
      <button
        onClick={() =>
          onAdd(tool === "select" || tool === "polygon" ? "unit" : tool)
        }
      >
        + Төвд нэмэх
      </button>
    </div>
  );
}
