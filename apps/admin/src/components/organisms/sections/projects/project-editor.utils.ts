import type {
  ProjectItem,
  ProjectPaymentAccount,
  ProjectResponsiblePerson,
} from "@/lib/sections/types";
import {
  EMPTY_STUDY_PROGRAM_MARKER,
  EMPTY_STUDY_PROGRAM_ROW,
  EMPTY_STUDY_TEACHER_MARKER,
  EMPTY_STUDY_TEACHER_ROW,
  MAX_PROJECT_IMAGES,
} from "./project-editor.constants";
import type {
  ProjectMode,
  StudyProgramRow,
  StudyTeacherRow,
  TeamMemberOption,
} from "./project-editor.types";

export const generateId = () => Math.random().toString(36).slice(2, 10);
export const emptyProject = (mode: ProjectMode = "project"): ProjectItem => ({
  id: generateId(),
  title:
    mode === "franchise"
      ? "Шинэ franchise"
      : mode === "study"
        ? "Шинэ сургалт"
        : "Шинэ төсөл",
  category:
    mode === "franchise" ? "Franchise" : mode === "study" ? "Сургалт" : "Төсөл",
  summary: "",
  details: "",
  price: mode === "study" ? 0 : 5000,
  imageUrl: "",
  imageUrls: [],
  pdfUrl: "",
  pdfPreviewUrl: "",
  pdfThumbnailUrl: "",
  teacherInfo: "",
  duration: "",
  capacity: "",
  courseDate: "",
  courseTime: "",
  deliveryType: mode === "study" ? "Бүртгэл авч байна" : "",
  location: "",
  address: "",
  registrationLabel: mode === "study" ? "Бүртгэл нээлттэй" : "",
  scheduleNote: "",
  priceNote: "",
  originalPrice: 0,
  tags: [],
  isActive: true,
  isFeatured: false,
  featuredOrder: 0,
  paymentAccountId: "",
  paymentMerchantCode: "",
  contractTemplateId: "",
  responsiblePeople: [],
});
export const emptyResponsiblePerson = (): ProjectResponsiblePerson => ({
  id: generateId(),
  teamMemberId: "",
  name: "",
  role: "",
  responsibility: "",
  phone: "",
  email: "",
  avatarUrl: "",
});
export const getResponsiblePeople = (project?: ProjectItem) =>
  Array.isArray(project?.responsiblePeople) ? project.responsiblePeople : [];

function optionalString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}
export function normalizeTeamMembers(data: unknown): TeamMemberOption[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((value): TeamMemberOption[] => {
    if (!value || typeof value !== "object") return [];
    const record = value as Record<string, unknown>;
    const id = optionalString(record, "id")?.trim() ?? "";
    const name = optionalString(record, "name")?.trim() ?? "";
    if (!id || !name) return [];
    return [
      {
        id,
        name,
        role: optionalString(record, "role")?.trim(),
        department: optionalString(record, "department"),
        bio: optionalString(record, "bio"),
        avatarUrl: optionalString(record, "avatarUrl"),
        email: optionalString(record, "email"),
        phoneNumber: optionalString(record, "phoneNumber"),
        isActive: record.isActive !== false,
      },
    ];
  });
}
export function getProjectImages(project?: ProjectItem) {
  if (!project) return [];
  return Array.from(
    new Set(
      [
        ...(Array.isArray(project.imageUrls) ? project.imageUrls : []),
        project.imageUrl,
      ]
        .filter((url): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  );
}
export function parseImageUrls(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_PROJECT_IMAGES);
}
export const tagText = (project: ProjectItem) =>
  (project.tags || []).join(", ");
export const parseTags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
export function getSelectOptions(options: string[], current?: string) {
  const value = String(current || "").trim();
  return Array.from(new Set(value ? [value, ...options] : options));
}
export function parseStudyProgramRows(value?: string): StudyProgramRow[] {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line === EMPTY_STUDY_PROGRAM_MARKER) return EMPTY_STUDY_PROGRAM_ROW;
      const [title, ...description] = line.split("::");
      return {
        title: title.trim(),
        description: description.join("::").trim(),
      };
    });
}
export function serializeStudyProgramRows(rows: StudyProgramRow[]) {
  return rows
    .map(({ title, description }) => ({
      title: title.trim(),
      description: description.trim(),
    }))
    .map((row) =>
      row.title || row.description
        ? row.description
          ? `${row.title} :: ${row.description}`
          : row.title
        : EMPTY_STUDY_PROGRAM_MARKER,
    )
    .join("\n");
}
const looksLikeUrl = (value: string) =>
  /^https?:\/\//i.test(value.trim()) || value.startsWith("data:image/");
