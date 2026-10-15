export const communityFields = [
  { id: "name", label: "Овог, нэр", required: true },
  { id: "profession", label: "Мэргэжил", required: true },
  { id: "phone", label: "Утасны дугаар", required: true },
  { id: "business", label: "Бизнес эрхэлдэг эсэх", required: true },
  { id: "businessName", label: "Бизнес / байгууллагын нэр", required: false },
  { id: "industry", label: "Бизнесийн чиглэл", required: false },
  { id: "notes", label: "Нэмэлт мэдээлэл", required: false },
  { id: "consent", label: "Мэдээлэл ашиглах зөвшөөрөл", required: true },
].map((field) => ({ ...field, type: "text" }));

export function parseCommunityResponse(
  input: unknown,
): Record<string, string> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const source = input as Record<string, unknown>;
  const data: Record<string, string> = {};
  for (const field of communityFields) {
    const value = source[field.id];
    if (value !== undefined && typeof value !== "string") return null;
    data[field.id] = typeof value === "string" ? value.trim() : "";
    if (data[field.id].length > (field.id === "notes" ? 1000 : 160))
      return null;
    if (field.required && !data[field.id]) return null;
  }
  if (!/^[0-9]{8}$/.test(data.phone) || data.consent !== "yes") return null;
  if (!["yes", "no", "planning"].includes(data.business)) return null;
  if (data.business === "yes" && !data.industry) return null;
  if (data.business !== "yes") {
    data.businessName = "";
    data.industry = "";
  }
  return data;
}
