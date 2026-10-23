"use client";
import { Check, ExternalLink, Monitor } from "lucide-react";
import { PosDialog } from "./PosDialog";
import {
  CUSTOMER_DISPLAY_THEME_OPTIONS,
  type CustomerDisplayThemeId,
} from "./PosCustomerDisplay";

interface Props {
  theme: CustomerDisplayThemeId;
  opened: boolean;
  onThemeChange: (theme: CustomerDisplayThemeId) => void;
  onOpenDisplay: () => void;
  onClose: () => void;
}

export function CustomerDisplayDialog({
  theme,
  opened,
  onThemeChange,
  onOpenDisplay,
  onClose,
}: Props) {
  return (
    <PosDialog
      title="Хэрэглэгчийн дэлгэц"
      description="Худалдан авагчид бараа, нийт дүн болон төлбөрийн мэдээллийг харуулна."
      onClose={onClose}
    >
      <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <Monitor size={32} className="shrink-0 text-blue-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Тусдаа дэлгэцээр харуулах</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Дэлгэцийг шинэ цонхонд нээж, худалдан авагчийн дэлгэц рүү шилжүүлнэ.
          </p>
        </div>
      </div>
      <fieldset className="mt-5">
        <legend className="text-sm font-bold">Дэлгэцийн өнгө</legend>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {CUSTOMER_DISPLAY_THEME_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={theme === option.id}
              onClick={() => onThemeChange(option.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs transition focus-visible:outline-2 focus-visible:outline-blue-600 ${theme === option.id ? "border-blue-500 bg-blue-50 font-bold text-blue-700" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"}`}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200"
                style={{ backgroundColor: option.swatch }}
              >
                {theme === option.id && (
                  <Check
                    size={16}
                    className={
                      option.id === "white" ? "text-slate-900" : "text-white"
                    }
                  />
                )}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        onClick={onOpenDisplay}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <ExternalLink size={17} />
        {opened ? "Нээлттэй дэлгэц рүү очих" : "Хэрэглэгчийн дэлгэц нээх"}
      </button>
    </PosDialog>
  );
}
