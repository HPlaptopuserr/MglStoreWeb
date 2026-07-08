export const MONGOLIAN_ORG_NAME_ERROR =
  "Байгууллагын нэрийг монгол кирилл үсгээр бичнэ үү.";

const MONGOLIAN_ORG_NAME_PATTERN =
  /^[А-Яа-яЁёӨөҮү№\s.'’"“”()\-–—]+$/u;

export function normalizeOrganizationName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateOrganizationName(value: string) {
  const normalized = normalizeOrganizationName(value);
  if (!normalized) return "Байгууллагын нэрээ оруулна уу.";
  if (!MONGOLIAN_ORG_NAME_PATTERN.test(normalized) || !/[А-Яа-яЁёӨөҮү]/u.test(normalized)) {
    return MONGOLIAN_ORG_NAME_ERROR;
  }
  return "";
}

export function validateBusinessCategory(value: string) {
  const normalized = normalizeOrganizationName(value);
  if (normalized.length < 2) {
    return "Үйл ажиллагааны чиглэлээ тодорхой оруулна уу.";
  }
  if (normalized.length > 120) {
    return "Үйл ажиллагааны чиглэл 120 тэмдэгтээс хэтрэхгүй байна.";
  }
  return "";
}
