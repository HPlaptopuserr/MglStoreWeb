"use client";

import { useEffect, useState } from "react";
import type { RegisterConfig } from "../types/pos.types";
import { getPendingQrReceipts } from "../api/qr-pending-receipts";
import { attachEbarimtReceipt, issueLocalEbarimtReceipt, sendLocalEbarimtData } from "../api/ebarimt";
import { acknowledgeEbarimtAttachment } from "../utils/ebarimt-attachment-recovery";
import { issueClaimedQrFiscalReceipt } from "../utils/qr-fiscal-recovery";

/** Resume fiscal work for sales completed while the cashier browser was offline. */
export function usePendingQrFiscalReceipts(organizationId: string, register: RegisterConfig | null, enabled: boolean) {
  const [state, setState] = useState({ pending: 0, error: "" });
  useEffect(() => {
    setState({ pending: 0, error: "" });
    if (!enabled || !organizationId || !register?.id) return;
    const controller = new AbortController();
    let running = false;
    const load = async () => {
      if (running || controller.signal.aborted) return;
      running = true;
      let pending = 0;
      try {
        const result = await getPendingQrReceipts(register.id, controller.signal);
        const receipts = result.receipts.filter(item => item.fiscalPending && item.receipt.ebarimt?.status !== "SUCCESS");
        pending = receipts.length;
        if (!controller.signal.aborted) setState({ pending, error: "" });
        let attached = false;
        let issueError = "";
        for (const item of receipts) {
          if (controller.signal.aborted) return;
          try {
            const payload = await issueClaimedQrFiscalReceipt({ organizationId,
              invoiceId: item.invoiceId, receipt: item.receipt,
              issue: beforeDispatch => {
                if (controller.signal.aborted) throw new Error("Кассын төлөв өөрчлөгдсөн тул баримт үүсгээгүй.");
                return issueLocalEbarimtReceipt(item.receipt,
                  [{ method: "QR", amount: item.receipt.grandTotal, invoiceId: item.invoiceId }],
                  register, { type: "B2C" }, async () => {
                    if (controller.signal.aborted) throw new Error("Кассын төлөв өөрчлөгдсөн тул баримт үүсгээгүй.");
                    await beforeDispatch();
                  });
              },
            });
            await attachEbarimtReceipt(item.receipt.id, payload);
            acknowledgeEbarimtAttachment(organizationId, item.receipt.id);
            attached = true;
            pending -= 1;
          } catch (error: unknown) {
            issueError ||= error instanceof Error ? error.message : "Өмнөх QR борлуулалтын eBarimt хүлээгдэж байна.";
          }
          if (!controller.signal.aborted) setState({ pending, error: issueError });
        }
        if (attached) await sendLocalEbarimtData(register);
      } catch (error: unknown) {
        if (!controller.signal.aborted) setState({ pending,
          error: error instanceof Error ? error.message : "Өмнөх QR борлуулалтын eBarimt хүлээгдэж байна." });
      } finally { running = false; }
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 30_000);
    const resume = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("online", resume);
    window.addEventListener("focus", resume);
    return () => { controller.abort(); window.clearInterval(timer);
      window.removeEventListener("online", resume); window.removeEventListener("focus", resume); };
  }, [organizationId, register, enabled]);
  return state;
}
