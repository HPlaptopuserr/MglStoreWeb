const DEFAULT_MONTHLY_INTEREST_RATE = 0.012;

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const parseDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

const normalizeMonthlyRate = (value: unknown) => {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate <= 0) return DEFAULT_MONTHLY_INTEREST_RATE;
  return rate > 1 ? rate / 100 : rate;
};

export function addCreditMonths(date: Date, months: number) {
  const safeMonths = Math.max(1, Math.floor(Number(months) || 1));
  const next = new Date(date);
  const dayOfMonth = next.getDate();

  next.setMonth(next.getMonth() + safeMonths);

  // JS overflows Jan 31 + 1 month into March. Clamp back to the last day of
  // the target month so credit due dates stay intuitive.
  if (next.getDate() !== dayOfMonth) {
    next.setDate(0);
  }

  return next;
}

const fullMonthsBetween = (start: Date, end: Date) => {
  if (end.getTime() < start.getTime()) return 0;

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  const anchor = new Date(start);
  anchor.setMonth(start.getMonth() + months);
  if (anchor.getTime() > end.getTime()) months -= 1;
  return Math.max(0, months);
};

export type PosCreditInterestInput = {
  principalAmount: unknown;
  monthlyInterestRate?: unknown;
  termMonths?: number | null;
  dueDate?: Date | string | null;
  createdAt?: Date | string | null;
  paidAt?: Date | string | null;
};

export function resolvePosCreditDueDate(credit: PosCreditInterestInput) {
  const explicitDueDate = parseDate(credit.dueDate);
  if (explicitDueDate) return explicitDueDate;

  const createdAt = parseDate(credit.createdAt);
  if (!createdAt) return null;

  return addCreditMonths(createdAt, credit.termMonths || 1);
}

export function calculatePosCreditPayable(
  credit: PosCreditInterestInput,
  asOf: Date = new Date(),
) {
  const principalAmount = roundMoney(Math.max(0, Number(credit.principalAmount || 0)));
  const monthlyInterestRate = normalizeMonthlyRate(credit.monthlyInterestRate);
  const dueDate = resolvePosCreditDueDate(credit);
  const effectiveAsOf = parseDate(credit.paidAt) || asOf;

  const interestMonths =
    dueDate && effectiveAsOf.getTime() >= dueDate.getTime()
      ? fullMonthsBetween(dueDate, effectiveAsOf) + 1
      : 0;
  const totalInterest = roundMoney(principalAmount * monthlyInterestRate * interestMonths);
  const totalDue = roundMoney(principalAmount + totalInterest);

  return {
    principalAmount,
    monthlyInterestRate,
    dueDate,
    interestMonths,
    totalInterest,
    totalDue,
  };
}
