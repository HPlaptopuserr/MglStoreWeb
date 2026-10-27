import { PlanUnitDetails } from "./PlanUnitDetails";
import {
  PLAN_HEIGHT,
  PLAN_WIDTH,
  shapeBounds,
  type FloorPlan,
  type PlanShape,
} from "./plan-model";
export function PlanInspector({
  plan,
  onError,
  selectedId,
  onChange,
  onSelect,
  onOpenUnits,
  onOpenDetails,
}: {
  onOpenUnits: () => void;
  onOpenDetails?: () => void;
  plan: FloorPlan;
  onError: (message: string) => void;
  selectedId: string | null;
  onChange: (shapes: PlanShape[]) => void;
  onSelect: (id: string | null) => void;
}) {
  const shape = plan.shapes.find((value) => value.id === selectedId);
  if (!shape)
    return (
      <aside className="plan-inspector">
        <h2>Объектын тохиргоо</h2>
        <p>План дээрх байр, хана эсвэл тавилгаа сонгоод засна уу.</p>
      </aside>
    );
  const bounds = shapeBounds(shape);
  function update(value: Partial<PlanShape>) {
    onChange(
      plan.shapes.map((item) =>
        item.id === shape?.id ? { ...item, ...value } : item,
      ),
    );
  }
  function resize(key: "x" | "y" | "width" | "height", value: number) {
    if (!Number.isFinite(value) || !shape) return;
    const next = { ...bounds, [key]: value };
    if (
      next.x < 0 ||
      next.y < 0 ||
      next.width < 5 ||
      next.height < 5 ||
      next.x + next.width > PLAN_WIDTH ||
      next.y + next.height > PLAN_HEIGHT
    )
      return;
    update({
      points: shape.points.map((point) => ({
        x: next.x + ((point.x - bounds.x) * next.width) / bounds.width,
        y: next.y + ((point.y - bounds.y) * next.height) / bounds.height,
      })),
    });
  }
  return (
    <aside className="plan-inspector">
      <h2>Объектын тохиргоо</h2>
      <label>
        Нэр / тайлбар
        <input
          value={shape.label}
          maxLength={100}
          onChange={(event) => update({ label: event.target.value })}
        />
      </label>
      {shape.kind === "unit" && (
        <>
          <PlanUnitDetails shape={shape} shapes={plan.shapes} onChange={update} />
          <button type="button" onClick={onOpenDetails ?? onOpenUnits}>
            Сонгосон байрны зураг тохируулах →
          </button>
          <button type="button" onClick={onOpenUnits}>
            Бүх байрны мэдээллийн хүснэгт
          </button>
        </>
      )}
      <button
        className="plan-save"
        onClick={() => {
          onError("");
          onSelect(null);
        }}
      >
        ✓ Байрны хүрээг дуусгах
      </button>
      <div className="plan-dimensions">
        {(["x", "y", "width", "height"] as const).map((key) => (
          <label key={key}>
            {
              {
                x: "X байрлал",
                y: "Y байрлал",
                width: "Өргөн",
                height: "Өндөр",
              }[key]
            }
            <input
              type="number"
              value={Math.round(bounds[key])}
              min={key === "x" || key === "y" ? 0 : 5}
              max={key === "x" || key === "width" ? PLAN_WIDTH : PLAN_HEIGHT}
              onChange={(event) => resize(key, Number(event.target.value))}
            />
          </label>
        ))}
      </div>
      <details>
        <summary>Хүрээний цэгүүдийг засах</summary>
        {shape.points.map((point, index) => (
          <div className="plan-dimensions" key={index}>
            {(["x", "y"] as const).map((axis) => (
              <label key={axis}>
                {index + 1} · {axis.toUpperCase()}
                <input
                  type="number"
                  min={0}
                  max={axis === "x" ? PLAN_WIDTH : PLAN_HEIGHT}
                  value={Math.round(point[axis])}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (
                      !Number.isFinite(value) ||
                      value < 0 ||
                      value > (axis === "x" ? PLAN_WIDTH : PLAN_HEIGHT)
                    )
                      return;
                    update({
                      points: shape.points.map((p, i) =>
                        i === index ? { ...p, [axis]: value } : p,
                      ),
                    });
                  }}
                />
              </label>
            ))}
          </div>
        ))}
      </details>
      <p>Хэмжээс нь зургийн координат. Байрны бодит м² талбай өөрчлөгдөхгүй.</p>
      <button
        onClick={() => {
          const clone = {
            ...shape,
            id: crypto.randomUUID(),
            unitSlot: null,
            points: shape.points.map((p) => ({ ...p })),
          };
          if (plan.shapes.length < 200) {
            onChange([...plan.shapes, clone]);
            onSelect(clone.id);
          }
        }}
      >
        Объект хувилах
      </button>
      <button
        onClick={() => {
          onChange([
            ...plan.shapes.filter((item) => item.id !== shape.id),
            shape,
          ]);
        }}
      >
        Урд талд гаргах
      </button>
      <button
        className="plan-danger"
        onClick={() => {
          onChange(plan.shapes.filter((item) => item.id !== shape.id));
          onSelect(null);
        }}
      >
        Объект устгах
      </button>
    </aside>
  );
}
