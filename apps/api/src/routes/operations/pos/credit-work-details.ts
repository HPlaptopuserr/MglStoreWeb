const fields = [
  ["workplace", "Ажлын газар", 200],
  ["department", "Хэлтэс", 120],
  ["jobTitle", "Албан тушаал", 120],
] as const;

type WorkField = (typeof fields)[number][0];

// Omitted fields preserve saved details for older POS clients; blank fields clear them.
export function parseCreditWorkDetails(input: Partial<Record<WorkField, unknown>>) {
  const result: Partial<Record<WorkField, string | null>> = {};
  for (const [field, label, maxLength] of fields) {
    const value = input[field];
    if (value === undefined) continue;
    if (value !== null && typeof value !== "string")
      throw new Error(`${label} буруу байна`);
    const text = value?.trim() || null;
    if (text && text.length > maxLength)
      throw new Error(`${label} ${maxLength} тэмдэгтээс хэтрэхгүй байна`);
    result[field] = text;
  }
  return result;
}
