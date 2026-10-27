"use client";
import { useState, useRef, useEffect } from "react";
import { Landmark } from "lucide-react";
import type { WorkforcePayrollAccount } from "@mgl/types";
import { normalizePayrollAccountNumber } from "@mgl/types";
import { Field } from "../components/shared";
export function PayrollAccountFields({
  account,
  focusOnMount = false,
}: {
  account: WorkforcePayrollAccount;
  focusOnMount?: boolean;
}) {
  const bankInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!focusOnMount) return;
    const frame = requestAnimationFrame(() => bankInput.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [focusOnMount]);
  const [bank, setBank] = useState(account.payrollBankName ?? "");
  const [number, setNumber] = useState(account.payrollAccountNumber ?? "");
  const [holder, setHolder] = useState(account.payrollAccountHolder ?? "");
  const required = Boolean(bank.trim() || number.trim() || holder.trim());
  return (
    <section
      className="wf-employee-section wf-payroll-fields"
      aria-label="Цалингийн данс"
    >
      <h3>
        <Landmark size={17} aria-hidden="true" /> Цалингийн данс
      </h3>
      <p className="wf-muted">
        Цалин хүлээн авах дансны мэдээлэл. Данс эзэмшигчийн нэр, дугаарыг
        банкныхаа мэдээлэлтэй тулгаж оруулна уу.
      </p>
      <Field label="Банкны нэр">
        <input
          ref={bankInput}
          name="payrollBankName"
          value={bank}
          onChange={(event) => setBank(event.target.value)}
          maxLength={120}
          required={required}
          placeholder="Банкны бүтэн нэр"
          autoComplete="off"
        />
      </Field>
      <Field
        label="Дансны дугаар / IBAN"
        hint="Зай, зураасыг хадгалах үед арилгана. Эхний тэгүүд хэвээр хадгалагдана."
      >
        <input
          name="payrollAccountNumber"
          value={number}
          onChange={(event) => setNumber(event.target.value)}
          onBlur={() => setNumber(normalizePayrollAccountNumber(number))}
          maxLength={60}
          required={required}
          placeholder="Дансны дугаар эсвэл IBAN"
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <Field label="Данс эзэмшигчийн нэр">
        <input
          name="payrollAccountHolder"
          value={holder}
          onChange={(event) => setHolder(event.target.value)}
          maxLength={150}
          required={required}
          placeholder="Банканд бүртгэлтэй нэр"
          autoComplete="off"
        />
      </Field>
      {required && (
        <button
          type="button"
          className="wf-payroll-clear"
          onClick={() => {
            setBank("");
            setNumber("");
            setHolder("");
          }}
        >
          Дансны мэдээллийг цэвэрлэх
        </button>
      )}
    </section>
  );
}
