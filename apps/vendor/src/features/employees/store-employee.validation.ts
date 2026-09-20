import type { PersonalAccount, StoreEmployee } from "./store-employee.model";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasAccountIdentity(value: Record<string, unknown>) {
  return (
    typeof value.id === "string" &&
    typeof value.email === "string" &&
    typeof value.fullName === "string" &&
    (value.phone === null || typeof value.phone === "string")
  );
}

function isStoreEmployee(value: unknown): value is StoreEmployee {
  if (!isRecord(value) || !hasAccountIdentity(value)) return false;
  return (
    typeof value.userId === "string" &&
    (value.role === "OWNER" ||
      value.role === "ADMIN" ||
      value.role === "STAFF" ||
      value.role === "VIEWER") &&
    typeof value.roleLabel === "string" &&
    typeof value.isActive === "boolean" &&
    (value.department === null || typeof value.department === "string") &&
    Array.isArray(value.capabilities) &&
    value.capabilities.every((item: unknown) => typeof item === "string")
  );
}

function isPersonalAccount(value: unknown): value is PersonalAccount {
  return (
    isRecord(value) &&
    hasAccountIdentity(value) &&
    (value.membership === null ||
      value.membership === "ACTIVE" ||
      value.membership === "INACTIVE" ||
      value.membership === "OTHER")
  );
}

function invalidResponse(): never {
  throw new Error("Ажилтны мэдээлэл буруу бүтэцтэй ирлээ. Дахин ачаална уу.");
}

function parseArray<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): T[] {
  if (!Array.isArray(value) || !value.every(isItem)) return invalidResponse();
  return value;
}

export function parseStoreEmployee(value: unknown): StoreEmployee {
  return isStoreEmployee(value) ? value : invalidResponse();
}

export function parseStoreEmployees(value: unknown): StoreEmployee[] {
  return parseArray(value, isStoreEmployee);
}

export function parsePersonalAccounts(value: unknown): PersonalAccount[] {
  return parseArray(value, isPersonalAccount);
}
