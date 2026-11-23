import crypto from "node:crypto";
import type { Prisma } from "@mgl/database";
import {
  buildCreditBorrowerKey,
  type RegisteredCreditBorrower,
} from "@mgl/types";
import { normalizePhoneNumber } from "../utils/phone-number";

type Database = Pick<Prisma.TransactionClient, "user" | "$queryRaw">;
export class CreditBorrowerError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
const userSelect = {
  id: true,
  email: true,
  profile: { select: { fullName: true, phoneNumber: true } },
} as const;

export function registeredBorrowerPhone(value: unknown): string {
  if (typeof value !== "string" || !/^[+\d\s()-]+$/.test(value))
    throw new CreditBorrowerError(
      400,
      "MGL хэрэглэгчийн бүтэн утасны дугаар оруулна уу",
    );
  const normalized = normalizePhoneNumber(value);
  if (!normalized || !/^\d{8}$/.test(normalized))
    throw new CreditBorrowerError(400, "Утасны дугаар 8 оронтой байна");
  return normalized;
}

type UserIdentity = Prisma.UserGetPayload<{ select: typeof userSelect }>;
function toRegisteredBorrower(user: UserIdentity): RegisteredCreditBorrower {
  const fullName = user.profile?.fullName.trim();
  const phoneNumber = normalizePhoneNumber(user.profile?.phoneNumber);
  if (!fullName || !phoneNumber || !/^\d{8}$/.test(phoneNumber))
    throw new CreditBorrowerError(
      409,
      "Хэрэглэгч MGL бүртгэлийн нэр, утсаа гүйцээнэ үү",
    );
  return {
    id: user.id,
    fullName,
    phoneNumber,
    email: user.email.endsWith("@temp.local") ? null : user.email,
  };
}

/** Exact normalized match only; legacy duplicate numbers must never pick a random user. */
export async function findRegisteredCreditBorrower(
  db: Database,
  phone: unknown,
): Promise<RegisteredCreditBorrower | null> {
  const canonical = registeredBorrowerPhone(phone);
  const matches = await db.$queryRaw<Array<{ id: string }>>`
    SELECT u."id" FROM "User" u JOIN "Profile" p ON p."userId" = u."id"
    WHERE canonical_profile_phone_number(p."phoneNumber") = ${canonical}
      AND u."isActive" = true AND u."deletedAt" IS NULL
    ORDER BY u."id" LIMIT 2
  `;
  if (matches.length > 1)
    throw new CreditBorrowerError(
      409,
      "Энэ дугаарт олон MGL бүртгэл байна. Бүртгэлийг шалгуулна уу",
    );
  if (!matches.length) return null;
  const user = await db.user.findFirst({
    where: { id: matches[0]!.id, isActive: true, deletedAt: null },
    select: userSelect,
  });
  if (!user) return null;
  const result = toRegisteredBorrower(user);
  if (result.phoneNumber !== canonical)
    throw new CreditBorrowerError(
      409,
      "Хэрэглэгчийн утас өөрчлөгдсөн. Дахин хайна уу",
    );
  return result;
}

export type RegisteredCreditIdentity = {
  borrowerUserId: string;
  targetType: "CUSTOMER" | "COMPANY";
  borrowerId: string;
  borrowerName: string;
  borrowerPhone: string;
  borrowerEmail: string | null;
  employeeId: string | null;
  employeeName: string | null;
  normalizedBorrowerKey: string;
};

type CreditIdentityInput = {
  borrowerUserId?: unknown;
  targetType?: unknown;
  borrowerName?: unknown;
  borrowerPhone?: unknown;
};
/** Called inside the writing transaction, never from a client-provided saved customer ID. */
export async function resolveCreditBorrowerIdentity(
  db: Database,
  input: CreditIdentityInput,
): Promise<RegisteredCreditIdentity> {
  const userId =
    typeof input.borrowerUserId === "string" ? input.borrowerUserId.trim() : "";
  if (!userId || userId.length > 100)
    throw new CreditBorrowerError(
      400,
      "Зээл авах MGL хэрэглэгчийг утсаар хайж сонгоно уу",
    );
  if (input.targetType !== "CUSTOMER" && input.targetType !== "COMPANY")
    throw new CreditBorrowerError(400, "Зээлдэгчийн төрөл буруу байна");
  // Prevent deactivation/deletion between authoritative validation and issuance.
  await db.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR SHARE`;
  const user = await db.user.findFirst({
    where: { id: userId, isActive: true, deletedAt: null },
    select: userSelect,
  });
  if (!user)
    throw new CreditBorrowerError(
      409,
      "Идэвхтэй MGL бүртгэлтэй хэрэглэгч сонгоно уу",
    );
  const registered = toRegisteredBorrower(user);
  if (registeredBorrowerPhone(input.borrowerPhone) !== registered.phoneNumber)
    throw new CreditBorrowerError(
      409,
      "Хэрэглэгчийн утас өөрчлөгдсөн. Дахин хайж сонгоно уу",
    );
  const matchingPhone = await findRegisteredCreditBorrower(
    db,
    registered.phoneNumber,
  );
  if (!matchingPhone || matchingPhone.id !== registered.id) {
    throw new CreditBorrowerError(
      409,
      "MGL бүртгэлийн утсыг дахин шалгаж сонгоно уу",
    );
  }
  const company = input.targetType === "COMPANY";
  const companyName =
    typeof input.borrowerName === "string" ? input.borrowerName.trim() : "";
  if (company && (!companyName || companyName.length > 120))
    throw new CreditBorrowerError(
      400,
      "Байгууллагын нэрийг 120 тэмдэгтэд багтаан оруулна уу",
    );
  const companyKey = company
    ? crypto
        .createHash("sha256")
        .update(
          companyName
            .normalize("NFKC")
            .toLocaleLowerCase("mn-MN")
            .replace(/\s+/g, " "),
        )
        .digest("hex")
        .slice(0, 32)
    : "";
  const identity: Omit<RegisteredCreditIdentity, "normalizedBorrowerKey"> = {
    borrowerUserId: registered.id,
    targetType: input.targetType,
    borrowerId: company
      ? `company:${companyKey}:user:${registered.id}`
      : `user:${registered.id}`,
    borrowerName: company ? companyName : registered.fullName,
    borrowerPhone: registered.phoneNumber,
    borrowerEmail: registered.email,
    employeeId: company ? registered.id : null,
    employeeName: company ? registered.fullName : null,
  };
  return {
    ...identity,
    normalizedBorrowerKey: buildCreditBorrowerKey(identity),
  };
}
