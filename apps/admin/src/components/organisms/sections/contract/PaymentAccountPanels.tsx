"use client";

import { useState } from "react";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { FALLBACK_SYSTEMQR_CATEGORIES } from "@mgl/types";
import {
  PaymentAccountForm,
  AccountFeedback,
  type AccountNotice,
} from "./payment-account/PaymentAccountForm";

import {
  DEFAULT_SYSTEMQR_LOCATION,
  FALLBACK_SYSTEMQR_CITIES,
  getBankLabel,
  withCurrentOption,
  type ContractPaymentAccount,
  type SystemQrCity,
  type SystemQrCategory,
  type SystemQrKhoroo,
  type SystemQrConfig,
} from "./payment-account/payment-account.model";
export * from "./payment-account/payment-account.model";

type AccountSettings = {
  isPaid?: boolean;
  paymentAccounts?: ContractPaymentAccount[];
  systemQr?: SystemQrConfig;
};

type SharedAccountProps = {
  settings: AccountSettings;
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
  onNewAccount: () => void;
  connectingMinuAccount: boolean;
  checkingMinuAccounts?: boolean;
  checkMinuSubMerchants?: () => void;
  deletePaymentAccount: (accountId: string) => void;
  handleConnectMinuAccount: () => Promise<boolean>;
  notice?: AccountNotice | null;
  clearNotice?: () => void;
  onSystemQrCityChange?: (cityId: string) => void;
  onSystemQrDistrictChange?: (districtId: string) => void;
  systemQrCategories?: SystemQrCategory[];
  systemQrCities?: SystemQrCity[];
  systemQrKhoroos?: SystemQrKhoroo[];
  khoroosLoading?: boolean;
  khoroosError?: string;
  retryKhoroos?: () => void;
  updateSystemQr: (field: string, value: string | boolean) => void;
};

export function PaymentAccountsSettingsPanel({
  settings,
  onNewAccount,
  selectPaymentAccount,
  connectingMinuAccount,
  checkingMinuAccounts = false,
  checkMinuSubMerchants,
  deletePaymentAccount,
  handleConnectMinuAccount,
  notice = null,
  clearNotice,
  onSystemQrCityChange,
  onSystemQrDistrictChange,
  systemQrCategories = [],
  systemQrCities = [],
  systemQrKhoroos = [],
  khoroosLoading = false,
  khoroosError = "",
  retryKhoroos,
  updateSystemQr,
}: PaymentAccountsSettingsPanelProps) {
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<ContractPaymentAccount | null>(null);
  const accounts: ContractPaymentAccount[] = settings.paymentAccounts || [];
  const currentSubCategoryId = String(
    settings.systemQr?.subCategoryId || DEFAULT_SYSTEMQR_LOCATION.subCategoryId,
  );
  const currentCityId = String(
    settings.systemQr?.cityId || DEFAULT_SYSTEMQR_LOCATION.cityId,
  );
  const currentDistrictId = String(
    settings.systemQr?.districtId || DEFAULT_SYSTEMQR_LOCATION.districtId,
  );
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
            Төлбөр хүлээн авах дансуудаа холбож, үйлчилгээ бүрт ашиглах дансаа
            сонгоно уу.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onNewAccount();
            clearNotice?.();
            setShowAccountForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
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

      {!showAccountForm && notice && <AccountFeedback notice={notice} />}
      {showAccountForm && (
        <PaymentAccountForm
          config={settings.systemQr || {}}
          cities={cityOptions}
          districts={districtOptions}
          khoroos={systemQrKhoroos}
          categories={categoryOptions}
          khoroosLoading={khoroosLoading}
          khoroosError={khoroosError}
          retryKhoroos={retryKhoroos}
          connecting={connectingMinuAccount}
          checking={checkingMinuAccounts}
          notice={notice}
          onChange={updateSystemQr}
          onCityChange={handleCitySelectChange}
          onDistrictChange={handleDistrictSelectChange}
          onSubmit={handleConnectMinuAccount}
          onCheck={checkMinuSubMerchants}
          onClose={() => setShowAccountForm(false)}
          onClearNotice={clearNotice}
        />
      )}
    </div>
  );
}
