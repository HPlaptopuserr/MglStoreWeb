import type { Prisma } from "@mgl/database";
import type { WorkforceEmployeeProfile } from "@mgl/types";
import {
  normalizePayrollAccountNumber,
  payrollAccountError,
  payrollAccountFields,
  maskPayrollAccountNumber,
} from "@mgl/types";
import { WorkforceError } from "./access";
import { object, text } from "./validation";
import { normalizePhoneNumber } from "../../utils/phone-number";

type ProfileWrite = Omit<
  Prisma.WorkforceEmployeeProfileUncheckedCreateInput,
  "memberId" | "createdAt" | "updatedAt"
>;
const textFields = {
  fullName: ["Нэр", 150],
  lastName: ["Овог", 150],
  email: ["Имэйл", 254],
  registerNumber: ["Регистрийн дугаар", 20],
  address: ["Гэрийн хаяг", 1000],
  employeeCode: ["Ажилтны код", 50],
  jobTitle: ["Албан тушаал", 150],
  emergencyContactName: ["Яаралтай холбоо барих хүний нэр", 150],
  notes: ["Нэмэлт мэдээлэл", 2000],
} as const;
export function normalizeDepartmentName(value: unknown): string {
  const name =
    typeof value === "string"
      ? value.normalize("NFKC").trim().replace(/\s+/g, " ")
      : value;
  return text(name, "Алба, хэлтэс", 120, true);
}
function optionalDay(value: unknown, label: string): Date | null {
  const raw = text(value, label, 10, true);
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(raw) ||
    !Number.isFinite(+date) ||
    date.toISOString().slice(0, 10) !== raw
  )
    throw new WorkforceError(400, `${label}: огноо буруу`);
  return date;
}
export function parseEmployeeProfile(value: unknown): ProfileWrite {
  const input = object(value);
  const result: ProfileWrite = {};
  for (const key of Object.keys(textFields) as (keyof typeof textFields)[]) {
    if (key in input) {
      const [label, maximum] = textFields[key];
      result[key] =
        text(input[key], label, maximum, key !== "fullName") || null;
    }
  }
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))
    throw new WorkforceError(400, "Имэйл хаяг буруу");
  for (const key of ["phone", "emergencyContactPhone"] as const) {
    if (!(key in input)) continue;
    const raw = text(input[key], "Утасны дугаар", 32, true);
    if (!raw) {
      result[key] = null;
      continue;
    }
    const phone = normalizePhoneNumber(raw);
    if (!/^[+\d\s()-]+$/.test(raw) || !phone || !/^\d{8}$/.test(phone))
      throw new WorkforceError(400, "Утасны дугаар 8 оронтой байна");
    result[key] = phone;
  }
  if ("birthDate" in input) {
    result.birthDate = optionalDay(input.birthDate, "Төрсөн огноо");
    if (result.birthDate && +result.birthDate > Date.now())
      throw new WorkforceError(400, "Төрсөн огноо ирээдүйд байж болохгүй");
  }
  if ("hiredAt" in input)
    result.hiredAt = optionalDay(input.hiredAt, "Ажилд орсон огноо");
  if ("gender" in input) {
    const gender = input.gender;
    if (
      gender !== "" &&
      gender !== null &&
      gender !== "MALE" &&
      gender !== "FEMALE" &&
      gender !== "OTHER"
    )
      throw new WorkforceError(400, "Хүйсийн утга буруу");
    result.gender = gender || null;
  }
  if (payrollAccountFields.some((key) => key in input)) {
    const account = {
      payrollBankName: text(input.payrollBankName, "Банкны нэр", 120, true),
      payrollAccountNumber: normalizePayrollAccountNumber(
        text(input.payrollAccountNumber, "Дансны дугаар / IBAN", 60, true),
      ),
      payrollAccountHolder: text(
        input.payrollAccountHolder,
        "Данс эзэмшигчийн нэр",
        150,
        true,
      ),
    };
    const error = payrollAccountError(account);
    if (error) throw new WorkforceError(400, error);
    result.payrollBankName = account.payrollBankName || null;
    result.payrollAccountNumber = account.payrollAccountNumber || null;
    result.payrollAccountHolder = account.payrollAccountHolder || null;
  }
  return result;
}
export function serializeEmployeeProfile(
  profile:
    | ({
        [K in keyof Omit<
          WorkforceEmployeeProfile,
          "birthDate" | "hiredAt" | "gender"
        >]: string | null;
      } & {
        birthDate: Date | null;
        hiredAt: Date | null;
        gender: string | null;
      })
    | null,
  account: { fullName: string; email: string; phone: string },
): WorkforceEmployeeProfile {
  return {
    payrollBankName: profile?.payrollBankName ?? "",
    payrollAccountNumber: profile?.payrollAccountNumber ?? "",
    payrollAccountHolder: profile?.payrollAccountHolder ?? "",
    fullName: profile?.fullName ?? account.fullName,
    lastName: profile?.lastName ?? "",
    email: profile?.email ?? account.email,
    phone: profile?.phone ?? account.phone,
    registerNumber: profile?.registerNumber ?? "",
    address: profile?.address ?? "",
    employeeCode: profile?.employeeCode ?? "",
    jobTitle: profile?.jobTitle ?? "",
    birthDate: profile?.birthDate?.toISOString().slice(0, 10) ?? "",
    hiredAt: profile?.hiredAt?.toISOString().slice(0, 10) ?? "",
    gender:
      profile?.gender === "MALE" ||
      profile?.gender === "FEMALE" ||
      profile?.gender === "OTHER"
        ? profile.gender
        : "",
    emergencyContactName: profile?.emergencyContactName ?? "",
    emergencyContactPhone: profile?.emergencyContactPhone ?? "",
    notes: profile?.notes ?? "",
  };
}

/** Audit retains change history without copying a full bank account into snapshots. */
export function employeeAuditSnapshot<
  T extends {
    workforceProfile: { payrollAccountNumber: string | null } | null;
  },
>(member: T) {
  return {
    ...member,
    workforceProfile: member.workforceProfile
      ? {
          ...member.workforceProfile,
          payrollAccountNumber:
            maskPayrollAccountNumber(
              member.workforceProfile.payrollAccountNumber ?? "",
            ) || null,
        }
      : null,
  };
}
