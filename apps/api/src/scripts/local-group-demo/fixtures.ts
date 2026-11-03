import { wallNow } from "../../services/workforce/calculation";
import type { OrganizationTaskStatus } from "@mgl/database";

export const demoPrefix = "local-demo-tugs-10x10";
export const demoGroupId = `${demoPrefix}-group`;
export const demoMarker = "[LOCAL DEMO 10x10]";
export const demoPermissions = [
  "ATTENDANCE_VIEW",
  "EMPLOYEES_VIEW",
  "PLANS_VIEW",
  "PLANS_ASSIGN",
  "PLANS_REVIEW",
];
export const demoCompanies = [
  "Төгс Барилга",
  "Төгс Трейд",
  "Төгс Ложистик",
  "Төгс Маркет",
  "Төгс Фүүдс",
  "Төгс Технологи",
  "Төгс Үйлдвэрлэл",
  "Төгс Сервис",
  "Төгс Аялал",
  "Төгс Проперти",
];
const names = [
  "Бат-Эрдэнэ",
  "Саруул",
  "Тэмүүлэн",
  "Номин",
  "Төгөлдөр",
  "Анужин",
  "Энхжин",
  "Мөнх-Оргил",
  "Билгүүн",
  "Хулан",
];
const initials = ["Б", "Д", "Э", "Г", "С", "О", "Н", "М", "Т", "А"];
export const departments = [
  "Удирдлага",
  "Удирдлага",
  "Борлуулалт",
  "Борлуулалт",
  "Үйл ажиллагаа",
  "Үйл ажиллагаа",
  "Үйл ажиллагаа",
  "Санхүү",
  "Санхүү",
  "Хүний нөөц",
];
export function employeeName(company: number, employee: number): string {
  return `${initials[(company + employee) % initials.length]}.${names[employee]}`;
}
export function pad(n: number): string {
  return String(n).padStart(2, "0");
}
export function demoDay(offset: number, now = new Date()): string {
  const wall = wallNow("Asia/Ulaanbaatar", now);
  wall.setUTCDate(wall.getUTCDate() + offset);
  return wall.toISOString().slice(0, 10);
}
export function instant(day: string, hour: number, minute = 0): Date {
  return new Date(
    +new Date(`${day}T00:00:00Z`) + ((hour - 8) * 60 + minute) * 60_000,
  );
}
export function dailyStatus(
  company: number,
  employee: number,
): OrganizationTaskStatus {
  if ((company + employee) % 10 === 9) return "CANCELLED";
  if (employee < 8 - Math.floor(company / 2)) return "DONE";
  return (["IN_PROGRESS", "PENDING_REVIEW", "PENDING"] as const)[
    (company + employee) % 3
  ];
}
export function assertLocalDemoDatabase(
  raw: string | undefined,
  nodeEnv: string | undefined,
): void {
  const url = new URL(raw || "");
  if (
    nodeEnv === "production" ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "5432" ||
    url.pathname !== "/mglstore"
  ) {
    throw new Error(
      "This seed only supports the local 127.0.0.1:5432/mglstore development database.",
    );
  }
}
