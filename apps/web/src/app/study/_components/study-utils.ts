import type { ProjectItem } from "@/components/molecules/projects/project-types";

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

export function getCourseScheduleText(material: ProjectItem) {
  return [material.courseDate, material.courseTime]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(" · ");
}

export function getStudyPriceText(material: ProjectItem) {
  if (!material.price || material.price <= 0) return "Үнэгүй";
  return `₮${Number(material.price || 0).toLocaleString("mn-MN")}`;
}

export function getPrimaryTeacherName(material: ProjectItem) {
  const firstTeacher = parseTeacherItems(material)[0];
  return firstTeacher?.name || material.category || "MGL Store Academy";
}

export function parseProgramItems(material: ProjectItem): StudyProgramItem[] {
  const lines = (material.details || material.summary || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

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
    .filter(Boolean)
    .map((line) => {
      const [rawName, ...rawDescriptionParts] = line.split("::");
      return {
        name: rawName.trim() || line,
        description: rawDescriptionParts.join("::").trim(),
      };
    });
}
