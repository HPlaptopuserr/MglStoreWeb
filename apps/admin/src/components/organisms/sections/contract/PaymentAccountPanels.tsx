"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Link as LinkIcon,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { FALLBACK_SYSTEMQR_CATEGORIES } from "@mgl/types";

export const CONTRACT_PAYMENT_ACCOUNTS_KEY = "contract-payment-accounts";

export type ContractPaymentAccount = {
  id: string;
  label: string;
  merchantName: string;
  merchantCode: string;
  username?: string;
  password?: string;
  bankCode: string;
  accountNumber: string;
  registerNumber: string;
  phone: string;
  email?: string;
  cityId?: string;
  districtId?: string;
  khorooId?: string;
  building?: string;
  doorNo?: string;
  firstName?: string;
  lastName?: string;
  corporateFlag?: string;
  corporateName?: string;
  gender?: string;
  subCategoryId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SystemQrDistrict = { code: string; name: string };
export type SystemQrCity = {
  code: string;
  name: string;
  districts?: SystemQrDistrict[];
};
export type SystemQrKhoroo = { code: string; name: string };
export type SystemQrCategory = {
  code: string;
  name: string;
  categoryCode?: string;
  categoryName?: string;
};

export const DEFAULT_SYSTEMQR_LOCATION = {
  cityId: "20",
  districtId: "1",
  khorooId: "15782385",
  building: "-",
  doorNo: "-",
  corporateFlag: "0",
  gender: "M",
  subCategoryId: "36",
};

const FALLBACK_SYSTEMQR_CITIES: SystemQrCity[] = [
  {
    code: "20",
    name: "Улаанбаатар",
    districts: [{ code: "1", name: "Сонгинохайрхан" }],
  },
];

const FALLBACK_SYSTEMQR_KHOROOS_BY_DISTRICT: Record<string, SystemQrKhoroo[]> =
  {
    "1": [{ code: "15782385", name: "1-р хороо" }],
  };

function withCurrentOption<T extends { code: string; name: string }>(
  options: T[],
  code: string,
  fallbackName: string,
): T[] {
  const currentCode = String(code || "").trim();
  if (!currentCode || options.some((option) => option.code === currentCode))
    return options;
  return [{ code: currentCode, name: fallbackName } as T, ...options];
}

export const BANK_OPTIONS = [
  { value: "050000", label: "Хаан банк" },
  { value: "150000", label: "Голомт банк" },
  { value: "040000", label: "TDB" },
  { value: "320000", label: "ХасБанк" },
  { value: "340000", label: "Төрийн банк" },
  { value: "010000", label: "Монголбанк" },
  { value: "300000", label: "Капитрон банк" },
  { value: "380000", label: "Богд банк" },
  { value: "290000", label: "Үндэсний хөрөнгө оруулалтын банк" },
];

export const parseContractPaymentAccounts = (
  raw?: string | null,
): ContractPaymentAccount[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getBankLabel = (bankCode?: string) =>
  BANK_OPTIONS.find((bank) => bank.value === bankCode)?.label ||
  bankCode ||
  "-";

export const toSystemQrConfig = (
  account: ContractPaymentAccount,
  previous: any = {},
) => ({
  ...previous,
  enabled: true,
  selectedAccountId: account.id,
  label: account.label || previous.label || "",
  merchantName: account.merchantName,
  merchantCode: account.merchantCode,
  username: account.username || "",
  password: account.password || "",
  bankCode: account.bankCode || "050000",
  accountNumber: account.accountNumber,
  registerNumber: account.registerNumber,
  phone: account.phone,
  email: account.email || "",
  cityId: account.cityId || previous.cityId || DEFAULT_SYSTEMQR_LOCATION.cityId,
  districtId:
    account.districtId ||
    previous.districtId ||
    DEFAULT_SYSTEMQR_LOCATION.districtId,
  khorooId:
    account.khorooId || previous.khorooId || DEFAULT_SYSTEMQR_LOCATION.khorooId,
  building:
    account.building || previous.building || DEFAULT_SYSTEMQR_LOCATION.building,
  doorNo: account.doorNo || previous.doorNo || DEFAULT_SYSTEMQR_LOCATION.doorNo,
  firstName: account.firstName || previous.firstName || "",
  lastName: account.lastName || previous.lastName || "",
  corporateFlag:
    account.corporateFlag ||
    previous.corporateFlag ||
    DEFAULT_SYSTEMQR_LOCATION.corporateFlag,
  corporateName:
    (account.corporateFlag ||
      previous.corporateFlag ||
      DEFAULT_SYSTEMQR_LOCATION.corporateFlag) === "1"
      ? account.corporateName || previous.corporateName || account.merchantName
      : account.corporateName || previous.corporateName || "",
  gender: account.gender || previous.gender || DEFAULT_SYSTEMQR_LOCATION.gender,
  subCategoryId:
    account.subCategoryId ||
    previous.subCategoryId ||
    DEFAULT_SYSTEMQR_LOCATION.subCategoryId,
});

type SharedAccountProps = {
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
  selectPaymentAccount: (accountId: string) => void;
};

export function ContractPaymentAccountSelect({
  settings,
  selectPaymentAccount,
}: SharedAccountProps) {
  if (!settings.isPaid) return null;

  const accounts: ContractPaymentAccount[] = settings.paymentAccounts || [];
  const selectedAccount = accounts.find(
    (account) => account.id === settings.systemQr?.selectedAccountId,
  );

  return (
    <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-amber-500" />
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Энэ гэрээнд ашиглах төлбөрийн данс
          </span>
        </div>
      </div>

      <select
        value={settings.systemQr?.selectedAccountId || ""}
        onChange={(event) => selectPaymentAccount(event.target.value)}
        className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        <option value="">Бүртгэгдсэн данс сонгоно уу</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.label || account.merchantName} ·{" "}
            {getBankLabel(account.bankCode)} {account.accountNumber} ·{" "}
            {account.merchantCode}
          </option>
        ))}
      </select>

      {accounts.length === 0 && (
        <p className="mt-2 text-xs font-semibold text-amber-700">
          Admin → Тохиргоо → Төлбөрийн данс хэсэгт эхлээд Minu Dynamic QR данс
          холбоно уу.
        </p>
      )}

      {selectedAccount && (
        <p className="mt-2 text-xs text-neutral-500">
          Сонгосон данс: {settings.systemQr?.merchantName} ·{" "}
          {getBankLabel(settings.systemQr?.bankCode)}{" "}
          {settings.systemQr?.accountNumber}
        </p>
      )}
    </div>
  );
}

