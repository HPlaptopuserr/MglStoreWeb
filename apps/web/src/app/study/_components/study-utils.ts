import type {
  ProjectItem,
  StudyTicketOption,
} from "@/components/molecules/projects/project-types";

const EMPTY_STUDY_PROGRAM_MARKER = "__EMPTY_STUDY_PROGRAM_ROW__";
const EMPTY_STUDY_TEACHER_MARKER = "__EMPTY_STUDY_TEACHER_ROW__";

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim()) || value.startsWith("data:image/");
}

export type StudySettings = {
  eyebrow: string;
  title: string;
  accentTitle: string;
  description: string;
  countLabel: string;
  secondaryPillLabel: string;
  listEyebrow: string;
  listTitle: string;
  emptyText: string;
  bannerUrl: string;
};

export type StudyProgramItem = {
  title: string;
  description: string;
};

export type StudyTeacherItem = {
  name: string;
  description: string;
  imageUrl?: string;
};

export const DEFAULT_STUDY_SETTINGS: StudySettings = {
  eyebrow: "Training access",
  title: "Сургалт",
  accentTitle: "бүртгэл",
  description:
    "MGL Store-ийн сургалт, зөвлөмж болон хэрэгжүүлэх алхмуудтай танилцаад шууд бүртгүүлж төлбөрөө баталгаажуулна уу.",
  countLabel: "сургалт",
  secondaryPillLabel: "Бүртгэл + төлбөр",
  listEyebrow: "Available trainings",
  listTitle: "Бүртгүүлэх сургалтууд",
  emptyText: "Одоогоор бүртгэлтэй сургалт нэмэгдээгүй байна.",
  bannerUrl: "",
};

export const FALLBACK_PROGRAM_ITEMS: StudyProgramItem[] = [
  {
    title: "Сургалтын үндсэн ойлголт, зорилго болон хэрэгжүүлэх алхмууд",
    description:
      "Энэ хэсгийн дэлгэрэнгүй тайлбарыг admin дээр сургалтын хөтөлбөрийн талбарт нэмнэ.",
  },
  {
    title: "MGL Store дээр ажиллах бодит workflow",
    description:
      "Дасгал ажил, хэрэгжүүлэх алхам болон жишээг admin дээрээс тус бүрээр нь оруулж болно.",
  },
  {
    title: "Дадлага, асуулт хариулт болон дараагийн алхам",
    description:
      "Сургалтын төгсгөлд өгөх зөвлөмж, follow-up алхам, материалын тайлбарыг энд харуулна.",
  },
];

export const FALLBACK_TEACHER_ITEMS: StudyTeacherItem[] = [
  {
    name: "Багшийн мэдээлэл",
    description:
      "Багшийн нэр, албан тушаал, туршлага болон чиглэлийг admin дээрээс нэмнэ.",
    imageUrl: "",
  },
];

export function normalizeStudySettings(raw: unknown): StudySettings {
  const record =
    raw && typeof raw === "object" ? (raw as Partial<StudySettings>) : {};
  const clean = (value: unknown, fallback: string) => {
    const text = String(value || "").trim();
    if (
      !text ||
      /PDF материал|материалууд|материал$|All training materials|Бүх сургалтын материал|Admin-аас удирдана/i.test(
        text,
      )
    ) {
      return fallback;
    }
    return text;
  };

  return {
    eyebrow: clean(record.eyebrow, DEFAULT_STUDY_SETTINGS.eyebrow),
    title: clean(record.title, DEFAULT_STUDY_SETTINGS.title),
    accentTitle: clean(record.accentTitle, DEFAULT_STUDY_SETTINGS.accentTitle),
    description: clean(record.description, DEFAULT_STUDY_SETTINGS.description),
    countLabel: clean(record.countLabel, DEFAULT_STUDY_SETTINGS.countLabel),
    secondaryPillLabel: clean(
      record.secondaryPillLabel,
      DEFAULT_STUDY_SETTINGS.secondaryPillLabel,
    ),
    listEyebrow: clean(record.listEyebrow, DEFAULT_STUDY_SETTINGS.listEyebrow),
    listTitle: clean(record.listTitle, DEFAULT_STUDY_SETTINGS.listTitle),
    emptyText: clean(record.emptyText, DEFAULT_STUDY_SETTINGS.emptyText),
    bannerUrl: String(record.bannerUrl || ""),
  };
}

