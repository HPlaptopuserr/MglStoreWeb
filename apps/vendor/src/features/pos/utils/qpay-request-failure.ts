type QPayRequestFailure = {
  definitive: boolean;
  message: string;
};

/** A local recovery failure precedes invoice dispatch and is never a bank timeout. */
export function qpayRequestFailure(error: unknown, invoiceRequestStarted: boolean): QPayRequestFailure {
  const details = error !== null && typeof error === "object" ? error : null;
  const status = details && "status" in details ? Number(details.status) : 0;
  const code = details && "code" in details ? details.code : undefined;
  const definitive = !invoiceRequestStarted || code === "PAYMENT_NOT_STARTED" ||
    [400, 401, 403, 404, 422].includes(status);

  if (definitive) {
    const detail = error instanceof Error ? error.message.trim() : "";
    return {
      definitive: true,
      message: detail || "QR төлбөр эхлээгүй. Тохиргоогоо шалгаад дахин оролдоно уу.",
    };
  }

  return {
    definitive: false,
    message: "QR хүсэлтийн хариу тодорхойгүй байна. Ижил нэхэмжлэлийн төлөвийг шалгаж байна; дахин төлөхгүй хүлээнэ үү.",
  };
}
