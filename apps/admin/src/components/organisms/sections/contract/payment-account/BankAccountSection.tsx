"use client";
import { CreditCard } from "lucide-react";
import { BANK_OPTIONS } from "./payment-account.model";
import {
  AccountFormSection,
  AccountInput,
  AccountSelect,
  bindAccountFields,
  type AccountFieldProps,
} from "./AccountFormFields";

export function BankAccountSection({
  config,
  onChange,
  isNew,
}: AccountFieldProps & { isNew: boolean }) {
  const field = bindAccountFields({ config, onChange });

  return (
    <AccountFormSection
      title="Дансны мэдээлэл"
      description="Орлого хүлээн авах банкны данс болон холбоо барих мэдээлэл."
      icon={CreditCard}
    >
      <AccountInput
        label="Дансны нэршил"
        {...field("label")}
        placeholder="Жишээ: eSIM төлбөрийн данс"
        description="Зөвхөн данснуудаа ялгахад ашиглах нэр."
      />
      <AccountInput
        label="Мерчант нэр"
        {...field("merchantName")}
        required
        placeholder="Жишээ: MGL_ESIM"
      />
      <AccountSelect
        label="Банк"
        value={config.bankCode || "050000"}
        onChange={(value) => onChange("bankCode", value)}
        required={isNew}
      >
        {BANK_OPTIONS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </AccountSelect>
      <AccountInput
        label="Дансны дугаар / IBAN"
        {...field("accountNumber")}
        required={isNew}
        spellCheck={false}
      />
      <AccountInput
        label="Регистр"
        {...field("registerNumber")}
        required={isNew}
      />
      <AccountInput
        label="Утас"
        {...field("phone")}
        type="tel"
        required={isNew}
        autoComplete="tel"
      />
      <div className="sm:col-span-2">
        <AccountInput
          label="И-мэйл"
          {...field("email")}
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
        />
      </div>
    </AccountFormSection>
  );
}
