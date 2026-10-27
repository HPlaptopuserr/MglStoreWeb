import {
  ZoomIn,
  ZoomOut,
  Scan,
  Scaling,
  BetweenHorizontalStart,
} from "lucide-react";
import { PlanIconButton } from "./PlanIconButton";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  PLAN_HEIGHT,
  PLAN_WIDTH,
  rectPoints,
  shapeBounds,
  shapeLabels,
  type FloorPlan,
  type PlanPoint,
  type PlanShape,
  type PlanShapeKind,
} from "./plan-model";
import { PlanEdgeHandles } from "./PlanEdgeHandles";
import { PlanShapeGraphic } from "./PlanShapeGraphic";
export type PlanTool = "select" | "polygon" | PlanShapeKind;
export function PlanCanvas({
  plan,
  tool,
  selectedId,
  onSelect,
  onChange,
  unitLabels = "sequence",
}: {
  plan: FloorPlan;
  tool: PlanTool;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (shapes: PlanShape[]) => void;
  unitLabels?: "sequence" | "name";
}) {
  const [showEdges, setShowEdges] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [resizeMode, setResizeMode] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((previous) =>
        Math.max(0.25, Math.min(4, previous * Math.exp(-event.deltaY * 0.01))),
      );
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, []);
  const svg = useRef<SVGSVGElement>(null);
  const [draft, setDraft] = useState<PlanPoint[]>([]);
  const [drag, setDrag] = useState<{
    start: PlanPoint;
    shapeId: string | null;
    vertex?: number;
    resize?: string;
    dx: number;
    dy: number;
    current: PlanPoint;
  } | null>(null);
  function position(event: PointerEvent<SVGSVGElement>): PlanPoint {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
    return {
      x: Math.max(0, Math.min(PLAN_WIDTH, Math.round(point.x / 5) * 5)),
      y: Math.max(0, Math.min(PLAN_HEIGHT, Math.round(point.y / 5) * 5)),
    };
  }
  function addShape(points: PlanPoint[], kind: PlanShapeKind) {
    if (plan.shapes.length >= 200) return;
    const shape: PlanShape = {
      id: crypto.randomUUID(),
      kind,
      points,
      label: shapeLabels[kind],
      unitSlot: null,
    };
    onChange([...plan.shapes, shape]);
    onSelect(shape.id);
  }
  function start(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    const point = position(event);
    if (tool === "polygon") {
      if (draft.length < 50) setDraft([...draft, point]);
      return;
    }
    const target =
      event.target instanceof Element
        ? event.target.closest("[data-shape-id]")
        : null;
    const shapeId = target?.getAttribute("data-shape-id") ?? null;
    if (tool === "select") {
      onSelect(shapeId);
      if (!shapeId) return;
      if (target instanceof SVGElement) target.focus({ preventScroll: true });
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      start: point,
      current: point,
      shapeId: tool === "select" ? shapeId : null,
      resize:
        event.target instanceof Element
          ? (event.target.getAttribute("data-resize") ?? undefined)
          : undefined,
      vertex:
        event.target instanceof Element &&
        event.target.hasAttribute("data-vertex")
          ? Number(event.target.getAttribute("data-vertex"))
          : undefined,
      dx: 0,
      dy: 0,
    });
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const point = position(event);
    let dx = point.x - drag.start.x,
      dy = point.y - drag.start.y;
    const shape = plan.shapes.find((item) => item.id === drag.shapeId);
    if (shape && drag.vertex === undefined && !drag.resize) {
      const b = shapeBounds(shape);
      dx = Math.max(-b.x, Math.min(PLAN_WIDTH - b.x - b.width, dx));
      dy = Math.max(-b.y, Math.min(PLAN_HEIGHT - b.y - b.height, dy));
    }
    setDrag({ ...drag, current: point, dx, dy });
  }
  function resized(shape: PlanShape): PlanShape {
    if (!drag?.resize) return shape;
    const b = shapeBounds(shape);
    const width = drag.resize.includes("e")
      ? Math.max(5, Math.min(PLAN_WIDTH - b.x, b.width + drag.dx))
      : b.width;
    const height = drag.resize.includes("s")
      ? Math.max(5, Math.min(PLAN_HEIGHT - b.y, b.height + drag.dy))
      : b.height;
    return {
      ...shape,
      points: shape.points.map((p) => ({
        x: b.x + ((p.x - b.x) * width) / b.width,
        y: b.y + ((p.y - b.y) * height) / b.height,
      })),
    };
  }
  function finish() {
    if (!drag) return;
    if (drag.shapeId) {
      if (drag.dx || drag.dy)
        onChange(
          plan.shapes.map((shape) =>
            shape.id === drag.shapeId
              ? drag.resize
                ? resized(shape)
                : {
                    ...shape,
                    points: shape.points.map((point, index) =>
                      drag.vertex === undefined
                        ? {
                            x: point.x + drag.dx,
                            y: point.y + drag.dy,
                          }
                        : index === drag.vertex
                          ? drag.current
                          : point,
                    ),
                  }
              : shape,
          ),
        );
    } else if (tool !== "select" && tool !== "polygon") {
      const width = Math.abs(drag.current.x - drag.start.x),
        height = Math.abs(drag.current.y - drag.start.y);
      if (width >= 5 && height >= 5)
        addShape(
          rectPoints(
            Math.min(drag.start.x, drag.current.x),
            Math.min(drag.start.y, drag.current.y),
            width,
            height,
          ),
          tool,
        );
    }
    setDrag(null);
  }
  return (
    <div className="plan-editor-canvas-wrap">
      <div className="plan-toolbar">
        <PlanIconButton
          label="Жижигрүүлэх"
          onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
          disabled={zoom <= 0.25}
        >
          <ZoomOut size={18} aria-hidden="true" />
        </PlanIconButton>
        <span>{Math.round(zoom * 100)}%</span>
        <PlanIconButton
          label="Томруулах"
          onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
          disabled={zoom === 4}
        >
          <ZoomIn size={18} aria-hidden="true" />
        </PlanIconButton>
        <PlanIconButton label="Багтаах" onClick={() => setZoom(1)}>
          <Scan size={18} aria-hidden="true" />
        </PlanIconButton>
      </div>
      {
        <div className="plan-toolbar" style={{ minHeight: 48 }}>
          <PlanIconButton
            label="Бүхэл хүрээний хэмжээ"
            disabled={tool !== "select" || !selectedId}
            aria-pressed={resizeMode}
            onClick={() => setResizeMode((value) => !value)}
          >
            <Scaling size={18} aria-hidden="true" />
          </PlanIconButton>
          <PlanIconButton
            label="Хугарлын цэг нэмэх"
            disabled={tool !== "select" || !selectedId}
            aria-pressed={showEdges}
            onClick={() => setShowEdges((value) => !value)}
          >
            <BetweenHorizontalStart size={18} aria-hidden="true" />
          </PlanIconButton>
          <span>
            {showEdges
              ? "Ирмэгийн + дээр дараад шинэ цэгийг буланд чирнэ үү. 50 хүртэл цэг."
              : "Хүрээний цагаан цэгийг чирж засна."}
          </span>
        </div>
      }
      <div
        ref={viewport}
        className="plan-canvas-viewport"
        style={{ overflow: "auto", maxHeight: "75vh" }}
      >
        <div style={{ width: `${zoom * 100}%` }}>
          <svg
            ref={svg}
            className={`plan-editor-canvas ${tool !== "select" ? "drawing" : ""}`}
            viewBox={`0 0 ${PLAN_WIDTH} ${PLAN_HEIGHT}`}
            role="group"
            aria-label="План зурах талбар"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={finish}
            onPointerCancel={() => setDrag(null)}
          >
            <defs>
              <pattern
                id="editor-grid"
                width="25"
                height="25"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M25 0H0V25"
                  fill="none"
                  stroke="#ffffff0b"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width={PLAN_WIDTH} height={PLAN_HEIGHT} fill="#152334" />
            {plan.background && (
              <image
                href={plan.background}
                width={PLAN_WIDTH}
                height={PLAN_HEIGHT}
                preserveAspectRatio="xMidYMid meet"
                pointerEvents="none"
              />
            )}
            <rect
              width={PLAN_WIDTH}
              height={PLAN_HEIGHT}
              fill="url(#editor-grid)"
              pointerEvents="none"
            />
            {[
              ...plan.shapes.filter((shape) => shape.id !== selectedId),
              ...plan.shapes.filter((shape) => shape.id === selectedId),
            ].map((shape) => {
              const b = shapeBounds(
                drag?.shapeId === shape.id && drag.resize
                  ? resized(shape)
                  : shape,
              );
              return (
                <g
                  key={shape.id}
                  data-shape-id={shape.id}
                  className="editor-shape"
                  transform={
                    drag?.shapeId === shape.id &&
                    drag.vertex === undefined &&
                    !drag.resize
                      ? `translate(${drag.dx} ${drag.dy})`
                      : undefined
                  }
                  tabIndex={tool === "select" ? 0 : undefined}
                  role="button"
                  aria-label={`${shape.label} сонгох`}
                  aria-pressed={selectedId === shape.id}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      onSelect(shape.id);
                      event.preventDefault();
                    }
                    if (
                      tool === "select" &&
                      [
                        "ArrowLeft",
                        "ArrowRight",
                        "ArrowUp",
                        "ArrowDown",
                      ].includes(event.key)
                    ) {
                      event.preventDefault();
                      const dx =
                          event.key === "ArrowLeft"
                            ? -5
                            : event.key === "ArrowRight"
                              ? 5
                              : 0,
                        dy =
                          event.key === "ArrowUp"
                            ? -5
                            : event.key === "ArrowDown"
                              ? 5
                              : 0;
                      if (
                        b.x + dx >= 0 &&
                        b.y + dy >= 0 &&
                        b.x + b.width + dx <= PLAN_WIDTH &&
                        b.y + b.height + dy <= PLAN_HEIGHT
                      )
                        onChange(
                          plan.shapes.map((item) =>
                            item.id === shape.id
                              ? {
                                  ...item,
                                  points: item.points.map((point) => ({
                                    x: point.x + dx,
                                    y: point.y + dy,
                                  })),
                                }
                              : item,
                          ),
                        );
                    }
                  }}
                >
                  <PlanShapeGraphic
                    shape={
                      drag?.shapeId === shape.id && drag.resize
                        ? resized(shape)
                        : drag?.shapeId === shape.id &&
                            drag.vertex !== undefined
                          ? {
                              ...shape,
                              points: shape.points.map((point, index) =>
                                index === drag.vertex ? drag.current : point,
                              ),
                            }
                          : shape
                    }
                  />
                  {selectedId === shape.id &&
                    tool === "select" &&
                    !resizeMode &&
                    shape.points.map((point, index) => (
                      <circle
                        key={index}
                        data-vertex={index}
                        cx={
                          drag?.shapeId === shape.id && drag.vertex === index
                            ? drag.current.x
                            : point.x
                        }
                        cy={
                          drag?.shapeId === shape.id && drag.vertex === index
                            ? drag.current.y
                            : point.y
                        }
                        r={4 / zoom}
                        fill="white"
                        stroke="#20c4bc"
                        strokeWidth={1 / zoom}
                        style={{ cursor: "crosshair" }}
                      />
                    ))}
                  {selectedId === shape.id &&
                    tool === "select" &&
                    showEdges &&
                    !resizeMode &&
                    !drag && (
                      <PlanEdgeHandles
                        points={shape.points}
                        zoom={zoom}
                        onInsert={(edge) => {
                          if (shape.points.length >= 50) return;
                          const a = shape.points[edge],
                            b = shape.points[(edge + 1) % shape.points.length];
                          const points = [...shape.points];
                          points.splice(edge + 1, 0, {
                            x: (a.x + b.x) / 2,
                            y: (a.y + b.y) / 2,
                          });
                          onChange(
                            plan.shapes.map((item) =>
                              item.id === shape.id ? { ...item, points } : item,
                            ),
                          );
                        }}
                      />
                    )}
                  {selectedId === shape.id &&
                    tool === "select" &&
                    resizeMode &&
                    [
                      {
                        id: "e",
                        x: b.x + b.width,
                        y: b.y + b.height / 2,
                        cursor: "ew-resize",
                      },
                      {
                        id: "s",
                        x: b.x + b.width / 2,
                        y: b.y + b.height,
                        cursor: "ns-resize",
                      },
                      {
                        id: "se",
                        x: b.x + b.width,
                        y: b.y + b.height,
                        cursor: "nwse-resize",
                      },
                    ].map((handle) => (
                      <rect
                        key={handle.id}
                        data-resize={handle.id}
                        x={handle.x - 8 / zoom}
                        y={handle.y - 8 / zoom}
                        width={16 / zoom}
                        height={16 / zoom}
                        fill="#fff"
                        stroke="#20c4bc"
                        strokeWidth={1 / zoom}
                        style={{ cursor: handle.cursor }}
                      >
                        <title>Бүх хүрээний хэмжээг чирж өөрчлөх</title>
                      </rect>
                    ))}
                  {shape.kind === "unit" && (
                    <text
                      pointerEvents="none"
                      x={b.x + b.width / 2}
                      y={b.y + b.height / 2}
                      textAnchor="middle"
                      fill="white"
                      fontSize={unitLabels === "name" ? 13 : 9}
                    >
                      {unitLabels === "name"
                        ? shape.label
                        : `${plan.shapes.filter((item) => item.kind === "unit").findIndex((item) => item.id === shape.id) + 1}${selectedId === shape.id ? ` · ${shape.label}` : ""}`}
                    </text>
                  )}
                  {selectedId === shape.id && (
                    <rect
                      x={b.x - 3}
                      y={b.y - 3}
                      width={b.width + 6}
                      height={b.height + 6}
                      fill="none"
                      stroke="#efb85e"
                      strokeWidth="2"
                      strokeDasharray="8 4"
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            })}
            {draft.length > 0 && (
              <polyline
                points={draft.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="#d5ad5730"
                stroke="#e2b768"
                strokeWidth="3"
                pointerEvents="none"
              />
            )}
            {drag && !drag.shapeId && (
              <rect
                x={Math.min(drag.start.x, drag.current.x)}
                y={Math.min(drag.start.y, drag.current.y)}
                width={Math.abs(drag.current.x - drag.start.x)}
                height={Math.abs(drag.current.y - drag.start.y)}
                fill="#e2b76830"
                stroke="#e2b768"
                strokeDasharray="8 4"
                pointerEvents="none"
              />
            )}
          </svg>
        </div>
      </div>
      {tool === "polygon" && (
        <div className="plan-polygon-actions">
          <span>{draft.length} цэг · Хамгийн багадаа 3 цэг</span>
          <button
            disabled={draft.length < 3}
            onClick={() => {
              const area = Math.abs(
                draft.reduce((sum, p, i) => {
                  const next = draft[(i + 1) % draft.length];
                  return sum + p.x * next.y - next.x * p.y;
                }, 0) / 2,
              );
              if (area >= 25) {
                addShape(draft, "unit");
                setDraft([]);
              }
            }}
          >
            Бүсийг дуусгах
          </button>
          <button onClick={() => setDraft([])}>Цуцлах</button>
        </div>
      )}
      <p>
        Touchpad-аар чимхэж томруулна · Хоёр хуруугаар гүйлгэнэ · Томруулсан үед
        гүйлгэж зөөнө · 5 нэгжийн торонд таарна · Сонгосон объектыг сумтай
        товчоор хөдөлгөнө
      </p>
    </div>
  );
}
