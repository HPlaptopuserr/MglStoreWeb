/** Cash tender is distinct from revenue. All arithmetic uses minor units. */
export interface CashPaymentDetails {
  receivedAmount: number;
  changeAmount: number;
}

export const MAX_CASH_AMOUNT = 999_999_999;

function minorUnits(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > MAX_CASH_AMOUNT) {
    throw new Error("Мөнгөн дүн 0–999,999,999 хооронд байх ёстой");
  }
  const scaled = value * 100;
  if (Math.abs(scaled - Math.round(scaled)) > 0.00001) {
    throw new Error("Мөнгөн дүн хамгийн ихдээ хоёр бутархай оронтой байна");
  }
  return Math.round(scaled);
}

export function parseCashReceivedAmount(input: string): number {
  const value = input.trim();
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(value)) {
    throw new Error(
      "Авсан мөнгийг энгийн тоогоор, хамгийн ихдээ хоёр бутархай оронтой оруулна уу",
    );
  }
  const amount = Number(value);
  minorUnits(amount);
  return amount;
}

export function calculateCashPayment(
  receivedAmount: number,
  payableAmount: number,
) {
  const received = minorUnits(receivedAmount);
  const payable = minorUnits(payableAmount);
  if (received === 0 || payable === 0)
    throw new Error("Төлбөрийн дүн 0-оос их байна");
  const applied = Math.min(received, payable);
  return {
    amount: applied / 100,
    cash: {
      receivedAmount: received / 100,
      changeAmount: (received - applied) / 100,
    },
    remaining: (payable - applied) / 100,
  };
}

/** Ignore client-supplied change; derive it from the applied cash payment. */
export function normalizeCashPayment(
  method: string,
  amount: number,
  input: unknown,
): CashPaymentDetails | undefined {
  if (input === undefined) return undefined;
  if (
    method !== "CASH" ||
    !input ||
    typeof input !== "object" ||
    !("receivedAmount" in input)
  ) {
    throw new Error("cash мэдээллийг зөвхөн бэлэн төлбөрт оруулна");
  }
  if (typeof input.receivedAmount !== "number")
    throw new Error("Авсан мөнгө тоо байх ёстой");
  const result = calculateCashPayment(input.receivedAmount, amount);
  if (result.remaining !== 0)
    throw new Error("Авсан мөнгө бэлэн төлөлтийн дүнгээс бага байна");
  return result.cash;
}

/** Malformed historic metadata must not prevent a receipt from being opened. */
export function readCashPayment(
  method: string,
  amount: number,
  input: unknown,
): CashPaymentDetails | undefined {
  try {
    return normalizeCashPayment(method, amount, input);
  } catch {
    return undefined;
  }
}

export function summarizeCashPayments(
  payments: ReadonlyArray<{
    method: string;
    amount: number;
    cash?: CashPaymentDetails;
  }>,
): CashPaymentDetails | undefined {
  const cashLines = payments.filter((item) => item.method === "CASH");
  // A partial total could mislead a cashier when some historic rows lack metadata.
  if (cashLines.length === 0 || cashLines.some((item) => !item.cash))
    return undefined;
  return cashLines.reduce<CashPaymentDetails>(
    (sum, item) => ({
      receivedAmount:
        Math.round(
          (sum.receivedAmount + (item.cash?.receivedAmount ?? 0)) * 100,
        ) / 100,
      changeAmount:
        Math.round((sum.changeAmount + (item.cash?.changeAmount ?? 0)) * 100) /
        100,
    }),
    { receivedAmount: 0, changeAmount: 0 },
  );
}
