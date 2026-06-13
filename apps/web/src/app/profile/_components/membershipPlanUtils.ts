export type PlanFeature = {
  text: string;
  enabled: boolean;
};

export function parsePlanFeatures(desc: string, defaultUnavailable: string[] = []) {
  const rows = desc
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const enabled = rows
    .filter((feature) => !feature.startsWith("-"))
    .map((feature) => feature.replace(/^\+\s*/, ""));
  const unavailable = uniqueFeatureLines([
    ...defaultUnavailable,
    ...rows
      .filter((feature) => feature.startsWith("-"))
      .map((feature) => feature.replace(/^-\s*/, "")),
  ]);

  return [
    ...enabled.map((text) => ({ text, enabled: true })),
    ...unavailable.map((text) => ({ text, enabled: false })),
  ] satisfies PlanFeature[];
}

function uniqueFeatureLines(items: string[]) {
  return Array.from(
    new Set(items.map((item) => item.trim()).filter(Boolean)),
  );
}
