import type { LinkExistingCreditBorrowerResult } from "../api/link-existing-credit-borrower";

type BorrowerIdentity = {
  customerId: string | null;
  targetType: string;
  borrowerId: string;
  employeeId: string | null;
  borrowerPhone: string | null;
  borrowerUserId?: string | null;
};
/** A legacy customer ID alone does not prove all historical debtor snapshots match. */
export function creditBorrowerGroupKey(credit: BorrowerIdentity): string {
  return JSON.stringify([
    credit.customerId,
    credit.targetType,
    credit.borrowerId,
    credit.employeeId,
    credit.borrowerPhone,
    credit.borrowerUserId ?? null,
  ]);
}

/** Publish a confirmed link immediately, even if the subsequent list refresh fails. */
export function applyConfirmedCreditBorrowerLink<
  T extends { id: string; borrowerUserId?: string | null; borrowerPhone: string | null },
>(credits: T[], result: LinkExistingCreditBorrowerResult): T[] {
  const linkedIds = new Set(result.linkedCreditSaleIds);
  return credits.map(credit => linkedIds.has(credit.id)
    ? { ...credit, borrowerUserId: result.borrowerUserId, borrowerPhone: result.user.phoneNumber }
    : credit);
}
