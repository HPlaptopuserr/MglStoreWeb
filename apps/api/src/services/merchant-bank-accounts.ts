import { prisma } from "@mgl/database";

export interface MerchantBankAccount {
  account_bank_code: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
}

export function parseMerchantBankAccounts(
  value: unknown,
): MerchantBankAccount[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10)
    return null;
  const accounts: MerchantBankAccount[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null || Array.isArray(item))
      return null;
    const record = item as Record<string, unknown>;
    if (
      typeof record.account_bank_code !== "string" ||
      !/^\d{6}$/.test(record.account_bank_code.trim()) ||
      typeof record.account_number !== "string" ||
      !/^[A-Za-z0-9]{6,34}$/.test(record.account_number.replace(/\s/g, "")) ||
      typeof record.account_name !== "string" ||
      !record.account_name.trim() ||
      record.account_name.trim().length > 120 ||
      (record.is_default !== undefined &&
        typeof record.is_default !== "boolean")
    )
      return null;
    accounts.push({
      account_bank_code: record.account_bank_code.trim(),
      account_number: record.account_number.replace(/\s/g, "").toUpperCase(),
      account_name: record.account_name.trim(),
      is_default: record.is_default === true,
    });
  }
  if (
    new Set(
      accounts.map(
        (account) => `${account.account_bank_code}:${account.account_number}`,
      ),
    ).size !== accounts.length
  )
    return null;
  if (accounts.filter((account) => account.is_default).length !== 1)
    return null;
  return accounts;
}

export async function resolveBankAccountOwner(
  userId: string,
  organizationId: unknown,
): Promise<string | null> {
  if (typeof organizationId !== "string" || !organizationId.trim()) return null;
  const member = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
      role: "OWNER",
      isActive: true,
      deletedAt: null,
      organization: { deletedAt: null },
    },
    select: { organizationId: true },
  });
  return member?.organizationId ?? null;
}
