export interface BuildingFacadeRegion {
  id: string;
  floor: number;
  unitNo: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface BuildingFacade {
  floorRegions?: Omit<BuildingFacadeRegion, "unitNo">[];
  image: string;
  regions: BuildingFacadeRegion[];
}
export function parseBuildingFacade(value: unknown): BuildingFacade {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Барилгын зургийн мэдээлэл буруу байна.");
  const p = value as Record<string, unknown>;
  if (
    typeof p.image !== "string" ||
    p.image.length > 3_000_000 ||
    !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(p.image)
  )
    throw new Error("Барилгын PNG/JPG/WebP зураг шаардлагатай.");
  if (!Array.isArray(p.regions) || p.regions.length > 2000)
    throw new Error("Зураг дээр 2000 хүртэл байр тэмдэглэнэ.");
  const keys = new Set<string>(),
    ids = new Set<string>();
  const regions = p.regions.map((value: unknown) => {
    if (!value || typeof value !== "object")
      throw new Error("Байрны хүрээ буруу байна.");
    const r = value as Record<string, unknown>;
    if (
      typeof r.id !== "string" ||
      !r.id ||
      r.id.length > 100 ||
      ids.has(r.id) ||
      typeof r.floor !== "number" ||
      !Number.isInteger(r.floor) ||
      r.floor < -10 ||
      r.floor > 200 ||
      typeof r.unitNo !== "string" ||
      !r.unitNo.trim() ||
      r.unitNo.length > 30
    )
      throw new Error("Байрны холбоос буруу байна.");
    const key = `${r.floor}:${r.unitNo}`;
    if (keys.has(key)) throw new Error("Байрны хүрээ давхардсан байна.");
    keys.add(key);
    ids.add(r.id);
    const nums = [r.x, r.y, r.width, r.height];
    if (nums.some((n) => typeof n !== "number" || !Number.isFinite(n)))
      throw new Error("Хүрээний хэмжээ буруу байна.");
    const [x, y, width, height] = nums as number[];
    if (
      x < 0 ||
      y < 0 ||
      width < 2 ||
      height < 2 ||
      x + width > 1000.001 ||
      y + height > 800.001
    )
      throw new Error("Хүрээ зурагнаас хэтэрсэн байна.");
    return { id: r.id, floor: r.floor, unitNo: r.unitNo, x, y, width, height };
  });
  let floorRegions: Omit<BuildingFacadeRegion, "unitNo">[] | undefined;
  if (p.floorRegions !== undefined) {
    if (!Array.isArray(p.floorRegions) || p.floorRegions.length > 100)
      throw new Error("100 хүртэл давхар тэмдэглэнэ.");
    const parsed = parseBuildingFacade({ image: p.image, regions: p.floorRegions.map((item: unknown) => {
      if (!item || typeof item !== "object") throw new Error("Давхрын хүрээ буруу байна.");
      return { ...item, unitNo: "floor" };
    }) });
    floorRegions = parsed.regions.map(({ id, floor, x, y, width, height }) => ({ id, floor, x, y, width, height }));
  }
  return { image: p.image, regions, ...(floorRegions ? { floorRegions } : {}) };
}
