import { API } from "@/lib/api";
import {
  fallbackHrCategory,
  parseHrServicesSetting,
  toHrGroups,
  type HrServiceGroup,
} from "@/components/molecules/hr/hr-services-data";

export async function getHrServiceGroups(): Promise<HrServiceGroup[]> {
  try {
    const res = await fetch(`${API}/site-settings`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`site-settings ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>;
    const groups = toHrGroups(parseHrServicesSetting(data["hr-services"]), {
      includeEmpty: true,
    });
    return groups.length > 0
      ? groups
      : toHrGroups([fallbackHrCategory], { includeEmpty: true });
  } catch {
    return toHrGroups([fallbackHrCategory], { includeEmpty: true });
  }
}

export async function getHrServiceGroup(id: string) {
  const groups = await getHrServiceGroups();
  return {
    groups,
    group: groups.find((item) => item.id === id) ?? null,
  };
}
