"use client";
import { MapPin } from "lucide-react";
import {
  DEFAULT_SYSTEMQR_LOCATION,
  type SystemQrCity,
  type SystemQrDistrict,
  type SystemQrKhoroo,
} from "./payment-account.model";
import {
  AccountFormSection,
  AccountInput,
  AccountSelect,
  bindAccountFields,
  type AccountFieldProps,
} from "./AccountFormFields";

export function AccountLocationSection({
  config,
  onChange,
  cities,
  districts,
  khoroos,
  khoroosLoading,
  khoroosError,
  retryKhoroos,
  onCityChange,
  onDistrictChange,
}: AccountFieldProps & {
  cities: SystemQrCity[];
  districts: SystemQrDistrict[];
  khoroos: SystemQrKhoroo[];
  khoroosLoading: boolean;
  khoroosError: string;
  retryKhoroos?: () => void;
  onCityChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
}) {
  const field = bindAccountFields({ config, onChange });
  const cityId = config.cityId || DEFAULT_SYSTEMQR_LOCATION.cityId;
  const districtId = config.districtId || DEFAULT_SYSTEMQR_LOCATION.districtId;
  const khorooId = khoroos.some((item) => item.code === config.khorooId)
    ? (config.khorooId ?? "")
    : "";
  return (
    <AccountFormSection
      title="Үйл ажиллагааны хаяг"
      description="Хот, дүүргээ сонгосны дараа Minu-ийн жагсаалтаас хороо/багаа сонгоно уу."
      icon={MapPin}
    >
      <AccountSelect
        label="Аймаг / Хот"
        value={cityId}
        onChange={onCityChange}
        required
      >
        {cities.map((item) => (
          <option key={item.code} value={item.code}>
            {item.name}
          </option>
        ))}
      </AccountSelect>
      <AccountSelect
        label="Дүүрэг / Сум"
        value={districtId}
        onChange={onDistrictChange}
        required
      >
        {districts.map((item) => (
          <option key={item.code} value={item.code}>
            {item.name}
          </option>
        ))}
      </AccountSelect>
      <div className="sm:col-span-2">
        <AccountSelect
          label="Хороо / Баг"
          value={khorooId}
          onChange={(value) => onChange("khorooId", value)}
          required
          disabled={khoroosLoading || !khoroos.length}
        >
          <option value="">
            {khoroosLoading
              ? "Жагсаалт ачаалж байна…"
              : "Хороо / багаа сонгоно уу"}
          </option>
          {khoroos.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </AccountSelect>
        {khoroosError && (
          <p role="alert" className="mt-2 text-xs leading-relaxed text-red-600">
            {khoroosError}{" "}
            {retryKhoroos && (
              <button
                type="button"
                onClick={retryKhoroos}
                className="font-semibold underline underline-offset-2 hover:text-red-800"
              >
                Дахин ачаалах
              </button>
            )}
          </p>
        )}
      </div>
      <AccountInput label="Байр / Хашаа" {...field("building")} required />
      <AccountInput label="Тоот" {...field("doorNo")} required />
    </AccountFormSection>
  );
}
