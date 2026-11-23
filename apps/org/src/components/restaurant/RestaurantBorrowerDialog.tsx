"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import type { PosCreditBorrower } from "@mgl/types";
import { createRestaurantCreditCustomer } from "@/lib/restaurant-pos-api";
import { useRegisteredCreditBorrower } from "@/hooks/useRegisteredCreditBorrower";
import { verifiedCreditBorrower } from "@/lib/registered-credit-borrower-state";
import { RegisteredCreditUserLookup } from "./RegisteredCreditUserLookup";
import { RestaurantDialog } from "./RestaurantDialog";

interface RestaurantBorrowerDialogProps {
  organizationId: string;
  onClose: () => void;
  onCreated: (borrower: PosCreditBorrower) => void;
}

const fields = [
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
  const [phone, setPhone] = useState("");
  const lookup = useRegisteredCreditBorrower(organizationId);
  const registeredUser = verifiedCreditBorrower(
    lookup.state,
    organizationId,
    phone,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    if (!registeredUser) {
      setError("Эхлээд MGL-д бүртгэлтэй хэрэглэгчийг утсаар шалгана уу.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const borrower = await createRestaurantCreditCustomer({
        organizationId,
        targetType: "CUSTOMER",
        borrowerUserId: registeredUser.id,
        borrowerName: registeredUser.fullName,
        borrowerPhone: registeredUser.phoneNumber,
        borrowerEmail: registeredUser.email || undefined,
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
          MGL-д бүртгэлтэй хэрэглэгчийг утсаар шалгана. Нэр, утас, и-мэйл нь
          тухайн хэрэглэгчийн бүртгэлээс бөглөгдөнө.
        </p>
        <RegisteredCreditUserLookup
          phone={phone}
          state={lookup.state}
          user={registeredUser}
          disabled={saving}
          onPhoneChange={(value) => {
            lookup.invalidate();
            setPhone(value);
            setError("");
          }}
          onLookup={() => void lookup.lookup(phone)}
          onSelect={lookup.select}
        />
        <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <label
              key={field.name}
              className="flex flex-col gap-1.5 text-xs font-semibold text-slate-300"
            >
              <span>{field.label}</span>
              <input
                name={field.name}
                type={field.type}
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
          disabled={saving || !registeredUser}
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