export function parseStudyTeacherRows(value?: string): StudyTeacherRow[] {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line === EMPTY_STUDY_TEACHER_MARKER) return EMPTY_STUDY_TEACHER_ROW;
      const [rawName, ...parts] = line.split("::");
      const name = rawName.trim();
      const description = parts[0]?.trim() || "";
      const imageUrl = parts.slice(1).join("::").trim();
      return looksLikeUrl(name) && !description && !imageUrl
        ? { name: "", description: "", imageUrl: name }
        : { name, description, imageUrl };
    });
}
export function serializeStudyTeacherRows(rows: StudyTeacherRow[]) {
  return rows
    .map(({ name, description, imageUrl }) => ({
      name: name.trim(),
      description: description.trim(),
      imageUrl: String(imageUrl || "").trim(),
    }))
    .map((row) =>
      row.name || row.description || row.imageUrl
        ? [row.name, row.description, row.imageUrl].join(" :: ")
        : EMPTY_STUDY_TEACHER_MARKER,
    )
    .join("\n");
}
export const formatMnt = (value: number) =>
  `₮${Number(value || 0).toLocaleString("mn-MN")}`;
export function getBankLabel(bankCode?: string) {
  const banks: Record<string, string> = {
    "050000": "Хаан банк",
    "150000": "Голомт банк",
    "040000": "TDB",
    "320000": "ХасБанк",
    "340000": "Төрийн банк",
    "010000": "Монголбанк",
    "300000": "Капитрон банк",
    "380000": "Богд банк",
    "290000": "Үндэсний хөрөнгө оруулалтын банк",
  };
  return banks[bankCode || ""] || bankCode || "-";
}
export const getSelectedPaymentAccount = (
  project: ProjectItem,
  accounts: ProjectPaymentAccount[],
) =>
  accounts.find(
    (account) =>
      (project.paymentAccountId && account.id === project.paymentAccountId) ||
      (project.paymentMerchantCode &&
        account.merchantCode === project.paymentMerchantCode),
  );
export const formatPaymentAccount = (account?: ProjectPaymentAccount) =>
  account
    ? `${account.label || account.merchantName || "Minu данс"} · ${getBankLabel(account.bankCode)} ${account.accountNumber || "-"} · ${account.merchantCode || "-"}`
    : "Данс сонгоогүй";
export function parsePrice(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}
export const formatUploadSize = (bytes: number) =>
  `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
export function uploadErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const record = data as Record<string, unknown>;
  const message = typeof record.message === "string" ? record.message : "";
  const detail = typeof record.detail === "string" ? record.detail : "";
  return [message, detail].filter(Boolean).join(": ") || fallback;
}
export function compressImage(
  file: File,
  maxWidth = 1600,
  quality = 0.84,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = image.width > maxWidth ? maxWidth / image.width : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      if (!context)
        return reject(new Error("Зураг боловсруулахад алдаа гарлаа"));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("Зураг шахахад алдаа гарлаа")),
        "image/jpeg",
        quality,
      );
    };
    image.onerror = reject;
    image.src = url;
  });
}
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
