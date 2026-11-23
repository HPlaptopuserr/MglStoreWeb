type BorrowerIdentity = {
  customerId: string | null;
  targetType: string;
  borrowerId: string;
  employeeId: string | null;
  borrowerPhone: string | null;
};
/** A legacy customer ID alone does not prove all historical debtor snapshots match. */
export function creditBorrowerGroupKey(credit: BorrowerIdentity): string {
  return JSON.stringify([
    credit.customerId,
    credit.targetType,
    credit.borrowerId,
    credit.employeeId,
    credit.borrowerPhone,
  ]);
}
