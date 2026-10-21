"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ChefHat,
  History,
  Monitor,
  QrCode,
  ReceiptText,
  Settings2,
} from "lucide-react";
import { RestaurantDialog } from "./RestaurantDialog";

interface RestaurantManagementMenuProps {
  shiftOpen: boolean;
  qrDisabled: boolean;
  registerControls: (closeMenu: () => void) => ReactNode;
  onQr: () => void;
  onCustomerDisplay: () => void;
  onShiftHistory: () => void;
  onSalesHistory: () => void;
}

const actionStyle =
  "flex min-h-10 items-center gap-2 rounded-lg border border-[#3d484f] bg-[#122131] px-3 py-2 text-left text-xs font-bold text-[#d4e4fa] transition-colors hover:border-sky-300/60 hover:bg-[#273647] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-40";

export function RestaurantManagementMenu({
  shiftOpen,
  qrDisabled,
  registerControls,
  onQr,
  onCustomerDisplay,
  onShiftHistory,
  onSalesHistory,
}: RestaurantManagementMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const continueWith = (action: () => void) => {
    close();
    action();
  };
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`${actionStyle} shrink-0`}
      >
        <Settings2 aria-hidden="true" className="h-4 w-4" />
        <span>Кассын удирдлага</span>
      </button>
      {open && (
        <RestaurantDialog
          title="Кассын удирдлага"
          subtitle={shiftOpen ? "Ээлж нээлттэй" : "Ээлж хаалттай"}
          busy={false}
          onClose={close}
        >
          <div className="space-y-5">
            <section aria-labelledby="pos-register-settings">
              <h3
                id="pos-register-settings"
                className="mb-2 text-xs font-bold text-slate-400"
              >
                Касс ба ээлж
              </h3>
              {registerControls(close)}
            </section>
            <section aria-labelledby="pos-display-settings">
              <h3
                id="pos-display-settings"
                className="mb-2 text-xs font-bold text-slate-400"
              >
                Дэлгэц ба QR
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={qrDisabled}
                  onClick={() => continueWith(onQr)}
                  className={actionStyle}
                >
                  <QrCode className="h-4 w-4" />
                  QR хэвлэх
                </button>
                <button
                  type="button"
                  onClick={() => continueWith(onCustomerDisplay)}
                  className={actionStyle}
                >
                  <Monitor className="h-4 w-4" />
                  Хэрэглэгчийн дэлгэц
                </button>
                <Link
                  href="/dashboard/kitchen-display"
                  onClick={close}
                  className={actionStyle}
                >
                  <ChefHat className="h-4 w-4" />
                  Гал тогоо
                </Link>
              </div>
            </section>
            <section aria-labelledby="pos-history-settings">
              <h3
                id="pos-history-settings"
                className="mb-2 text-xs font-bold text-slate-400"
              >
                Түүх
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => continueWith(onShiftHistory)}
                  className={actionStyle}
                >
                  <History className="h-4 w-4" />
                  Хаалтын түүх
                </button>
                <button
                  type="button"
                  onClick={() => continueWith(onSalesHistory)}
                  className={actionStyle}
                >
                  <ReceiptText className="h-4 w-4" />
                  Борлуулалтын түүх
                </button>
              </div>
            </section>
          </div>
        </RestaurantDialog>
      )}
    </>
  );
}
