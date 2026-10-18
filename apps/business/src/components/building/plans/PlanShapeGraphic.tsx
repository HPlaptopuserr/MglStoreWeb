import { shapeBounds, type PlanShape } from "./plan-model";
export function PlanShapeGraphic({ shape }: { shape: PlanShape }) {
  const { x, y, width, height } = shapeBounds(shape);
  if (shape.kind === "unit")
    return (
      <polygon
        points={shape.points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="#b6d9c340"
        stroke="#5a9570"
        strokeWidth="3"
      />
    );
  if (shape.kind === "wall")
    return (
      <polygon
        points={shape.points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="#e5dfd1"
        stroke="#aca793"
        strokeWidth="2"
      />
    );
  if (shape.kind === "label")
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontSize="18"
      >
        {shape.label}
      </text>
    );
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={shape.kind === "bed" || shape.kind === "sofa" ? 5 : 1}
        fill={
          shape.kind === "sofa"
            ? "#7b9f94"
            : shape.kind === "lift"
              ? "#54646c"
              : "#d4c9b3"
        }
        stroke="#a6a99b"
        strokeWidth="3"
      />
      {shape.kind === "bed" && (
        <>
          <rect
            x={x + width * 0.08}
            y={y + height * 0.08}
            width={width * 0.36}
            height={height * 0.18}
            rx="4"
            fill="#f5f0df"
          />
          <rect
            x={x + width * 0.54}
            y={y + height * 0.08}
            width={width * 0.36}
            height={height * 0.18}
            rx="4"
            fill="#f5f0df"
          />
          <rect
            x={x + width * 0.06}
            y={y + height * 0.65}
            width={width * 0.88}
            height={height * 0.2}
            fill="#7b978c"
          />
        </>
      )}
      {shape.kind === "stairs" &&
        Array.from({ length: 8 }, (_, i) => (
          <path
            key={i}
            d={`M${x} ${y + (height * (i + 1)) / 9}H${x + width}`}
            stroke="#f0eadc"
            strokeWidth="3"
          />
        ))}
      {shape.kind === "lift" && (
        <path
          d={`M${x + width / 2} ${y}V${y + height}`}
          stroke="#c5d0c7"
          strokeWidth="3"
        />
      )}
      {shape.kind === "sofa" && (
        <rect
          x={x + width * 0.1}
          y={y + height * 0.18}
          width={width * 0.8}
          height={height * 0.6}
          rx="5"
          fill="#9cbbb1"
        />
      )}
    </g>
  );
}
