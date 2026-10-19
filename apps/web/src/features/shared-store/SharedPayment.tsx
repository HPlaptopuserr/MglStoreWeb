"use client";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { QrGenerator } from "@mgl/ui";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { MobileBankAppLinks } from "@/components/molecules/payments/MobileBankAppLinks";
import { StoreDialog } from "./StoreDialog";
import { money, type RetailOrder } from "./types";
export function SharedPayment({
  initialOrder,
  onPaid,
  onClose,
}: {
  initialOrder: RetailOrder;
  onPaid: (order: RetailOrder) => void;
  onClose: () => void;
}) {
  const { authFetch } = useAuth();
  const [order, setOrder] = useState(initialOrder);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const paid = order.paymentStatus === "PAID";
  const expired = new Date(order.expiresAt).getTime() <= Date.now();
  const request = useCallback(
    async (action: "invoice" | "check", signal?: AbortSignal) => {
      setPending(true);
      setError("");
      try {
        const response = await authFetch(
          `${API}/store/shared-store/orders/${initialOrder.id}/${action}`,
          { method: "POST", signal },
        );
        const payload = (await response.json()) as RetailOrder & {
          message?: string;
        };
        if (!response.ok)
          throw new Error(
            payload.message || "Төлбөрийн хүсэлт амжилтгүй боллоо.",
          );
        if (signal?.aborted) return;
        setOrder(payload);
        if (payload.paymentStatus === "PAID") onPaid(payload);
      } catch (cause: unknown) {
        if (!signal?.aborted)
          setError(cause instanceof Error ? cause.message : "Алдаа гарлаа.");
      } finally {
        if (!signal?.aborted) setPending(false);
      }
    },
    [authFetch, initialOrder.id, onPaid],
  );
  // Invoice creation is explicit; reopening a saved invoice never recreates it.
  useEffect(() => {
    if (!order.qrText || paid) return;
    const controller = new AbortController();
    const timer = setInterval(() => {
      if (!document.hidden) void request("check", controller.signal);
    }, 10000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [order.qrText, paid, request]);
  return (
    <StoreDialog
      title={paid ? "Төлбөр баталгаажлаа" : "Minu QR төлбөр"}
      onClose={onClose}
    >
      {paid ? (
        <div className="py-6 text-center">
          <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
          <h3 className="mt-5 text-xl font-bold">Захиалга хүлээн авлаа</h3>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {order.orderNumber}
            <br />
            {order.fulfillmentIssue
              ? "Дэлгүүр таны захиалгыг шалгаж, утсаар холбогдоно."
              : "Агуулах таны барааг бэлтгэнэ. Захиалгын төлөвөө энэ хуудаснаас хараарай."}
          </p>
          <button
            onClick={onClose}
            className="mt-6 min-h-11 rounded-xl bg-emerald-800 px-8 font-bold text-white hover:bg-emerald-900"
          >
            Үргэлжлүүлэх
          </button>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-xs font-bold text-slate-400">
            {order.orderNumber}
          </p>
          <p className="mt-2 text-3xl font-black">{money(order.total)}</p>
          <p className="mt-2 text-sm text-slate-500">{order.warehouse.name}</p>
          {order.qrText && !expired ? (
            <>
              <div className="mx-auto my-6 flex w-fit rounded-2xl border border-slate-100 bg-white p-4">
                <QrGenerator value={order.qrText} size={220} />
              </div>
              <MobileBankAppLinks links={order.deepLinks || []} />
              <p className="my-4 text-xs leading-5 text-slate-500">
                Банкны апп-аараа QR уншуулж төлнө үү.
                <br />
                Төлбөр хүлээн авах дансны нэр, дүнг шалгана уу.
              </p>
            </>
          ) : (
            <div className="my-6 rounded-2xl bg-slate-50 p-5">
              <ShieldCheck className="mx-auto mb-3 size-8 text-emerald-600" />
              <p className="text-sm leading-6 text-slate-500">
                Агуулахын холбосон дансаар
                <br />
                {money(order.total)}-ийн нэхэмжлэх үүсгэнэ.
              </p>
            </div>
          )}
          <p className="mb-4 text-xs text-amber-700">
            {expired
              ? "Нөөц хадгалах хугацаа дууссан. Төлсөн бол төлбөрөө шалгана уу."
              : `Нөөц хадгалах хугацаа: ${new Date(order.expiresAt).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })} хүртэл`}
          </p>
          <button
            disabled={pending || (expired && !order.qrText)}
            onClick={() => void request(order.qrText ? "check" : "invoice")}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <RefreshCw size={18} />
            )}
            {order.qrText ? "Төлбөр шалгах" : "QR нэхэмжлэх үүсгэх"}
          </button>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </StoreDialog>
  );
}
