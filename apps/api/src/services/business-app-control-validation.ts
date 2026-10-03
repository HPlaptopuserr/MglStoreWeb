const BOOLEAN_GROUPS = {
  features: [
    "pos",
    "sales",
    "checklist",
    "orders",
    "inventory",
    "attendance",
    "tasks",
    "delivery",
  ],
  settings: ["attendanceManual", "restrictSalesRepVendors"],
  ceoService: [
    "enabled",
    "adviceNotifications",
    "calendarReminders",
    "weeklyDigest",
    "riskAlerts",
    "kpiInsights",
    "decisionBrief",
  ],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reject malformed controls before any database mutation; never coerce "false" to true. */
export function validateBusinessAppControlPatch(value: unknown): string | null {
  if (!isRecord(value)) return "Тохиргоо объект байх ёстой.";
  for (const key of Object.keys(value)) {
    if (key !== "maxMembers" && !Object.prototype.hasOwnProperty.call(BOOLEAN_GROUPS, key))
      return `Танигдаагүй тохиргоо: ${key}`;
  }
  if (
    value.maxMembers !== undefined &&
    (typeof value.maxMembers !== "number" ||
      !Number.isSafeInteger(value.maxMembers) ||
      value.maxMembers < 1)
  ) {
    return "Ажилчдын лимит эерэг бүхэл тоо байх ёстой.";
  }
  for (const [group, keys] of Object.entries(BOOLEAN_GROUPS)) {
    const entries = value[group];
    if (entries === undefined) continue;
    if (!isRecord(entries)) return `${group} объект байх ёстой.`;
    const allowed: readonly string[] = keys;
    for (const [key, enabled] of Object.entries(entries)) {
      if (!allowed.includes(key))
        return `Танигдаагүй тохиргоо: ${group}.${key}`;
      if (typeof enabled !== "boolean")
        return `${group}.${key} boolean утгатай байх ёстой.`;
    }
  }
  return null;
}
