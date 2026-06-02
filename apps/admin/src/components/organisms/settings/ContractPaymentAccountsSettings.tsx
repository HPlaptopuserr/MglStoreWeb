"use client";

import { useEffect, useState } from "react";
import { API, adminFetch } from "@/lib/api";
import {
  CONTRACT_PAYMENT_ACCOUNTS_KEY,
  DEFAULT_SYSTEMQR_LOCATION,
  PaymentAccountsSettingsPanel,
  parseContractPaymentAccounts,
  toSystemQrConfig,
  type ContractPaymentAccount,
  type SystemQrCategory,
  type SystemQrCity,
  type SystemQrKhoroo,
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
  ...DEFAULT_SYSTEMQR_LOCATION,
  firstName: "",
  lastName: "",
  corporateName: "",
};

export function ContractPaymentAccountsSettings() {
  const [settings, setSettings] = useState<any>({
    paymentAccounts: [] as ContractPaymentAccount[],
    systemQr: defaultSystemQr,
  });
  const [connectingMinuAccount, setConnectingMinuAccount] = useState(false);
  const [checkingMinuAccounts, setCheckingMinuAccounts] = useState(false);
  const [systemQrCities, setSystemQrCities] = useState<SystemQrCity[]>([]);
  const [systemQrKhoroos, setSystemQrKhoroos] = useState<SystemQrKhoroo[]>([]);
  const [systemQrCategories, setSystemQrCategories] = useState<SystemQrCategory[]>([]);

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

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      adminFetch(`${API}/vendor/merchant/systemqr/cities`).then((res) => (res.ok ? res.json() : { cities: [] })),
      adminFetch(`${API}/vendor/merchant/systemqr/categories`).then((res) => (res.ok ? res.json() : { categories: [] })),
    ])
      .then(([cityData, categoryData]) => {
        if (cancelled) return;
        const categories = Array.isArray(categoryData.categories) ? categoryData.categories : [];
        setSystemQrCities(Array.isArray(cityData.cities) ? cityData.cities : []);
        setSystemQrCategories(categories);
        setSettings((prev: any) => {
          const current = String(prev.systemQr?.subCategoryId || DEFAULT_SYSTEMQR_LOCATION.subCategoryId);
          if (categories.length === 0 || categories.some((item: SystemQrCategory) => item.code === current)) return prev;
          const fallback = categories.find((item: SystemQrCategory) => item.code === DEFAULT_SYSTEMQR_LOCATION.subCategoryId) || categories[0];
          return {
            ...prev,
            systemQr: {
              ...prev.systemQr,
              subCategoryId: fallback.code,
            },
          };
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSystemQrCities([]);
          setSystemQrCategories([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const districtId = String(settings.systemQr?.districtId || DEFAULT_SYSTEMQR_LOCATION.districtId).trim();
    if (!districtId) return;

    let cancelled = false;
    adminFetch(`${API}/vendor/merchant/systemqr/khoroo/${encodeURIComponent(districtId)}`)
      .then((res) => (res.ok ? res.json() : { khoroos: [] }))
      .then((data) => {
        if (!cancelled) setSystemQrKhoroos(Array.isArray(data.khoroos) ? data.khoroos : []);
      })
      .catch(() => {
        if (!cancelled) setSystemQrKhoroos([]);
      });

    return () => {
      cancelled = true;
    };
  }, [settings.systemQr?.districtId]);

  useEffect(() => {
    if (systemQrCities.length === 0) return;

    setSettings((prev: any) => {
      const current = prev.systemQr || {};
      const rawCityId = current.cityId === "11000" ? DEFAULT_SYSTEMQR_LOCATION.cityId : current.cityId;
      const city = systemQrCities.find((item) => item.code === rawCityId)
        || systemQrCities.find((item) => item.code === DEFAULT_SYSTEMQR_LOCATION.cityId)
        || systemQrCities[0];
      const districts = city?.districts || [];
      const rawDistrictId = current.districtId === "110400" ? DEFAULT_SYSTEMQR_LOCATION.districtId : current.districtId;
      const district = districts.find((item) => item.code === rawDistrictId) || districts[0];
      const nextCityId = city?.code || DEFAULT_SYSTEMQR_LOCATION.cityId;
      const nextDistrictId = district?.code || rawDistrictId || DEFAULT_SYSTEMQR_LOCATION.districtId;

      if (current.cityId === nextCityId && current.districtId === nextDistrictId) return prev;

      return {
        ...prev,
        systemQr: {
          ...current,
          cityId: nextCityId,
          districtId: nextDistrictId,
          khorooId: current.districtId === nextDistrictId ? current.khorooId : "",
        },
      };
    });
  }, [systemQrCities]);

  useEffect(() => {
    if (systemQrKhoroos.length === 0) return;

    setSettings((prev: any) => {
      const current = prev.systemQr || {};
      if (systemQrKhoroos.some((item) => item.code === current.khorooId)) return prev;

      return {
        ...prev,
        systemQr: {
          ...current,
          khorooId: systemQrKhoroos[0].code,
        },
      };
    });
  }, [systemQrKhoroos]);

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

  const handleSystemQrCityChange = (cityId: string) => {
    const city = systemQrCities.find((item) => item.code === cityId);
    const districtId = city?.districts?.[0]?.code || "";

    setSettings((prev: any) => ({
      ...prev,
      systemQr: {
        ...prev.systemQr,
        cityId,
        districtId,
        khorooId: "",
      },
    }));
  };

  const handleSystemQrDistrictChange = (districtId: string) => {
    setSettings((prev: any) => ({
      ...prev,
      systemQr: {
        ...prev.systemQr,
        districtId,
        khorooId: "",
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
    const nextMerchantName = String(overrides.merchantName || config.merchantName || "").trim();
    const nextMerchantCode = String(overrides.merchantCode || config.merchantCode || "").trim();
    if (!nextMerchantName || !nextMerchantCode) {
      alert("Дансны санд хадгалахын тулд мерчант нэр болон merchant code шаардлагатай");
      return null;
    }
    const nextUsername = String(overrides.username !== undefined ? overrides.username : config.username || nextMerchantCode).trim() || nextMerchantCode;
    const nextPassword = String(overrides.password !== undefined ? overrides.password : config.password || "").trim();

    const existingId = config.selectedAccountId || overrides.id;
    const now = new Date().toISOString();
    const accountCorporateFlag = String(overrides.corporateFlag || config.corporateFlag || DEFAULT_SYSTEMQR_LOCATION.corporateFlag).trim();
    const account: ContractPaymentAccount = {
      id: String(existingId || `account_${Date.now()}`),
      label: String(overrides.label || config.label || nextMerchantName || "Minu данс").trim(),
      merchantName: nextMerchantName,
      merchantCode: nextMerchantCode,
      username: nextUsername,
      password: nextPassword,
      bankCode: String(overrides.bankCode || config.bankCode || "050000").trim(),
      accountNumber: String(overrides.accountNumber || config.accountNumber).trim(),
      registerNumber: String(overrides.registerNumber || config.registerNumber).trim(),
      phone: String(overrides.phone || config.phone).trim(),
      email: String(overrides.email || config.email || "").trim(),
      cityId: String(overrides.cityId || config.cityId || DEFAULT_SYSTEMQR_LOCATION.cityId).trim(),
      districtId: String(overrides.districtId || config.districtId || DEFAULT_SYSTEMQR_LOCATION.districtId).trim(),
      khorooId: String(overrides.khorooId || config.khorooId || DEFAULT_SYSTEMQR_LOCATION.khorooId).trim(),
      building: String(overrides.building || config.building || DEFAULT_SYSTEMQR_LOCATION.building).trim(),
      doorNo: String(overrides.doorNo || config.doorNo || DEFAULT_SYSTEMQR_LOCATION.doorNo).trim(),
      firstName: String(overrides.firstName || config.firstName || "").trim(),
      lastName: String(overrides.lastName || config.lastName || "").trim(),
      corporateFlag: accountCorporateFlag,
      corporateName: accountCorporateFlag === "1"
        ? String(overrides.corporateName || config.corporateName || config.merchantName || "").trim()
        : String(overrides.corporateName || config.corporateName || "").trim(),
      gender: String(overrides.gender || config.gender || DEFAULT_SYSTEMQR_LOCATION.gender).trim(),
      subCategoryId: String(overrides.subCategoryId || config.subCategoryId || DEFAULT_SYSTEMQR_LOCATION.subCategoryId).trim(),
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

  const withSystemQrDefaults = (config: any) => ({
    ...config,
    cityId: String(config.cityId || DEFAULT_SYSTEMQR_LOCATION.cityId).trim(),
    districtId: String(config.districtId || DEFAULT_SYSTEMQR_LOCATION.districtId).trim(),
    khorooId: String(config.khorooId || DEFAULT_SYSTEMQR_LOCATION.khorooId).trim(),
    building: String(config.building || DEFAULT_SYSTEMQR_LOCATION.building).trim(),
    doorNo: String(config.doorNo || DEFAULT_SYSTEMQR_LOCATION.doorNo).trim(),
    corporateFlag: String(config.corporateFlag || DEFAULT_SYSTEMQR_LOCATION.corporateFlag).trim(),
    gender: String(config.gender || DEFAULT_SYSTEMQR_LOCATION.gender).trim(),
    subCategoryId: String(config.subCategoryId || DEFAULT_SYSTEMQR_LOCATION.subCategoryId).trim(),
  });

  const handleConnectMinuAccount = async () => {
    const config = withSystemQrDefaults(settings.systemQr || {});
    if (config.merchantName && config.merchantCode) {
      const account = await upsertCurrentPaymentAccount();
      if (account) alert("Minu merchant code дансны санд хадгалагдлаа.");
      return;
    }

    if (config.merchantName && !config.merchantCode) {
      setConnectingMinuAccount(true);
      try {
        const res = await adminFetch(`${API}/contracts/minu-dynamic-qr/register`, {
          method: "POST",
          body: JSON.stringify({ merchantName: config.merchantName }),
        });
        const data = await res.json();
        if (data.success && data.merchantCode) {
          await upsertCurrentPaymentAccount({
            merchantName: data.merchantName || config.merchantName,
            merchantCode: data.merchantCode,
            username: data.password ? data.username || "" : "",
            password: data.password || "",
          });
          alert(data.message || "Minu дээр бүртгэлтэй merchant code-г авч хадгаллаа.");
          return;
        }
      } catch {
        // Continue to full registration validation below.
      } finally {
        setConnectingMinuAccount(false);
      }
    }

    if (
      !config.merchantName ||
      !config.accountNumber ||
      !config.bankCode ||
      !config.registerNumber ||
      !config.phone ||
      !config.cityId ||
      !config.districtId ||
      !config.khorooId ||
      !config.building ||
      !config.doorNo ||
      !config.firstName ||
      !config.lastName ||
      !config.subCategoryId
    ) {
      alert("Minu данс холбохын тулд мерчант, данс, регистр, утас, эзэмшигч, хаяг, үйл ажиллагааны чиглэлээ бүрэн бөглөнө үү");
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
        username: data.password ? data.username || data.merchantCode : "",
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

  const checkMinuSubMerchants = async () => {
    const query = String(settings.systemQr?.merchantName || settings.systemQr?.merchantCode || "").trim();
    if (!query) {
      alert("Шалгахын тулд мерчант нэр эсвэл Merchant Code оруулна уу");
      return;
    }

    setCheckingMinuAccounts(true);
    try {
      const res = await adminFetch(`${API}/contracts/minu-dynamic-qr/sub-merchants?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Minu бүртгэл шалгахад алдаа гарлаа");
        return;
      }

      const rows = Array.isArray(data.subMerchants) ? data.subMerchants : [];
      if (rows.length === 0) {
        alert(`"${query}" нэр/code-той бүртгэл олдсонгүй`);
        return;
      }

      alert(rows.slice(0, 5).map((item: any) =>
        `${item.merchantName || "-"} — ${item.merchantCode || "-"}`
      ).join("\n"));
    } catch (error) {
      console.error("check minu sub merchants error", error);
      alert("Minu бүртгэл шалгахад серверийн алдаа гарлаа");
    } finally {
      setCheckingMinuAccounts(false);
    }
  };

  return (
    <PaymentAccountsSettingsPanel
      settings={settings}
      setSettings={setSettings}
      selectPaymentAccount={selectPaymentAccount}
      connectingMinuAccount={connectingMinuAccount}
      checkingMinuAccounts={checkingMinuAccounts}
      checkMinuSubMerchants={checkMinuSubMerchants}
      deletePaymentAccount={deletePaymentAccount}
      handleConnectMinuAccount={handleConnectMinuAccount}
      onSystemQrCityChange={handleSystemQrCityChange}
      onSystemQrDistrictChange={handleSystemQrDistrictChange}
      systemQrCategories={systemQrCategories}
      systemQrCities={systemQrCities}
      systemQrKhoroos={systemQrKhoroos}
      updateSystemQr={updateSystemQr}
      upsertCurrentPaymentAccount={upsertCurrentPaymentAccount}
    />
  );
}
