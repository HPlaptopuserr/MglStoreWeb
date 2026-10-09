export const STORE_APP_VISIBILITY = [
  {
    "id": "esim",
    "title": "MGL eSIM"
  },
  {
    "id": "hypermarket",
    "title": "Hypermarket"
  },
  {
    "id": "grocery",
    "title": "Онлайн дэлгүүр"
  },
  {
    "id": "store-owners",
    "title": "Дэлгүүрийн эзэд"
  },
  {
    "id": "hr",
    "title": "Хүний нөөц, сургалт"
  },
  {
    "id": "shared-store",
    "title": "Дундын дэлгүүр"
  },
  {
    "id": "projects",
    "title": "Төсөл болон франчайз"
  },
  {
    "id": "services",
    "title": "MGL үйлчилгээ"
  },
  {
    "id": "delivery",
    "title": "Степпэ Ложистик"
  },
  {
    "id": "finance",
    "title": "ББСБ"
  },
  {
    "id": "club",
    "title": "ЭМ ЖИ ЭЛ Клуб"
  },
  {
    "id": "pos",
    "title": "Программ хангамж, кассын систем"
  },
  {
    "id": "health",
    "title": "Эрүүл мэнд"
  },
  {
    "id": "travel",
    "title": "Аялал"
  },
  {
    "id": "auto",
    "title": "Авто стор"
  },
  {
    "id": "building-center",
    "title": "Барилгын төв"
  },
] as const;
export const visibilityKey = (id: string) => `app-mini-app-visible-${id}`;

const shortcutIds = new Set(["wallet", "qr-scan", "payments", "catalog", "coupons", "points", "map", "qr", "chat", "video", "discover"]);
const canonicalId = (id: string) => id === "study" ? "hr" : id === "franchise" ? "projects" : id;
export function isMiniAppVisible(settings: Record<string, string>, id: string): boolean {
  if (shortcutIds.has(id)) return true;
  const override = settings[visibilityKey(id)];
  if (override === "true" || override === "false") return override === "true";
  try {
    const catalogs: unknown = JSON.parse(settings["app-catalog-mini-apps"] || "[]");
    if (Array.isArray(catalogs) && catalogs.includes(id)) return true;
    if (!settings["app-mini-apps"]) return true;
    const configured: unknown = JSON.parse(settings["app-mini-apps"]);
    if (!Array.isArray(configured)) return true;
    return configured.some((entry: unknown) => {
      if (!entry || typeof entry !== "object" || !("id" in entry) || typeof entry.id !== "string") return false;
      const enabled = "isEnabled" in entry ? entry.isEnabled : true;
      return canonicalId(entry.id) === id && enabled !== false && enabled !== 0 && enabled !== "false";
    });
  } catch { return true; }
}

export function orderedMglApps(settings: Record<string, string>) {
  const defaults = ["grocery", "store-owners", "hr", "hypermarket", "esim", "shared-store", "projects", "services", "delivery", "finance", "club", "pos", "health", "travel", "auto", "building-center"];
  let preferred: string[] = defaults;
  try {
    const raw: unknown = JSON.parse(settings["app-mini-app-order"] || "null");
    if (Array.isArray(raw)) preferred = raw.filter((id): id is string => typeof id === "string");
  } catch { /* Invalid configuration falls back to the native app order. */ }
  const ids = [...new Set([...preferred, ...defaults])];
  const byId = new Map<string, (typeof STORE_APP_VISIBILITY)[number]>(STORE_APP_VISIBILITY.map(app => [app.id, app]));
  return ids.flatMap(id => { const app = byId.get(id); return app ? [app] : []; });
}
