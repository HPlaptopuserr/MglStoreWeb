import { getMglClubOperatingYears, type MglClubMember } from "./mgl-club";
export const CLUB_SECTION_TYPES = [
  "hero",
  "split",
  "services",
  "stats",
  "gallery",
  "news",
  "contact",
] as const;
export type ClubSectionType = (typeof CLUB_SECTION_TYPES)[number];
export interface ClubSectionItem {
  title: string;
  text: string;
  imageUrl: string;
  imageAlt: string;
}
export interface ClubWebsiteSection {
  id: string;
  type: ClubSectionType;
  title: string;
  eyebrow: string;
  text: string;
  imageUrl: string;
  imageAlt: string;
  layout: "image-left" | "image-right";
  tone: "light" | "dark";
  items: ClubSectionItem[];
}
export interface ClubWebsiteTheme {
  primaryColor: string;
  backgroundColor: string;
}
export interface ClubWebsite {
  theme?: ClubWebsiteTheme;
  sections: ClubWebsiteSection[];
}
export function isClubWebsiteImage(value: string): boolean {
  if (!value) return true;
  if (
    /^\/api\/forms\/mgl-club\/website-images\/[0-9a-f-]{36}\.webp$/i.test(value)
  )
    return true;
  if (/^\/mgl-club\/website-demo\/[a-z-]+\.(?:svg|png)$/.test(value))
    return true;
  try {
    const url = new URL(value);
    return (
      value.length <= 500 &&
      url.protocol === "https:" &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim().length <= max
    ? value.trim()
    : null;
}
export function parseClubWebsite(input: unknown): ClubWebsite | null {
  if (
    !input ||
    typeof input !== "object" ||
    !("sections" in input) ||
    !Array.isArray(input.sections) ||
    input.sections.length < 1 ||
    input.sections.length > 12
  )
    return null;
  const source = input as Record<string, unknown>;
  let theme: ClubWebsiteTheme | undefined;
  if (source.theme !== undefined) {
    if (
      !source.theme ||
      typeof source.theme !== "object" ||
      Array.isArray(source.theme)
    )
      return null;
    const value = source.theme as Record<string, unknown>;
    if (
      typeof value.primaryColor !== "string" ||
      typeof value.backgroundColor !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(value.primaryColor) ||
      !/^#[0-9a-f]{6}$/i.test(value.backgroundColor)
    )
      return null;
    theme = {
      primaryColor: value.primaryColor,
      backgroundColor: value.backgroundColor,
    };
  }
  const sections: ClubWebsiteSection[] = [],
    ids = new Set<string>();
  for (const raw of input.sections as unknown[]) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    const id = text(r.id, 80),
      title = text(r.title, 160),
      eyebrow = text(r.eyebrow, 80),
      body = text(r.text, 6000),
      imageUrl = text(r.imageUrl, 500),
      imageAlt = text(r.imageAlt, 200);
    if (
      !id ||
      !/^[a-zA-Z0-9-]+$/.test(id) ||
      ids.has(id) ||
      !title ||
      eyebrow === null ||
      body === null ||
      imageUrl === null ||
      imageAlt === null ||
      !isClubWebsiteImage(imageUrl)
    )
      return null;
    if (
      !CLUB_SECTION_TYPES.some((type) => type === r.type) ||
      !["image-left", "image-right"].includes(String(r.layout)) ||
      !["light", "dark"].includes(String(r.tone)) ||
      !Array.isArray(r.items) ||
      r.items.length > 8
    )
      return null;
    const items: ClubSectionItem[] = [];
    for (const item of r.items as unknown[]) {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const i = item as Record<string, unknown>,
        itemTitle = text(i.title, 160),
        itemText = text(i.text, 1000),
        itemImage = text(i.imageUrl, 500),
        alt = text(i.imageAlt, 200);
      if (
        !itemTitle ||
        itemText === null ||
        itemImage === null ||
        alt === null ||
        !isClubWebsiteImage(itemImage)
      )
        return null;
      items.push({
        title: itemTitle,
        text: itemText,
        imageUrl: itemImage,
        imageAlt: alt,
      });
    }
    ids.add(id);
    sections.push({
      id,
      type: r.type as ClubSectionType,
      title,
      eyebrow,
      text: body,
      imageUrl,
      imageAlt,
      layout: r.layout as ClubWebsiteSection["layout"],
      tone: r.tone as ClubWebsiteSection["tone"],
      items,
    });
  }
  if (
    sections.filter((s) => s.type === "hero").length !== 1 ||
    sections[0].type !== "hero" ||
    sections.filter((s) => s.type === "contact").length > 1
  )
    return null;
  const result = { ...(theme ? { theme } : {}), sections };
  return JSON.stringify(result).length > 90000 ? null : result;
}
export function createClubSection(
  type: ClubSectionType,
  id: string,
): ClubWebsiteSection {
  const titles: Record<ClubSectionType, string> = {
    hero: "Хамтдаа бүтээх ирээдүй",
    split: "Бидний тухай",
    services: "Бүтээгдэхүүн, үйлчилгээ",
    stats: "Бидний тоон үзүүлэлт",
    gallery: "Бидний бүтээл",
    news: "Мэдээ, мэдээлэл",
    contact: "Хамтран ажиллая",
  };
  return {
    id,
    type,
    title: titles[type],
    eyebrow: "",
    text: "",
    imageUrl: "",
    imageAlt: "",
    layout: "image-right",
    tone: type === "hero" || type === "contact" ? "dark" : "light",
    items: [],
  };
}
export function defaultClubWebsite(member: MglClubMember): ClubWebsite {
  const hero = {
    ...createClubSection("hero", "home"),
    title: member.businessName,
    eyebrow: member.sector,
    text: member.offers,
  };
  const about = {
    ...createClubSection("split", "about"),
    title: "Бидний тухай",
    eyebrow: member.businessName,
    text: member.description,
  };
  const services = {
    ...createClubSection("services", "services"),
    items: member.offers
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8)
      .map((title) => ({ title, text: "", imageUrl: "", imageAlt: "" })),
  };
  const years = getMglClubOperatingYears(member.foundedYear);
  const stats = {
    ...createClubSection("stats", "numbers"),
    items: [
      ...(years !== null
        ? [
            {
              title: String(years),
              text: "Жилийн туршлага",
              imageUrl: "",
              imageAlt: "",
            },
          ]
        : []),
      ...(member.teamSize
        ? [
            {
              title: member.teamSize,
              text: "Хамт олон",
              imageUrl: "",
              imageAlt: "",
            },
          ]
        : []),
    ],
  };
  const contact = {
    ...createClubSection("contact", "contact"),
    text:
      member.needs || "Бидэнтэй холбогдож, хамтын ажиллагаагаа эхлүүлээрэй.",
  };
  return {
    sections: [
      hero,
      about,
      services,
      ...(stats.items.length ? [stats] : []),
      contact,
    ],
  };
}
