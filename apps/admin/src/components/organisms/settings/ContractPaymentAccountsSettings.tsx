"use client";

import { useEffect, useState } from "react";
import { API, adminFetch } from "@/lib/api";
import {
  CONTRACT_PAYMENT_ACCOUNTS_KEY,
  PaymentAccountsSettingsPanel,
  parseContractPaymentAccounts,
  toSystemQrConfig,
  type ContractPaymentAccount,
} from "../sections/contract/PaymentAccountPanels";

const defaultSystemQr = {
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
  cityId: "11000",
  districtId: "110400",
  khorooId: "15782385",
  building: "-",
  doorNo: "-",
  firstName: "",
  lastName: "",
  corporateFlag: "1",
  corporateName: "",
  gender: "M",
  subCategoryId: "36",
};

export function ContractPaymentAccountsSettings() {
  const [settings, setSettings] = useState<any>({
    paymentAccounts: [] as ContractPaymentAccount[],
    systemQr: defaultSystemQr,
  });
  const [connectingMinuAccount, setConnectingMinuAccount] = useState(false);

  useEffect(() => {
    adminFetch(`${API}/site-settings/admin`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: Record<string, string>) => {
        setSettings((prev: any) => ({
          ...prev,
          paymentAccounts: parseContractPaymentAccounts(data[CONTRACT_PAYMENT_ACCOUNTS_KEY]),
        }));
      })
      .catch(() => {});
  }, []);

  const persistPaymentAccounts = async (accounts: ContractPaymentAccount[]) => {
    const res = await adminFetch(`${API}/site-settings/${CONTRACT_PAYMENT_ACCOUNTS_KEY}`, {
      method: "PUT",
      body: JSON.stringify({ value: JSON.stringify(accounts) }),
    });

    if (!res.ok) {
      throw new Error("Дансны сан хадгалахад алдаа гарлаа");
    }
  };

  const updateSystemQr = (field: string, value: string | boolean) => {
    setSettings((prev: any) => ({
      ...prev,
      systemQr: {
        ...prev.systemQr,
        [field]: value,
      },
    }));
  };

  const selectPaymentAccount = (accountId: string) => {
    const account = (settings.paymentAccounts || []).find((item: ContractPaymentAccount) => item.id === accountId);
    if (!account) {
      updateSystemQr("selectedAccountId", "");
      return;
    }

    setSettings((prev: any) => ({
      ...prev,
      systemQr: toSystemQrConfig(account, prev.systemQr),
    }));
  };

  const upsertCurrentPaymentAccount = async (overrides: Partial<ContractPaymentAccount> = {}) => {
    const config = settings.systemQr || {};
    if (!config.merchantName || !config.accountNumber || !config.bankCode || !config.registerNumber || !config.phone || !config.merchantCode) {
      alert("Дансны санд хадгалахын тулд нэр, данс, банк, регистр, утас, merchant code бүрэн байх шаардлагатай");
      return null;
    }

    const existingId = config.selectedAccountId || overrides.id;
    const now = new Date().toISOString();
    const account: ContractPaymentAccount = {
      id: String(existingId || `account_${Date.now()}`),
      label: String(overrides.label || config.label || config.merchantName || "Minu данс").trim(),
      merchantName: String(overrides.merchantName || config.merchantName).trim(),
      merchantCode: String(overrides.merchantCode || config.merchantCode).trim(),
      username: String(overrides.username || config.username || config.merchantCode || "").trim(),
      password: String(overrides.password || config.password || "").trim(),
      bankCode: String(overrides.bankCode || config.bankCode || "050000").trim(),
      accountNumber: String(overrides.accountNumber || config.accountNumber).trim(),
      registerNumber: String(overrides.registerNumber || config.registerNumber).trim(),
      phone: String(overrides.phone || config.phone).trim(),
      email: String(overrides.email || config.email || "").trim(),
      createdAt: overrides.createdAt || now,
      updatedAt: now,
    };

    const currentAccounts: ContractPaymentAccount[] = Array.isArray(settings.paymentAccounts)
      ? settings.paymentAccounts
      : [];
    const nextAccounts = currentAccounts.some((item) => item.id === account.id)
      ? currentAccounts.map((item) => item.id === account.id ? { ...item, ...account, createdAt: item.createdAt || account.createdAt } : item)
      : [...currentAccounts, account];

    await persistPaymentAccounts(nextAccounts);
    setSettings((prev: any) => ({
      ...prev,
      paymentAccounts: nextAccounts,
      systemQr: toSystemQrConfig(account, prev.systemQr),
    }));

    return account;
  };

  const deletePaymentAccount = async (accountId: string) => {
    if (!confirm("Энэ дансыг сангаас устгах уу? Өмнө нь үүссэн гэрээний template доторх merchantCode хэвээр үлдэнэ.")) return;

    const nextAccounts = (settings.paymentAccounts || []).filter((item: ContractPaymentAccount) => item.id !== accountId);
    try {
      await persistPaymentAccounts(nextAccounts);
      setSettings((prev: any) => ({
        ...prev,
        paymentAccounts: nextAccounts,
        systemQr: prev.systemQr?.selectedAccountId === accountId
          ? { ...prev.systemQr, selectedAccountId: "" }
          : prev.systemQr,
      }));
    } catch (error) {
      console.error("delete payment account error", error);
      alert("Данс устгахад алдаа гарлаа");
    }
  };

  const handleConnectMinuAccount = async () => {
    const config = settings.systemQr || {};
    if (!config.merchantName || !config.accountNumber || !config.bankCode || !config.registerNumber || !config.phone) {
      alert("Данс холбохын тулд нэр, дансны дугаар, банк, регистр, утас бөглөнө үү");
      return;
    }

    setConnectingMinuAccount(true);
    try {
      const res = await adminFetch(`${API}/contracts/minu-dynamic-qr/register`, {
        method: "POST",
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Minu Dynamic QR данс холбох үед алдаа гарлаа");
        return;
      }

      await upsertCurrentPaymentAccount({
        merchantCode: data.merchantCode,
        username: data.username || data.merchantCode,
        password: data.password || config.password || "",
      });
      alert("Minu Dynamic QR данс холбогдлоо. Одоо гэрээний template дээр сонгож ашиглаж болно.");
    } catch (error) {
      console.error("connect minu account error", error);
      alert("Minu Dynamic QR данс холбох үед серверийн алдаа гарлаа");
    } finally {
      setConnectingMinuAccount(false);
    }
  };

  return (
    <PaymentAccountsSettingsPanel
      settings={settings}
      setSettings={setSettings}
      selectPaymentAccount={selectPaymentAccount}
      connectingMinuAccount={connectingMinuAccount}
      deletePaymentAccount={deletePaymentAccount}
      handleConnectMinuAccount={handleConnectMinuAccount}
      updateSystemQr={updateSystemQr}
      upsertCurrentPaymentAccount={upsertCurrentPaymentAccount}
    />
  );
}