export function buildStudyDisplayMaterials(materials: ProjectItem[]) {
  return materials;
}

export function buildFeaturedStudyMaterials(materials: ProjectItem[]) {
  const manuallyOrdered = materials
    .map((material, index) => ({
      material,
      index,
      order: Number(material.featuredOrder || 0),
    }))
    .filter((item) => Number.isFinite(item.order) && item.order > 0)
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map((item) => item.material);

  if (manuallyOrdered.length > 0) {
    return manuallyOrdered.slice(0, 4);
  }

  return materials.slice(0, 4);
}

export function getCourseScheduleText(material: ProjectItem) {
  return [getStudyDateText(material.courseDate), material.courseTime]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(" · ");
}

export function getStudyDateText(value?: string) {
  const dateValue = String(value || "").trim();
  if (!dateValue) return "";

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;

  const weekdays = [
    "Ням",
    "Даваа",
    "Мягмар",
    "Лхагва",
    "Пүрэв",
    "Баасан",
    "Бямба",
  ];
  return `${weekdays[date.getDay()]}, ${date.getMonth() + 1}-р сарын ${date.getDate()}`;
}

export function formatStudyPrice(price: number) {
  if (!price || price <= 0) return "Үнэгүй";
  return `${Number(price).toLocaleString("mn-MN")}₮`;
}

export function getStudyTicketOptions(
  material: ProjectItem,
): StudyTicketOption[] {
  const options = Array.isArray(material.ticketOptions)
    ? material.ticketOptions
        .map((option, index) => ({
          id: String(option?.id || "").trim() || `ticket-${index + 1}`,
          label: String(option?.label || "").trim(),
          price:
            Number.isFinite(Number(option?.price)) && Number(option?.price) > 0
              ? Math.round(Number(option.price))
              : 0,
        }))
        .filter((option) => option.label)
    : [];

  if (options.length > 0) return options;

  return [
    {
      id: "default",
      label: material.priceNote || "Нэг хүний эрх",
      price: Number(material.price || 0),
    },
  ];
}

export function getStudyPriceText(material: ProjectItem) {
  return formatStudyPrice(getStudyTicketOptions(material)[0]?.price || 0);
}

export function getPrimaryTeacherName(material: ProjectItem) {
  const firstTeacher = parseTeacherItems(material)[0];
  return firstTeacher?.name || material.category || "MGL Store Academy";
}

export function parseProgramItems(material: ProjectItem): StudyProgramItem[] {
  const lines = (material.details || material.summary || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== EMPTY_STUDY_PROGRAM_MARKER);

  return lines.map((line) => {
    const [rawTitle, ...rawDescriptionParts] = line.split("::");
    const title = rawTitle.trim();
    const description = rawDescriptionParts.join("::").trim();
    return {
      title: title || line,
      description,
    };
  });
}

export function parseTeacherItems(material: ProjectItem): StudyTeacherItem[] {
  return String(material.teacherInfo || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== EMPTY_STUDY_TEACHER_MARKER)
    .map((line) => {
      const [rawName, ...rawDescriptionParts] = line.split("::");
      const description = rawDescriptionParts[0]?.trim() || "";
      const imageUrl = rawDescriptionParts.slice(1).join("::").trim();
      const name = rawName.trim();
      if (looksLikeUrl(name) && !description && !imageUrl) {
        return {
          name: "Багшийн мэдээлэл",
          description: "",
          imageUrl: name,
        };
      }
      return {
        name: name || "Багшийн мэдээлэл",
        description,
        imageUrl,
      };
    });
}
