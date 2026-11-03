"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import type { PosCreditBorrower } from "@mgl/types";
import { createRestaurantCreditCustomer } from "@/lib/restaurant-pos-api";
import { RestaurantDialog } from "./RestaurantDialog";

interface RestaurantBorrowerDialogProps {
  organizationId: string;
  onClose: () => void;
  onCreated: (borrower: PosCreditBorrower) => void;
}

const fields = [
  {
    name: "borrowerName",
    label: "Овог, нэр",
    type: "text",
    required: true,
    maxLength: 120,
    autoComplete: "name",
  },
  {
    name: "borrowerPhone",
    label: "Утасны дугаар",
    type: "tel",
    required: true,
    maxLength: 30,
    autoComplete: "tel",
  },
  {
    name: "borrowerEmail",
    label: "И-мэйл",
    type: "email",
    maxLength: 254,
    autoComplete: "email",
  },
  {
    name: "borrowerAddress",
    label: "Хаяг",
    type: "text",
    maxLength: 500,
    autoComplete: "street-address",
  },
  {
    name: "workplace",
    label: "Ажлын газар",
    type: "text",
    maxLength: 200,
    autoComplete: "organization",
  },
  {
    name: "department",
    label: "Хэлтэс",
    type: "text",
    maxLength: 120,
    autoComplete: "off",
  },
  {
    name: "jobTitle",
    label: "Албан тушаал",
    type: "text",
    maxLength: 120,
    autoComplete: "organization-title",
  },
] as const;

export function RestaurantBorrowerDialog({
  organizationId,
  onClose,
  onCreated,
}: RestaurantBorrowerDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    const phone = value("borrowerPhone");
    if (
      !/^[+\d\s()-]+$/.test(phone) ||
      !/^\d{8,15}$/.test(phone.replace(/\D/g, ""))
    ) {
      setError("Утасны дугаар 8–15 оронтой байна.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const borrower = await createRestaurantCreditCustomer({
        organizationId,
        targetType: "CUSTOMER",
        borrowerName: value("borrowerName"),
        borrowerPhone: phone,
        borrowerEmail: value("borrowerEmail"),
        borrowerAddress: value("borrowerAddress"),
        workplace: value("workplace"),
        department: value("department"),
        jobTitle: value("jobTitle"),
      });
      onCreated(borrower);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Зээлдэгч бүртгэж чадсангүй. Дахин оролдоно уу.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <RestaurantDialog
      title="Зээлдэгч бүртгэх"
      subtitle="Хувь хүний мэдээлэл"
      busy={saving}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-4"
        aria-busy={saving}
      >
        <p className="text-xs leading-5 text-slate-400">
          Нэр, утас заавал бөглөнө. Бүртгэсний дараа зээлийн төлбөрт сонгох
          боломжтой.
        </p>
        <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <label
              key={field.name}
              className="flex flex-col gap-1.5 text-xs font-semibold text-slate-300"
            >
              <span>
                {field.label}
                {"required" in field && field.required ? " *" : ""}
              </span>
              <input
                name={field.name}
                type={field.type}
                required={"required" in field && field.required}
                maxLength={field.maxLength}
                autoComplete={field.autoComplete}
                className="h-11 min-w-0 rounded-lg border border-white/15 bg-[#122131] px-3 text-sm text-white outline-none transition focus:border-sky-300 disabled:opacity-60"
              />
            </label>
          ))}
        </fieldset>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-200"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-sky-300 px-3 text-sm font-bold text-slate-950 transition hover:bg-sky-200 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-100"
        >
          {saving && (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          )}
          {saving ? "Бүртгэж байна..." : "Зээлдэгч бүртгэх"}
        </button>
      </form>
    </RestaurantDialog>
  );
}
