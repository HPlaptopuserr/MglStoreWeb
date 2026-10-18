import {
  rectPoints,
  type FloorPlan,
  type PlanShape,
  type PlanShapeKind,
} from "./plan-model";
export function createFourUnitPlan(): FloorPlan {
  const shapes: PlanShape[] = [];
  function add(
    kind: PlanShapeKind,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    unitSlot: number | null = null,
  ) {
    shapes.push({
      id: crypto.randomUUID(),
      kind,
      points: rectPoints(x, y, width, height),
      label,
      unitSlot,
    });
  }
  [
    { x: 70, y: 60 },
    { x: 550, y: 60 },
    { x: 70, y: 440 },
    { x: 550, y: 440 },
  ].forEach(({ x, y }, index) => {
    add("unit", x, y, 380, 290, `${index + 1}-р байр`, index);
    add("wall", x + 180, y + 5, 8, 180, "Тасалгааны хана");
    add("wall", x + 5, y + 180, 175, 8, "Тасалгааны хана");
    add("bed", x + 25, y + 25, 110, 130, "Ор");
    add("sofa", x + 230, y + 30, 120, 55, "Буйдан");
  });
  add("stairs", 468, 190, 60, 140, "Шат");
  add("lift", 465, 360, 70, 60, "Лифт");
  return {
    id: crypto.randomUUID(),
    name: "4 байртай давхар",
    background: null,
    shapes,
  };
}
