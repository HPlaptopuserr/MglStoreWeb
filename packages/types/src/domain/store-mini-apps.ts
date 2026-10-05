export class StoreMiniAppValidationError extends Error {}

export const STORE_MINI_APP_SETTINGS_KEY = "private-store-mini-app-catalogs";
export const STORE_MINI_APP_IDS = ["shared-store", "store-owners"] as const;
export type StoreMiniAppId = (typeof STORE_MINI_APP_IDS)[number];
export interface StoreMiniAppConfig {
  enabled: boolean;
  sourceIds: string[];
  allowedPhones: string[];
}
export interface StoreMiniAppSettings {
  "shared-store": StoreMiniAppConfig;
  "store-owners": StoreMiniAppConfig;
}
export interface StoreMiniAppOption {
  id: string;
  name: string;
}
export const STORE_MINI_APP_TITLES: Record<StoreMiniAppId, string> = {
  "shared-store": "Дундын дэлгүүр",
  "store-owners": "Дэлгүүрийн эзэд",
};
export function emptyStoreMiniAppSettings(): StoreMiniAppSettings {
  return {
    "shared-store": { enabled: false, sourceIds: [], allowedPhones: [] },
    "store-owners": { enabled: false, sourceIds: [], allowedPhones: [] },
  };
}
export function normalizeMiniAppPhone(value: string): string | null {
  const digits = value.replace(/[\s()+-]/g, "");
  const local =
    digits.startsWith("976") && digits.length === 11 ? digits.slice(3) : digits;
  return /^[0-9]{8}$/.test(local) ? local : null;
}
export function parseStoreMiniAppSettings(
  value: unknown,
): StoreMiniAppSettings {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new StoreMiniAppValidationError("Каталогийн тохиргоо буруу байна.");
  const record = value as Record<string, unknown>;
  const result = emptyStoreMiniAppSettings();
  for (const id of STORE_MINI_APP_IDS) {
    const raw = record[id];
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new StoreMiniAppValidationError("Mini app тохиргоо дутуу байна.");
    const entry = raw as Record<string, unknown>;
    if (
      typeof entry.enabled !== "boolean" ||
      !Array.isArray(entry.sourceIds) ||
      !Array.isArray(entry.allowedPhones)
    )
      throw new StoreMiniAppValidationError("Тохиргооны төрөл буруу байна.");
    if (entry.sourceIds.length > 100 || entry.allowedPhones.length > 2000)
      throw new StoreMiniAppValidationError(
        "Сонголтын хязгаар хэтэрсэн байна.",
      );
    const sourceIds = entry.sourceIds.map((source: unknown) => {
      if (typeof source !== "string" || !source.trim() || source.length > 100)
        throw new StoreMiniAppValidationError("Эх үүсвэрийн ID буруу байна.");
      return source.trim();
    });
    const allowedPhones = entry.allowedPhones
      .filter(
        (phone: unknown) => typeof phone !== "string" || phone.trim() !== "",
      )
      .map((phone: unknown) => {
        const normalized =
          typeof phone === "string" ? normalizeMiniAppPhone(phone) : null;
        if (!normalized)
          throw new StoreMiniAppValidationError(
            "Утасны дугаар 8 оронтой байна.",
          );
        return normalized;
      });
    if (entry.enabled && !sourceIds.length)
      throw new StoreMiniAppValidationError(
        "Идэвхжүүлэхийн өмнө эх үүсвэр сонгоно уу.",
      );
    result[id] = {
      enabled: entry.enabled,
      sourceIds: [...new Set(sourceIds)],
      allowedPhones: id === "store-owners" ? [...new Set(allowedPhones)] : [],
    };
  }
  return result;
}
