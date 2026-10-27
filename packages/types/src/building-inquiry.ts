export interface BuildingInquiryInput {
  id: string;
  unitId: string;
  name: string;
  phone: string;
  question: string;
}
export interface BuildingInquiryRecord extends BuildingInquiryInput {
  projectId: string;
  blockName: string;
  floorNumber: number;
  unitNo: string;
  unitLabel: string;
  createdAt: string;
  project: { title: string };
}
export function parseBuildingInquiry(value: unknown): BuildingInquiryInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Хүсэлтийн мэдээлэл буруу байна.");
  const input = value as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const phone =
    typeof input.phone === "string" ? input.phone.replace(/[\s()-]/g, "") : "";
  const question =
    typeof input.question === "string" ? input.question.trim() : "";
  if (name.length < 2 || name.length > 100)
    throw new Error("Нэрээ 2–100 тэмдэгтээр оруулна уу.");
  if (!/^(?:\+976)?[0-9]{8}$/.test(phone))
    throw new Error("8 оронтой утасны дугаараа оруулна уу.");
  if (question.length > 2000)
    throw new Error("Асуултаа 2000 хүртэл тэмдэгтээр бичнэ үү.");
  if (
    typeof input.id !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      input.id,
    )
  )
    throw new Error("Хүсэлтийн дугаар буруу байна.");
  if (
    typeof input.unitId !== "string" ||
    !input.unitId ||
    input.unitId.length > 100
  )
    throw new Error("Байраа дахин сонгоно уу.");
  return { id: input.id, unitId: input.unitId, name, phone, question };
}
