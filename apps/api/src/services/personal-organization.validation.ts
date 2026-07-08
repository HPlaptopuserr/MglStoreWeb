export const MONGOLIAN_ORGANIZATION_NAME_ERROR =
  "Байгууллагын нэрийг монгол кирилл үсгээр бичнэ үү.";

export const DUPLICATE_ORGANIZATION_NAME_ERROR =
  "Энэ нэртэй байгууллага аль хэдийн бүртгэлтэй байна.";

export const BUSINESS_CATEGORY_ERROR =
  "Үйл ажиллагааны чиглэлээ тодорхой оруулна уу.";

const MONGOLIAN_ORGANIZATION_NAME_PATTERN =
  /^[А-Яа-яЁёӨөҮү№\s.'’"“”()\-–—]+$/u;

export function cleanOrganizationName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeOrganizationName(value: string): string {
  return cleanOrganizationName(value).toLocaleLowerCase("mn-MN");
}

export function isValidMongolianOrganizationName(value: string): boolean {
  const cleaned = cleanOrganizationName(value);
  if (!cleaned) return false;
  if (!MONGOLIAN_ORGANIZATION_NAME_PATTERN.test(cleaned)) return false;
  return /[А-Яа-яЁёӨөҮү]/u.test(cleaned);
}

export function cleanBusinessCategory(value: string): string | null {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (cleaned.length < 2 || cleaned.length > 120) return null;
  return cleaned;
}

export function normalizeUserSearchQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
