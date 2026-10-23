export const MGL_CLUB_PROVINCES = [
  "Архангай",
  "Баян-Өлгий",
  "Баянхонгор",
  "Булган",
  "Говь-Алтай",
  "Говьсүмбэр",
  "Дархан-Уул",
  "Дорноговь",
  "Дорнод",
  "Дундговь",
  "Завхан",
  "Орхон",
  "Өвөрхангай",
  "Өмнөговь",
  "Сүхбаатар",
  "Сэлэнгэ",
  "Төв",
  "Увс",
  "Ховд",
  "Хөвсгөл",
  "Хэнтий",
] as const;
export const MGL_CLUB_LOCATIONS = [
  ...MGL_CLUB_PROVINCES,
  "Улаанбаатар",
] as const;
export type MglClubLocation = (typeof MGL_CLUB_LOCATIONS)[number];

export function normalizeMglClubLocation(
  value: string,
): MglClubLocation | null {
  const trimmed = value.trim().replace(/\s+аймаг$/iu, "");
  if (trimmed === "Дархан") return "Дархан-Уул";
  if (trimmed === "Эрдэнэт") return "Орхон";
  return MGL_CLUB_LOCATIONS.find((location) => location === trimmed) ?? null;
}

export const MGL_CLUB_SECTORS = [
  "Худалдаа",
  "Мэдээллийн технологи",
  "Барилга, үл хөдлөх",
  "Хоол үйлдвэрлэл",
  "Эрүүл мэнд, гоо сайхан",
  "Боловсрол",
  "Тээвэр, логистик",
  "Үйлдвэрлэл",
  "Аялал жуулчлал",
  "Санхүү, зөвлөх үйлчилгээ",
  "Бусад",
] as const;

export const mglClubFields = [
  { id: "name", label: "Гишүүний нэр", required: true, maxLength: 160 },
  {
    id: "businessName",
    label: "Бизнес / байгууллагын нэр",
    required: true,
    maxLength: 160,
  },
  {
    id: "sector",
    label: "Үйл ажиллагааны чиглэл",
    required: true,
    maxLength: 160,
  },
  { id: "city", label: "Аймаг / нийслэл", required: true, maxLength: 160 },
  {
    id: "description",
    label: "Бизнесийн танилцуулга",
    required: true,
    maxLength: 1500,
  },
  {
    id: "offers",
    label: "Санал болгох бүтээгдэхүүн, үйлчилгээ",
    required: true,
    maxLength: 1500,
  },
  {
    id: "needs",
    label: "Худалдан авах бараа, үйлчилгээ / хамтын ажиллагааны хэрэгцээ",
    required: false,
    maxLength: 1500,
  },
  {
    id: "foundedYear",
    label: "Үйл ажиллагаа эхэлсэн он",
    required: false,
    maxLength: 4,
  },
  {
    id: "role",
    label: "Албан тушаал / бизнес дэх үүрэг",
    required: false,
    maxLength: 160,
  },
  { id: "teamSize", label: "Ажилтны тоо", required: false, maxLength: 6 },
  {
    id: "address",
    label: "Сум, дүүрэг / дэлгэрэнгүй хаяг",
    required: false,
    maxLength: 300,
  },
  {
    id: "workingHours",
    label: "Ажиллах өдөр, цаг",
    required: false,
    maxLength: 160,
  },
  {
    id: "serviceArea",
    label: "Үйлчилгээ үзүүлэх бүс / хүргэлт",
    required: false,
    maxLength: 300,
  },
  {
    id: "website",
    label: "Вэб сайт / сошиал хуудас",
    required: false,
    maxLength: 300,
  },
  { id: "phone", label: "Холбоо барих утас", required: true, maxLength: 8 },
] as const;
export const mglClubFormFields = [
  ...mglClubFields.map((field) => ({ ...field, type: "text" })),
  { id: "consent", label: "Нийтлэх зөвшөөрөл", type: "text", required: true },
];

export type MglClubField = (typeof mglClubFields)[number]["id"];
export type MglClubProfile = Record<MglClubField, string> & { consent: "yes" };
export type MglClubMember = Omit<MglClubProfile, "consent"> & {
  id: string;
  isDemo?: boolean;
};
export interface MglClubServiceGroup {
  sector: string;
  count: number;
}

export interface MglClubDirectoryPage {
  services: MglClubServiceGroup[];
  members: MglClubMember[];
  nextCursor: string | null;
}

export function getMglClubCurrentYear(): number {
  return Number(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: "Asia/Ulaanbaatar",
    }).format(new Date()),
  );
}

export function getMglClubOperatingYears(
  foundedYear: string | undefined,
  currentYear = getMglClubCurrentYear(),
): number | null {
  if (!foundedYear || !/^\d{4}$/.test(foundedYear)) return null;
  const year = Number(foundedYear);
  return year >= 1900 && year <= currentYear ? currentYear - year : null;
}

export function parseMglClubProfile(input: unknown): MglClubProfile | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const source = input as Record<string, unknown>;
  if (source.consent !== "yes") return null;
  const data = {} as Record<MglClubField, string>;
  for (const field of mglClubFields) {
    const value = source[field.id];
    if (value !== undefined && typeof value !== "string") return null;
    data[field.id] = typeof value === "string" ? value.trim() : "";
    if (
      data[field.id].length > field.maxLength ||
      (field.required && !data[field.id])
    )
      return null;
  }
  if (
    !/^[0-9]{8}$/.test(data.phone) ||
    !MGL_CLUB_SECTORS.some((sector) => sector === data.sector)
  )
    return null;
  if (data.foundedYear && getMglClubOperatingYears(data.foundedYear) === null)
    return null;
  if (
    data.teamSize &&
    (!/^[1-9]\d{0,5}$/.test(data.teamSize) || Number(data.teamSize) > 100000)
  )
    return null;
  if (data.website) {
    try {
      const website = new URL(data.website);
      if (
        !["https:", "http:"].includes(website.protocol) ||
        website.username ||
        website.password ||
        !website.hostname.includes(".")
      )
        return null;
    } catch {
      return null;
    }
  }
  const location = normalizeMglClubLocation(data.city);
  if (!location) return null;
  return { ...data, city: location, consent: "yes" };
}
