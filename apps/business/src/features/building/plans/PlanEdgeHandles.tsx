import type { PlanPoint } from "./plan-model";

/** Each handle inserts a vertex in boundary order, including the closing edge. */
export function PlanEdgeHandles({ points, zoom, onInsert }: {
  points: PlanPoint[];
  zoom: number;
  onInsert: (edge: number) => void;
}) {
  if (points.length >= 50) return null;
  return <g>{points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    const x = (point.x + next.x) / 2;
    const y = (point.y + next.y) / 2;
    return <g key={index} role="button" tabIndex={0} aria-label={`${index + 1}-р ирмэгт хугарлын цэг нэмэх`}
      style={{ cursor: "copy" }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => { event.stopPropagation(); onInsert(index); }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onInsert(index); }
      }}>
      <title>Цэг нэмээд буланд нь чирнэ үү</title>
      <circle cx={x} cy={y} r={11 / zoom} fill="#082f49" stroke="#67e8f9" strokeWidth={1.5 / zoom} />
      <path d={`M${x - 4 / zoom} ${y}H${x + 4 / zoom}M${x} ${y - 4 / zoom}V${y + 4 / zoom}`} stroke="white" strokeWidth={1.5 / zoom} pointerEvents="none" />
    </g>;
  })}</g>;
}
