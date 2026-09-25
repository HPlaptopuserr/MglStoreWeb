"use client";

import { Printer, QrCode, X } from "lucide-react";
import { QrGenerator } from "@mgl/ui";
import type { PosReceipt } from "@mgl/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { createTestQrReceipt } from "@/lib/test-qr-receipt";
import { formatRestaurantOrderNumber } from "@/lib/restaurant-order-number";
import {
  formatReceiptMoney,
  printThermalPosReceipt,
} from "@/lib/thermal-receipt-printing";

interface TestReceiptPrintProps {
  receipt: PosReceipt;
  organizationName: string;
  registerName: string;
}

export function TestReceiptPrintButton(props: TestReceiptPrintProps) {
  const [open, setOpen] = useState(false);
  if (process.env.NODE_ENV === "production") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-2 rounded-lg border border-amber-300/50 px-4 py-2 text-sm font-black text-amber-100 transition hover:bg-amber-300 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
      >
        <QrCode className="h-4 w-4" aria-hidden="true" />
        Тест QR хэвлэх
      </button>
      {open ? (
        <TestReceiptPrintDialog
          key={props.receipt.id}
          {...props}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function TestReceiptPrintDialog({
  receipt,
  organizationName,
  registerName,
  onClose,
}: TestReceiptPrintProps & { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const testReceipt = useMemo(() => createTestQrReceipt(receipt), [receipt]);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const print = () => {
    const qrMarkup = qrRef.current?.querySelector("svg")?.outerHTML;
    if (!qrMarkup) {
      setError("QR хараахан бэлэн болоогүй байна. Дахин оролдоно уу.");
      return;
    }
    setError("");
    printThermalPosReceipt(testReceipt, {
      organizationName,
      registerName,
      orderLabel: "Тест хэвлэлт · Татварын баримт биш",
      ticketNo: formatRestaurantOrderNumber(receipt.receiptNo, receipt.id),
      qrMarkup,
      splitOrderAndEbarimt: false,
    });
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      aria-labelledby="test-receipt-title"
      aria-describedby="test-receipt-description"
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl backdrop:bg-slate-950/75 sm:p-6"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-amber-700">
            Тестийн баримт
          </p>
          <h2 id="test-receipt-title" className="mt-1 text-xl font-black">
            QR хэвлэлт шалгах
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Тест баримтыг хаах"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-slate-800"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>
      <p
        id="test-receipt-description"
        className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
      >
        Зөвхөн QR-ийн хэмжээ, уншигдалт болон принтер шалгах туршилт. eBarimt-д
        бүртгэгдэхгүй, борлуулалтын мэдээлэл өөрчлөгдөхгүй.
      </p>
      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
        <p className="font-bold">
          {organizationName} · {registerName}
        </p>
        <p className="mt-1 break-all text-slate-600">{receipt.receiptNo}</p>
        <p className="mt-1 font-bold">
          {formatReceiptMoney(receipt.grandTotal)}
        </p>
      </div>
      <div ref={qrRef} className="mx-auto mt-4 w-fit max-w-full bg-white">
        <QrGenerator
          value={testReceipt.ebarimt?.qrData || ""}
          size={240}
          level="M"
          fgColor="#000000"
          className="h-auto max-w-full"
        />
      </div>
      <p className="mt-2 text-center text-xs leading-5 text-slate-500">
        80 мм цаас: QR 52 мм · 58 мм цаас: QR 46 мм
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={print}
        className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-bold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        <Printer className="h-5 w-5" aria-hidden="true" />
        Тест баримт хэвлэх
      </button>
    </dialog>
  );
}
