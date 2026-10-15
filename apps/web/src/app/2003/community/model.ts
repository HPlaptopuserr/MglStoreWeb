export const ACTIVITY_TYPES = {
  employed: {
    label: "Ажил эрхэлдэг",
    direction: "Ажлын чиглэл",
    role: "Албан тушаал",
    organization: "Ажилладаг байгууллага",
  },
  business: {
    label: "Бизнес эрхэлдэг",
    direction: "Бизнесийн чиглэл",
    role: "Бүтээгдэхүүн / үйлчилгээ",
    organization: "Бизнесийн нэр",
  },
  planning: {
    label: "Бизнес төлөвлөж байна",
    direction: "Төлөвлөж буй бизнесийн чиглэл",
    role: "Ямар бизнес эхлүүлэх вэ?",
    organization: "Төслийн нэр (заавал биш)",
  },
} as const;
export type ActivityType = keyof typeof ACTIVITY_TYPES;
export function isActivityType(value: unknown): value is ActivityType {
  return value === "employed" || value === "business" || value === "planning";
}
export interface Member {
  activity?: ActivityType;
  id: string;
  name: string;
  city: string;
  profession: string;
  role: string;
  organization: string;
  sector: string;
  bio: string;
  offers: string[];
  needs: string[];
}
export interface HelpRequest {
  id: string;
  memberId: string;
  title: string;
  description: string;
  category: string;
  resolved: boolean;
}
export interface DemoState {
  members: Member[];
  requests: HelpRequest[];
}
export type DirectoryTab = "all" | ActivityType;
export function matchesMember(
  member: Member,
  query: string,
  city: string,
  sector: string,
): boolean {
  const text = [
    member.name,
    member.profession,
    member.role,
    member.organization,
    member.bio,
    member.sector,
    ...member.offers,
    ...member.needs,
  ]
    .join(" ")
    .toLocaleLowerCase("mn");
  return (
    (!city || member.city === city) &&
    (!sector || member.sector === sector) &&
    text.includes(query.trim().toLocaleLowerCase("mn"))
  );
}
export function isDemoState(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  const strings = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((item) => typeof item === "string");
  return (
    Array.isArray(data.members) &&
    data.members.every((member) => {
      if (!member || typeof member !== "object") return false;
      const row = member as Record<string, unknown>;
      return (
        [
          "id",
          "name",
          "city",
          "profession",
          "role",
          "organization",
          "sector",
          "bio",
        ].every((key) => typeof row[key] === "string") &&
        (row.activity === undefined || isActivityType(row.activity)) &&
        strings(row.offers) &&
        strings(row.needs)
      );
    }) &&
    Array.isArray(data.requests) &&
    data.requests.every((request) => {
      if (!request || typeof request !== "object") return false;
      const row = request as Record<string, unknown>;
      return (
        ["id", "memberId", "title", "description", "category"].every(
          (key) => typeof row[key] === "string",
        ) &&
        typeof row.resolved === "boolean" &&
        (data.members as Member[]).some((member) => member.id === row.memberId)
      );
    })
  );
}
