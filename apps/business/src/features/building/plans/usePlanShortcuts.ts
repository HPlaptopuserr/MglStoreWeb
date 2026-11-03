import { useRef, type KeyboardEvent } from "react";
import { PLAN_WIDTH, PLAN_HEIGHT, shapeBounds, type PlanShape } from "./plan-model";

export function usePlanShortcuts({ shapes, selectedId, onChange, onSelect, undo, redo, save, busy }: {
  shapes: PlanShape[];
  selectedId: string | null;
  onChange: (shapes: PlanShape[]) => void;
  onSelect: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  save: () => void;
  busy: boolean;
}) {
  const clipboard = useRef<PlanShape | null>(null);
  function paste(shape: PlanShape) {
    if (shapes.length >= 200) return;
    const bounds = shapeBounds(shape);
    const dx = Math.min(15, PLAN_WIDTH - bounds.x - bounds.width);
    const dy = Math.min(15, PLAN_HEIGHT - bounds.y - bounds.height);
    const copy: PlanShape = { ...shape, id: crypto.randomUUID(), unitSlot: null,
      points: shape.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) };
    onChange([...shapes, copy]);
    onSelect(copy.id);
    clipboard.current = structuredClone(copy);
  }
  return function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.nativeEvent.isComposing || event.altKey || busy) return;
    const target = event.target;
    if (target instanceof Element && target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]')) return;
    const key = event.key.toLowerCase();
    const modifier = event.ctrlKey || event.metaKey;
    const selected = shapes.find((shape) => shape.id === selectedId);
    let action: (() => void) | undefined;
    if (modifier) {
      if (key === "c" && selected) action = () => { clipboard.current = structuredClone(selected); };
      if (key === "x" && selected) action = () => { clipboard.current = structuredClone(selected); onChange(shapes.filter((shape) => shape.id !== selected.id)); onSelect(null); };
      if (key === "v" && clipboard.current) action = () => { if (clipboard.current) paste(clipboard.current); };
      if (key === "d" && selected) action = () => paste(selected);
      if (key === "z") action = event.shiftKey ? redo : undo;
      if (key === "y") action = redo;
      if (key === "s") action = save;
    } else if ((key === "delete" || key === "backspace") && selected) {
      action = () => { onChange(shapes.filter((shape) => shape.id !== selected.id)); onSelect(null); };
    } else if (key === "escape") action = () => onSelect(null);
    if (action) { event.preventDefault(); event.stopPropagation(); if (!event.repeat) action(); }
  };
}
