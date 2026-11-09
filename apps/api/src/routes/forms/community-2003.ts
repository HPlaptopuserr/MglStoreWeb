import { isCommunityPhotoUrl } from "./community-2003-photo";
export const communityFields = [
  { id: "name", label: "Овог, нэр", required: true },
  { id: "photoUrl", label: "Танилцуулгын зураг", required: false },
  { id: "profession", label: "Мэргэжил", required: true },
  { id: "city", label: "Хот, байршил", required: false },
  {
    id: "publishConsent",
    label: "Танилцуулга нийтлэх зөвшөөрөл",
    required: false,
  },
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
    if (
      data[field.id].length >
      (field.id === "notes" ? 1000 : field.id === "photoUrl" ? 2048 : 160)
    )
      return null;
    if (field.required && !data[field.id]) return null;
  }
  if (data.photoUrl && !isCommunityPhotoUrl(data.photoUrl)) return null;
  if (!/^[0-9]{8}$/.test(data.phone) || data.consent !== "yes") return null;
  if (data.publishConsent && data.publishConsent !== "yes") return null;
  if (!["yes", "no", "planning"].includes(data.business)) return null;
  if (data.business === "yes" && !data.industry) return null;
  if (data.business !== "yes") {
    data.businessName = "";
    data.industry = "";
  }
  return data;
}

// Only expose the explicitly consented profile fields, never the raw response.
export function toPublicCommunityMember(id: string, input: unknown) {
  const data = parseCommunityResponse(input);
  if (!data || data.publishConsent !== "yes") return null;
  const activity: "business" | "planning" | "employed" =
    data.business === "yes"
      ? "business"
      : data.business === "planning"
        ? "planning"
        : "employed";
  return {
    id,
    activity,
    name: data.name,
    phone: data.phone,
    ...(data.photoUrl ? { photoUrl: data.photoUrl } : {}),
    city: data.city,
    profession: data.profession,
    role: data.profession,
    organization: data.businessName,
    sector: data.industry || data.profession,
    bio: data.notes,
    offers: [],
    needs: [],
  };
}