type PaymentAccountsSettingsPanelProps = SharedAccountProps & {
  connectingMinuAccount: boolean;
  checkingMinuAccounts?: boolean;
  checkMinuSubMerchants?: () => void;
  deletePaymentAccount: (accountId: string) => void;
  handleConnectMinuAccount: () => void;
  onSystemQrCityChange?: (cityId: string) => void;
  onSystemQrDistrictChange?: (districtId: string) => void;
  systemQrCategories?: SystemQrCategory[];
  systemQrCities?: SystemQrCity[];
  systemQrKhoroos?: SystemQrKhoroo[];
  updateSystemQr: (field: string, value: string | boolean) => void;
  upsertCurrentPaymentAccount: (
    overrides?: Partial<ContractPaymentAccount>,
  ) => Promise<ContractPaymentAccount | null>;
};

export function PaymentAccountsSettingsPanel({
  settings,
  setSettings,
  selectPaymentAccount,
  connectingMinuAccount,
  checkingMinuAccounts = false,
  checkMinuSubMerchants,
  deletePaymentAccount,
  handleConnectMinuAccount,
  onSystemQrCityChange,
  onSystemQrDistrictChange,
  systemQrCategories = [],
  systemQrCities = [],
  systemQrKhoroos = [],
  updateSystemQr,
  upsertCurrentPaymentAccount,
}: PaymentAccountsSettingsPanelProps) {
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<ContractPaymentAccount | null>(null);
  const accounts: ContractPaymentAccount[] = settings.paymentAccounts || [];
  const selectClass =
    "px-3 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white";
  const currentSubCategoryId = String(
    settings.systemQr?.subCategoryId || DEFAULT_SYSTEMQR_LOCATION.subCategoryId,
  );
  const currentCityId = String(
    settings.systemQr?.cityId || DEFAULT_SYSTEMQR_LOCATION.cityId,
  );
  const currentDistrictId = String(
    settings.systemQr?.districtId || DEFAULT_SYSTEMQR_LOCATION.districtId,
  );
  const currentKhorooId = String(
    settings.systemQr?.khorooId || DEFAULT_SYSTEMQR_LOCATION.khorooId,
  );
  const isCorporateSystemQr =
    String(
      settings.systemQr?.corporateFlag ||
        DEFAULT_SYSTEMQR_LOCATION.corporateFlag,
    ) === "1";
  const categoryOptions = withCurrentOption(
    systemQrCategories.length > 0
      ? systemQrCategories
      : [...FALLBACK_SYSTEMQR_CATEGORIES],
    currentSubCategoryId,
    `Код ${currentSubCategoryId}`,
  );
  const cityOptions = withCurrentOption(
    systemQrCities.length > 0 ? systemQrCities : FALLBACK_SYSTEMQR_CITIES,
    currentCityId,
    `Код ${currentCityId}`,
  );
  const selectedCity = cityOptions.find((city) => city.code === currentCityId);
  const districtOptions = withCurrentOption(
    selectedCity?.districts || [],
    currentDistrictId,
    `Код ${currentDistrictId}`,
  );
  const khorooOptions = withCurrentOption(
    systemQrKhoroos.length > 0
      ? systemQrKhoroos
      : FALLBACK_SYSTEMQR_KHOROOS_BY_DISTRICT[currentDistrictId] || [],
    currentKhorooId,
    `Код ${currentKhorooId}`,
  );

  const handleCitySelectChange = (cityId: string) => {
    if (
      onSystemQrCityChange &&
      systemQrCities.some((city) => city.code === cityId)
    ) {
      onSystemQrCityChange(cityId);
      return;
    }

    const city = cityOptions.find((item) => item.code === cityId);
    updateSystemQr("cityId", cityId);
    updateSystemQr("districtId", city?.districts?.[0]?.code || "");
    updateSystemQr("khorooId", "");
  };

  const handleDistrictSelectChange = (districtId: string) => {
    if (onSystemQrDistrictChange) {
      onSystemQrDistrictChange(districtId);
      return;
    }

    updateSystemQr("districtId", districtId);
    updateSystemQr("khorooId", "");
  };

  const confirmDeletePaymentAccount = () => {
    if (!deleteTarget) return;
    deletePaymentAccount(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 border-b border-neutral-100 bg-neutral-50/20">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="font-medium text-neutral-800">
            Minu Dynamic QR дансны сан
          </div>
          <div className="text-sm text-neutral-500 mt-0.5">
            Гэрээний төлбөр авах A/B/C дансаа энд бүртгээд, дараа нь "Төлбөр &
            Хугацаа" хэсгээс сонгоно.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setSettings((prev: any) => ({
              ...prev,
              systemQr: {
                ...prev.systemQr,
                enabled: true,
                selectedAccountId: "",
                label: "",
                merchantName: "",
                accountNumber: "",
                bankCode: "050000",
                registerNumber: "",
                phone: "",
                email: "",
                merchantCode: "",
                username: "",
                password: "",
                ...DEFAULT_SYSTEMQR_LOCATION,
                firstName: "",
                lastName: "",
                corporateName: "",
              },
            }));
            setShowAccountForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
        >
          <Plus className="h-4 w-4" />
          Шинэ данс
        </button>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            Холбосон дансууд
          </p>
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500">
            {accounts.length} данс
          </span>
        </div>

        {accounts.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {accounts.map((account) => {
              const selected =
                settings.systemQr?.selectedAccountId === account.id;
              return (
                <div
                  key={account.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                    selected
                      ? "border-amber-300 bg-amber-50"
                      : "border-neutral-200 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      selectPaymentAccount(account.id);
                      setShowAccountForm(false);
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-neutral-800">
                        {account.label || account.merchantName}
                      </span>
                      {selected && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-600" />
                      )}
                    </div>
                    <p className="truncate text-xs text-neutral-500">
                      {getBankLabel(account.bankCode)} {account.accountNumber} ·{" "}
                      {account.merchantCode}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(account)}
                    className="rounded-md border border-red-100 p-2 text-red-500 hover:bg-red-50"
                    aria-label="Данс устгах"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-6 text-center">
            <p className="text-sm font-semibold text-neutral-700">
              Одоогоор холбосон данс алга
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Шинэ данс дарж Minu Dynamic QR дансаа нэг удаа бүртгээд гэрээ,
              төсөл, гишүүнчлэл дээр dropdown-оор сонгоно.
            </p>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-payment-account-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3
                  id="delete-payment-account-title"
                  className="text-base font-bold text-neutral-900"
                >
                  Данс устгахдаа итгэлтэй байна уу?
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  "{deleteTarget.label || deleteTarget.merchantName}" дансыг
                  устгавал төлбөрийн дансны жагсаалтаас хасагдана.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Болих
              </button>
              <button
                type="button"
                onClick={confirmDeletePaymentAccount}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Устгах
              </button>
            </div>
          </div>
        </div>
      )}

      {showAccountForm && (
        <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-neutral-900">
                Шинэ төлбөрийн данс бүртгэх
              </p>
              <p className="text-xs text-neutral-500">
                Энэ form зөвхөн шинэ Minu Dynamic QR данс холбоход ашиглагдана.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAccountForm(false)}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              Хаах
            </button>
          </div>
          <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Шинээр холбох үед Merchant Code-г хоосон үлдээнэ. Minu амжилттай
            бүртгэвэл код автоматаар бөглөгдөнө. Аль хэдийн Minu-ээс авсан код
            байгаа бол merchantCode-оо оруулаад хадгалах үед Minu дээр яг таарч
            байгаа эсэхийг шалгана. Invoice үүсгэхдээ SystemQR master тохиргоог
            ашиглана.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <AccountInput
              label="Дансны сан дахь нэр"
              value={settings.systemQr?.label || ""}
              onChange={(value) => updateSystemQr("label", value)}
              placeholder="Жишээ: A данс - 1 саяын гэрээ"
            />
            <AccountInput
              label="Данс / мерчант нэр *"
              value={settings.systemQr?.merchantName || ""}
              onChange={(value) => updateSystemQr("merchantName", value)}
              placeholder="Жишээ: MGL Store гэрээ"
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500 pl-1">
                Банк *
              </label>
              <select
                value={settings.systemQr?.bankCode || "050000"}
                onChange={(event) =>
                  updateSystemQr("bankCode", event.target.value)
                }
                className={selectClass}
              >
                {BANK_OPTIONS.map((bank) => (
                  <option key={bank.value} value={bank.value}>
                    {bank.label}
                  </option>
                ))}
              </select>
            </div>

            <AccountInput
              label="Дансны дугаар *"
              value={settings.systemQr?.accountNumber || ""}
              onChange={(value) => updateSystemQr("accountNumber", value)}
            />
            <AccountInput
              label="Регистр *"
              value={settings.systemQr?.registerNumber || ""}
              onChange={(value) => updateSystemQr("registerNumber", value)}
            />
            <AccountInput
              label="Утас *"
              value={settings.systemQr?.phone || ""}
              onChange={(value) => updateSystemQr("phone", value)}
            />
            <AccountInput
              label="И-мэйл"
              type="email"
              value={settings.systemQr?.email || ""}
              onChange={(value) => updateSystemQr("email", value)}
            />
            <AccountInput
              label="Merchant Code / Sub-merchant code"
              value={settings.systemQr?.merchantCode || ""}
              onChange={(value) => updateSystemQr("merchantCode", value)}
              placeholder="Шинэ бүртгэл хийх бол хоосон үлдээнэ"
              description="Регистр/дансны дугаар биш. Шинэ subMerchant бүртгэх бол хоосон үлдээнэ, Minu-ээс авсан код байгаа бол шалгагдаж байж хадгалагдана."
            />
            <div className="md:col-span-3 mt-1 grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-neutral-100 pt-3">
              <AccountInput
                label={
                  isCorporateSystemQr ? "Эзэмшигчийн нэр" : "Эзэмшигчийн нэр *"
                }
                value={settings.systemQr?.firstName || ""}
                onChange={(value) => updateSystemQr("firstName", value)}
              />
              <AccountInput
                label={
                  isCorporateSystemQr
                    ? "Эзэмшигчийн овог"
                    : "Эзэмшигчийн овог *"
                }
                value={settings.systemQr?.lastName || ""}
                onChange={(value) => updateSystemQr("lastName", value)}
              />

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-500 pl-1">
                  Мерчант төрөл *
                </label>
                <select
                  value={
                    settings.systemQr?.corporateFlag ||
                    DEFAULT_SYSTEMQR_LOCATION.corporateFlag
                  }
                  onChange={(event) =>
                    updateSystemQr("corporateFlag", event.target.value)
                  }
                  className={selectClass}
                >
                  <option value="0">Хувь хүн</option>
                  <option value="1">Байгууллага</option>
                </select>
              </div>

              <AccountInput
                label="Байгууллагын нэр"
                value={settings.systemQr?.corporateName || ""}
                onChange={(value) => updateSystemQr("corporateName", value)}
              />

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-500 pl-1">
                  Хүйс *
                </label>
                <select
                  value={
                    settings.systemQr?.gender ||
                    DEFAULT_SYSTEMQR_LOCATION.gender
                  }
                  onChange={(event) =>
                    updateSystemQr("gender", event.target.value)
                  }
                  className={selectClass}
                >
                  <option value="M">Эрэгтэй</option>
                  <option value="F">Эмэгтэй</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-500 pl-1">
                  Үйл ажиллагааны чиглэл *
                </label>
                <select
                  value={currentSubCategoryId}
                  onChange={(event) =>
                    updateSystemQr("subCategoryId", event.target.value)
                  }
                  className={selectClass}
                >
                  {categoryOptions.map((category) => (
                    <option key={category.code} value={category.code}>
                      {category.categoryName
                        ? `${category.categoryName} - ${category.name}`
                        : category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-500 pl-1">
                  Аймаг/Хот *
                </label>
                <select
                  value={currentCityId}
                  onChange={(event) =>
                    handleCitySelectChange(event.target.value)
                  }
                  className={selectClass}
                >
                  {cityOptions.map((city) => (
                    <option key={city.code} value={city.code}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-500 pl-1">
                  Дүүрэг/Сум *
                </label>
                <select
                  value={currentDistrictId}
                  onChange={(event) =>
                    handleDistrictSelectChange(event.target.value)
                  }
                  className={selectClass}
                >
                  {districtOptions.map((district) => (
                    <option key={district.code} value={district.code}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-500 pl-1">
                  Хороо/Баг *
                </label>
                <select
                  value={currentKhorooId}
                  onChange={(event) =>
                    updateSystemQr("khorooId", event.target.value)
                  }
                  className={selectClass}
                >
                  {khorooOptions.map((khoroo) => (
                    <option key={khoroo.code} value={khoroo.code}>
                      {khoroo.name}
                    </option>
                  ))}
                </select>
              </div>

              <AccountInput
                label="Байр/Хашаа *"
                value={
                  settings.systemQr?.building ||
                  DEFAULT_SYSTEMQR_LOCATION.building
                }
                onChange={(value) => updateSystemQr("building", value)}
              />
              <AccountInput
                label="Тоот *"
                value={
                  settings.systemQr?.doorNo || DEFAULT_SYSTEMQR_LOCATION.doorNo
                }
                onChange={(value) => updateSystemQr("doorNo", value)}
              />
            </div>

            <div className="md:col-span-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleConnectMinuAccount}
                disabled={connectingMinuAccount}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
              >
                {connectingMinuAccount ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Minu данс холбох
              </button>
              {checkMinuSubMerchants && (
                <button
                  type="button"
                  onClick={checkMinuSubMerchants}
                  disabled={checkingMinuAccounts}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-300 text-neutral-700 rounded-lg text-sm font-semibold hover:bg-neutral-100 disabled:opacity-50"
                >
                  {checkingMinuAccounts ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Бүртгэл шалгах
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  upsertCurrentPaymentAccount().then((account) => {
                    if (!account) return;
                    alert("Дансны санд хадгалагдлаа");
                    setShowAccountForm(false);
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-300 text-neutral-700 rounded-lg text-sm font-semibold hover:bg-neutral-100"
              >
                <LinkIcon className="w-4 h-4" />
                Дансны санд хадгалах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountInput({
  description,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  description?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-neutral-500 pl-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="px-3 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      {description && (
        <p className="text-[11px] leading-snug text-neutral-500 pl-1">
          {description}
        </p>
      )}
    </div>
  );
}
