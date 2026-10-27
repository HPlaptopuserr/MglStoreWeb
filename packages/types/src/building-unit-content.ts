export interface UnitRoomInterior {
  name: string;
  description: string;
  image: string;
}
/** Registered room counts take priority; legacy labels may explicitly contain the count. */
export function unitRoomCount(
  rooms: number | null | undefined,
  label: string,
): number | null {
  const count = rooms ?? Number(label.match(/(\d+)\s*өрөө/i)?.[1]);
  return Number.isInteger(count) && count >= 1 && count <= 20 ? count : null;
}
export interface BuildingUnitContent {
  description: string;
  layout2d: string;
  layout3d: string;
  gallery: string[];
  roomInteriors?: UnitRoomInterior[];
  paymentTerms: string;
  useProjectPrice: boolean;
}
export const emptyUnitContent = (): BuildingUnitContent => ({
  description: "",
  layout2d: "",
  layout3d: "",
  gallery: [],
  paymentTerms: "",
  useProjectPrice: true,
});
export const regionBindingKey = (
  floorId: string,
  planId: string,
  shapeId: string,
) => `${floorId}:${planId}:${shapeId}`;
export function parseUnitContent(value: unknown): BuildingUnitContent {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Байрны мэдээлэл буруу байна.");
  const raw = value as Record<string, unknown>;
  const readText = (key: string, max: number) => {
    const text = raw[key] ?? "";
    if (typeof text !== "string" || text.length > max)
      throw new Error("Байрны мэдээллийн хэмжээ буруу байна.");
    return text.trim();
  };
  const image = (value: unknown): string => {
    if (value === "") return "";
    if (
      typeof value !== "string" ||
      !/^\/api\/building\/projects\/[a-zA-Z0-9-]+\/media\/[a-f0-9-]+\.webp$/.test(
        value,
      )
    )
      throw new Error("Байрны зургийг дахин оруулна уу.");
    return value;
  };
  if (
    raw.useProjectPrice !== undefined &&
    typeof raw.useProjectPrice !== "boolean"
  )
    throw new Error("Үнийн тохиргоо буруу байна.");
  const gallery = raw.gallery ?? [];
  if (!Array.isArray(gallery) || gallery.length > 8)
    throw new Error("8 хүртэл нэмэлт зураг оруулна.");
  const roomInteriors = raw.roomInteriors;
  if (
    roomInteriors !== undefined &&
    (!Array.isArray(roomInteriors) || roomInteriors.length > 20)
  )
    throw new Error("20 хүртэл өрөөний мэдээлэл оруулна.");
  const parsedRooms = (roomInteriors as unknown[] | undefined)?.map(
    (value): UnitRoomInterior => {
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("Өрөөний мэдээлэл буруу байна.");
      const room = value as Record<string, unknown>;
      if (
        typeof room.name !== "string" ||
        room.name.length > 100 ||
        typeof room.description !== "string" ||
        room.description.length > 1000
      )
        throw new Error("Өрөөний нэр, тайлбарын хэмжээ буруу байна.");
      return {
        name: room.name.trim(),
        description: room.description.trim(),
        image: image(room.image ?? ""),
      };
    },
  );
  return {
    ...(parsedRooms ? { roomInteriors: parsedRooms } : {}),
    description: readText("description", 5000),
    paymentTerms: readText("paymentTerms", 3000),
    layout2d: image(raw.layout2d ?? ""),
    layout3d: image(raw.layout3d ?? ""),
    gallery: gallery.map(image).filter(Boolean),
    useProjectPrice: raw.useProjectPrice !== false,
  };
}
