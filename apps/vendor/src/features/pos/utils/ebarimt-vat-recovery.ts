import { calculateEbarimtVat } from "./ebarimt-vat";

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const requiredText = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim())
    throw new Error("PosAPI эх баримтын мэдээлэл дутуу байна.");
  return value;
};
const amount = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    throw new Error("PosAPI эх баримтын дүн буруу байна.");
  return value;
};

/** Correct a confirmed rejected receipt using its original fiscal ID, never a fresh sale. */
export function buildVatRecoveryPayload(
  value: unknown,
  receiptNo: string,
  expectedId: string,
  expectedAmount: number,
) {
  if (
    !record(value) ||
    value.status !== "ERROR" ||
    value.id !== expectedId ||
    value.type !== "B2C_RECEIPT" ||
    value.merchantTin !== "75200179693" ||
    value.posNo !== "10052245" ||
    value.totalAmount !== expectedAmount ||
    value.totalCityTax !== 0 ||
    !Array.isArray(value.receipts) ||
    value.receipts.length !== 1
  )
    throw new Error(
      "Сэргээх эх баримт касс болон борлуулалттай тохирохгүй байна.",
    );
  const group = value.receipts[0];
  if (
    !record(group) ||
    group.taxType !== "VAT_ABLE" ||
    !Array.isArray(group.items) ||
    group.totalCityTax !== 0
  )
    throw new Error("Зөвхөн баталгаажсан НӨАТ-ын алдаатай баримтыг сэргээнэ.");
  const items = group.items.map((item: unknown) => {
    if (!record(item)) throw new Error("Эх баримтын барааны мөр буруу байна.");
    const qty = amount(item.qty);
    if (qty <= 0) throw new Error("Эх баримтын тоо хэмжээ буруу байна.");
    return {
      name: requiredText(item.name),
      barCode: requiredText(item.barCode),
      barCodeType: requiredText(item.barCodeType),
      classificationCode: requiredText(item.classificationCode),
      measureUnit: requiredText(item.measureUnit),
      qty,
      unitPrice: amount(item.unitPrice),
      totalAmount: amount(item.totalAmount),
      totalCityTax: amount(item.totalCityTax),
    };
  });
  if (
    !items.length ||
    items.some((item) => item.totalCityTax !== 0) ||
    items.reduce((sum, item) => sum + Math.round(item.totalAmount * 100), 0) !==
      Math.round(expectedAmount * 100)
  )
    throw new Error("Эх баримтын мөрийн нийлбэр зөрсөн байна.");
  if (!Array.isArray(value.payments))
    throw new Error("Эх баримтын төлбөр дутуу байна.");
  const payments = value.payments.map((payment: unknown) => {
    if (!record(payment) || payment.status !== "PAID")
      throw new Error("Эх баримтын төлбөр буруу байна.");
    return {
      code: requiredText(payment.code),
      status: "PAID",
      paidAmount: amount(payment.paidAmount),
    };
  });
  if (
    payments.reduce(
      (sum, payment) => sum + Math.round(payment.paidAmount * 100),
      0,
    ) !== Math.round(expectedAmount * 100)
  )
    throw new Error("Эх баримтын төлбөрийн нийлбэр зөрсөн байна.");
  const allocation = calculateEbarimtVat(items, true, "VAT_ABLE");
  return {
    inactiveId: expectedId,
    billIdSuffix: `R${receiptNo.replace(/[^a-z0-9]/gi, "").slice(-19)}`,
    totalAmount: expectedAmount,
    totalVAT: allocation.totalVAT,
    totalCityTax: 0,
    branchNo: requiredText(value.branchNo),
    districtCode: requiredText(value.districtCode),
    merchantTin: value.merchantTin,
    posNo: value.posNo,
    type: "B2C_RECEIPT",
    receipts: [
      {
        totalAmount: expectedAmount,
        totalVAT: allocation.totalVAT,
        totalCityTax: 0,
        taxType: "VAT_ABLE",
        merchantTin: value.merchantTin,
        items: items.map((item, index) => ({
          ...item,
          totalVAT: allocation.itemVAT[index],
        })),
      },
    ],
    payments,
  };
}
