import {
  DEFAULT_TEAM_ORG_LAYOUT,
  type TeamOrgLayoutSettings,
} from "./TeamOrgLayoutEditor";
import { DEFAULT_DEPARTMENT_OPTIONS } from "./team.constants";
import type {
  TeamCompanyNode,
  TeamDepartment,
  TeamMember,
  TeamMemberForm,
} from "./team.types";
export function getTeamSectionHint(form: TeamMemberForm) {
  const value =
    `${form.role} ${form.department ?? ""} ${form.skills.join(" ")}`.toLowerCase();
  if (value.includes("үүсгэн") || value.includes("founder"))
    return "Үүсгэн байгуулагчид tab-д автоматаар гарна.";
  if (value.includes("хөрөнгө") || value.includes("investor"))
    return "Хөрөнгө оруулагчид хэсэгт автоматаар гарна.";
  if (value.includes("зөвлөх") || value.includes("advisor"))
    return "Зөвлөхүүд хэсэгт автоматаар гарна.";
  return "Ажилчид tab-ийн байгууллагын бүтэц дотор хэлтсээрээ харагдана.";
}
export function uniqueDepartmentNames(values: unknown[]) {
  const seen = new Set<string>();
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}
export function parseStoredDepartments(value?: string) {
  if (!value) return DEFAULT_DEPARTMENT_OPTIONS;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? uniqueDepartmentNames(parsed)
      : DEFAULT_DEPARTMENT_OPTIONS;
  } catch {
    return DEFAULT_DEPARTMENT_OPTIONS;
  }
}
export function buildDepartments(
  stored: string[],
  members: TeamMember[],
): TeamDepartment[] {
  const counts = new Map<string, number>();
  for (const member of members) {
    const department = member.department?.trim();
    if (department) counts.set(department, (counts.get(department) ?? 0) + 1);
  }
  return uniqueDepartmentNames([
    ...stored,
    ...members.map(({ department }) => department),
  ]).map((name) => ({ name, count: counts.get(name) ?? 0 }));
}
export function parseCompanyNodes(
  value: string | undefined,
  fallbackName: string,
  fallbackSubtitle: string,
): TeamCompanyNode[] {
  if (value)
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const nodes = parsed.flatMap((item, index): TeamCompanyNode[] => {
          if (!item || typeof item !== "object") return [];
          const node = item as Record<string, unknown>;
          const id = typeof node.id === "string" ? node.id : `company-${index}`;
          const name =
            typeof node.name === "string" && node.name.trim()
              ? node.name.trim()
              : fallbackName;
          const subtitle =
            typeof node.subtitle === "string" && node.subtitle.trim()
              ? node.subtitle.trim()
              : fallbackSubtitle;
          const order = typeof node.order === "number" ? node.order : index;
          return id && name ? [{ id, name, subtitle, order }] : [];
        });
        if (nodes.length) return nodes.sort((a, b) => a.order - b.order);
      }
    } catch {}
  return [
    {
      id: "root-company",
      name: fallbackName,
      subtitle: fallbackSubtitle,
      order: 0,
    },
  ];
}
export function parseDepartmentConnections(
  value?: string,
): Record<string, string> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, next]) => typeof key === "string" && typeof next === "string",
      ),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}
function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.min(max, Math.max(min, Math.round(numeric)))
    : fallback;
}
export function parseTeamOrgLayout(value?: string): TeamOrgLayoutSettings {
  if (!value) return DEFAULT_TEAM_ORG_LAYOUT;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return DEFAULT_TEAM_ORG_LAYOUT;
    const item = parsed as Record<string, unknown>;
    return {
      rootCardWidth: clampNumber(
        item.rootCardWidth,
        190,
        340,
        DEFAULT_TEAM_ORG_LAYOUT.rootCardWidth,
      ),
      departmentCardWidth: clampNumber(
        item.departmentCardWidth,
        130,
        260,
        DEFAULT_TEAM_ORG_LAYOUT.departmentCardWidth,
      ),
      companyGap: clampNumber(
        item.companyGap,
        8,
        64,
        DEFAULT_TEAM_ORG_LAYOUT.companyGap,
      ),
      departmentGap: clampNumber(
        item.departmentGap,
        8,
        72,
        DEFAULT_TEAM_ORG_LAYOUT.departmentGap,
      ),
      verticalGap: clampNumber(
        item.verticalGap,
        32,
        110,
        DEFAULT_TEAM_ORG_LAYOUT.verticalGap,
      ),
      lineColor:
        typeof item.lineColor === "string" &&
        /^#[0-9a-fA-F]{6}$/.test(item.lineColor)
          ? item.lineColor
          : DEFAULT_TEAM_ORG_LAYOUT.lineColor,
    };
  } catch {
    return DEFAULT_TEAM_ORG_LAYOUT;
  }
}
export function reorderItems<T>(
  items: T[],
  fromIndex: number,
  toIndex: number,
) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}
export function groupMembersByDepartment(
  members: TeamMember[],
  departments: TeamDepartment[],
) {
  const grouped = new Map<string, TeamMember[]>(
    departments.map(({ name }) => [name, []]),
  );
  for (const member of members) {
    const department = member.department || "Ерөнхий баг";
    grouped.set(department, [...(grouped.get(department) ?? []), member]);
  }
  return Array.from(grouped, ([department, items]) => ({
    department,
    members: [...items].sort((a, b) => a.order - b.order),
  })).filter(
    (group) =>
      group.members.length > 0 ||
      departments.some(({ name }) => name === group.department),
  );
}
