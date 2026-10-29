interface CheckoutFinalizationContext {
  registerReady: boolean;
  shiftLoading: boolean;
  shiftError: string | null;
  hasShift: boolean;
  shiftRegisterMismatch: boolean;
  loyaltyReady: boolean;
  hasPendingPayment: boolean;
  confirmedPaid: number;
  payableTotal: number;
}

/** Explain prerequisites without changing verified payments or taking another payment. */
export function checkoutFinalizationBlocker(context: CheckoutFinalizationContext): string | null {
  if (!context.registerReady) return "Кассын тохиргоо бүрэн ачаалагдаагүй байна. Кассын холболтоо шалгана уу.";
  if (context.shiftLoading) return "Кассын ээлжийг шалгаж байна…";
  if (context.shiftError) return `Ээлжийг шалгаж чадсангүй: ${context.shiftError}`;
  if (!context.hasShift) return "Борлуулалт бүртгэхийн өмнө кассын ээлжээ нээнэ үү. Төлбөрийг дахин авахгүй.";
  if (context.shiftRegisterMismatch) return "Нээлттэй ээлж өөр кассанд байна. Ээлжийн кассаа сонгоно уу. Төлбөрийг дахин авахгүй.";
  if (context.hasPendingPayment) return "Хүлээгдэж буй төлбөрийн төлөвийг эхлээд шалгана уу. Дахин төлбөр авахгүй.";
  if (Math.round(context.confirmedPaid * 100) > Math.round(context.payableTotal * 100)) return "Баталгаажсан төлбөр нийт дүнгээс их байна. Төлбөрийн задаргааг шалгана уу.";
  if (!context.loyaltyReady) return "M Point мэдээллээ гүйцээх эсвэл «Ашиглахгүй» сонголтыг сонгоно уу. Төлбөрийг дахин авахгүй.";
  return null;
}
