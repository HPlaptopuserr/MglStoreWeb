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
  khorooId: "",
  building: "-",
  doorNo: "-",
  corporateFlag: "0",
  gender: "M",
  subCategoryId: "36",
};

export const FALLBACK_SYSTEMQR_CITIES: SystemQrCity[] = [
  {
    code: "20",
    name: "Улаанбаатар",
    districts: [{ code: "1", name: "Сонгинохайрхан" }],
  },
];

export function withCurrentOption<T extends { code: string; name: string }>(
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

export type SystemQrConfig = Partial<ContractPaymentAccount> & {
  enabled?: boolean;
  selectedAccountId?: string;
};

export const toSystemQrConfig = <T extends SystemQrConfig>(
  account: ContractPaymentAccount,
  previous: T = {} as T,
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
