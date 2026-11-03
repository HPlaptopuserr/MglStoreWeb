/** Offline reference data only; this never simulates a successful payment. */
export function useLocalSystemQrCatalog(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (
    env.NODE_ENV === "production" ||
    env.MGL_LOCAL_DEV !== "true" ||
    env.SYSTEMQR_LOCAL_CATALOG !== "true"
  )
    return false;
  try {
    const database = new URL(env.DATABASE_URL || "");
    return ["localhost", "127.0.0.1", "[::1]"].includes(database.hostname);
  } catch {
    return false;
  }
}

export const localSystemQrCities = [
  {
    code: "LOCAL-CITY",
    name: "[ТЕСТ] Улаанбаатар",
    districts: [{ code: "LOCAL-DISTRICT", name: "[ТЕСТ] Сүхбаатар" }],
  },
];
export const localSystemQrCategories = [
  {
    code: "LOCAL-RESTAURANT",
    name: "[ТЕСТ] Ресторан",
    categoryCode: "LOCAL-FOOD",
    categoryName: "[ТЕСТ] Хоол үйлчилгээ",
  },
];
export const localSystemQrKhoroos = [
  { code: "LOCAL-KHOROO", name: "[ТЕСТ] 1-р хороо" },
];
