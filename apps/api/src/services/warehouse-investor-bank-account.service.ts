import { prisma } from "@mgl/database";
import type { WarehouseInvestorBankAccount } from "@mgl/types";

export const confirmedBankDecision = {
  choice: "BANK_TRANSFER",
  confirmedAt: { not: null },
} as const;

export const savedBankAccountSelection = {
  bankName: true,
  bankAccount: true,
  bankAccountName: true,
  confirmedAt: true,
} as const;

export function serializeInvestorBankAccount(
  value:
    | {
        bankName: string | null;
        bankAccount: string | null;
        bankAccountName: string | null;
        confirmedAt: Date | null;
      }
    | null
    | undefined,
): WarehouseInvestorBankAccount | null {
  if (
    !value?.bankName ||
    !value.bankAccount ||
    !value.bankAccountName ||
    !value.confirmedAt
  )
    return null;
  return {
    bankName: value.bankName,
    bankAccount: value.bankAccount,
    bankAccountName: value.bankAccountName,
    confirmedAt: value.confirmedAt.toISOString(),
  };
}

export async function readInvestorBankAccount(userId: string) {
  const decision = await prisma.warehouseDividendDecision.findFirst({
    where: { ...confirmedBankDecision, dividend: { userId } },
    orderBy: [{ confirmedAt: "desc" }, { id: "desc" }],
    select: savedBankAccountSelection,
  });
  return serializeInvestorBankAccount(decision);
}
