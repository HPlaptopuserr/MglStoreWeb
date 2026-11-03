"use client";
import { UserRound } from "lucide-react";
import {
  DEFAULT_SYSTEMQR_LOCATION,
  type SystemQrCategory,
} from "./payment-account.model";
import {
  AccountFormSection,
  AccountInput,
  AccountSelect,
  bindAccountFields,
  type AccountFieldProps,
} from "./AccountFormFields";

export function AccountOwnerSection({
  config,
  onChange,
  categories,
}: AccountFieldProps & { categories: SystemQrCategory[] }) {
  const field = bindAccountFields({ config, onChange });
  const corporate = config.corporateFlag === "1";
  return (
    <AccountFormSection
      title="Эзэмшигчийн мэдээлэл"
      description="Банканд бүртгэлтэй эзэмшигчийн мэдээлэлтэй ижил оруулна уу."
      icon={UserRound}
    >
      <AccountSelect
        label="Мерчант төрөл"
        value={config.corporateFlag || "0"}
        onChange={(value) => onChange("corporateFlag", value)}
        required
      >
        <option value="0">Хувь хүн</option>
        <option value="1">Байгууллага</option>
      </AccountSelect>
      {corporate ? (
        <AccountInput
          label="Байгууллагын нэр"
          {...field("corporateName")}
          required
        />
      ) : (
        <AccountSelect
          label="Хүйс"
          value={config.gender || "M"}
          onChange={(value) => onChange("gender", value)}
          required
        >
          <option value="M">Эрэгтэй</option>
          <option value="F">Эмэгтэй</option>
        </AccountSelect>
      )}
      <AccountInput
        label="Эзэмшигчийн овог"
        {...field("lastName")}
        required={!corporate}
        autoComplete="family-name"
      />
      <AccountInput
        label="Эзэмшигчийн нэр"
        {...field("firstName")}
        required={!corporate}
        autoComplete="given-name"
      />
      <div className="sm:col-span-2">
        <AccountSelect
          label="Үйл ажиллагааны чиглэл"
          value={
            config.subCategoryId || DEFAULT_SYSTEMQR_LOCATION.subCategoryId
          }
          onChange={(value) => onChange("subCategoryId", value)}
          required
        >
          {categories.map((item) => (
            <option key={item.code} value={item.code}>
              {item.categoryName
                ? `${item.categoryName} — ${item.name}`
                : item.name}
            </option>
          ))}
        </AccountSelect>
      </div>
    </AccountFormSection>
  );
}
