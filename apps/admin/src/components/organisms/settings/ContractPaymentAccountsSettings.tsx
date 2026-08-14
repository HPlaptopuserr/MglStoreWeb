"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2, Save, ShieldCheck } from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import {
  CONTRACT_PAYMENT_ACCOUNTS_KEY,
  DEFAULT_SYSTEMQR_LOCATION,
  PaymentAccountsSettingsPanel,
  getBankLabel,
  parseContractPaymentAccounts,
  toSystemQrConfig,
  type ContractPaymentAccount,
  type SystemQrCategory,
  type SystemQrCity,
  type SystemQrKhoroo,
} from "../sections/contract/PaymentAccountPanels";

const PRO_UPGRADE_PAYMENT_ACCOUNT_KEY = "pro-upgrade-payment-account";

const readUpgradePaymentAccountId = (raw?: string | null) => {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.accountId === "string"
      ? parsed.accountId.trim()
      : "";
  } catch {
    return "";
  }
};

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

const MANUAL_SYSTEMQR_CODE_ERROR =
  'Merchant Code/Sub-merchant code-г гараар хадгалахын өмнө Minu дээр шалгагдсан байх ёстой. Регистр эсвэл дансны дугаар оруулахгүй. Шинээр бүртгэх бол энэ талбарыг хоосон үлдээгээд "Minu данс холбох" дарна уу.';

type PaymentAccountUpsertOptions = {
  trustedMerchantCode?: boolean;
};

export function ContractPaymentAccountsSettings() {
  const [settings, setSettings] = useState<any>({
    paymentAccounts: [] as ContractPaymentAccount[],
    systemQr: defaultSystemQr,
  });
  const [connectingMinuAccount, setConnectingMinuAccount] = useState(false);
  const [checkingMinuAccounts, setCheckingMinuAccounts] = useState(false);
  const [upgradePaymentAccountId, setUpgradePaymentAccountId] = useState("");
  const [savingUpgradeAccount, setSavingUpgradeAccount] = useState(false);
  const [upgradeAccountSaved, setUpgradeAccountSaved] = useState(false);
  const [systemQrCities, setSystemQrCities] = useState<SystemQrCity[]>([]);
  const [systemQrKhoroos, setSystemQrKhoroos] = useState<SystemQrKhoroo[]>([]);
  const [systemQrCategories, setSystemQrCategories] = useState<SystemQrCategory[]>([]);

  useEffect(() => {
    adminFetch(`${API}/site-settings/admin`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: Record<string, string>) => {
        const paymentAccounts = parseContractPaymentAccounts(
          data[CONTRACT_PAYMENT_ACCOUNTS_KEY],
        );
        const savedUpgradeAccountId = readUpgradePaymentAccountId(
          data[PRO_UPGRADE_PAYMENT_ACCOUNT_KEY],
        );
        setUpgradePaymentAccountId(savedUpgradeAccountId);
        setUpgradeAccountSaved(
          Boolean(
            savedUpgradeAccountId &&
              paymentAccounts.some(
                (account) => account.id === savedUpgradeAccountId,
              ),
          ),
        );
        setSettings((prev: any) => ({
          ...prev,
          paymentAccounts,
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

  const persistUpgradePaymentAccount = async (accountId: string) => {
    const account = (settings.paymentAccounts || []).find(
      (item: ContractPaymentAccount) => item.id === accountId,
    );
    if (accountId && !account?.merchantCode) {
      throw new Error("Сонгосон Minu дансны merchantCode дутуу байна");
    }

    const res = await adminFetch(
      `${API}/site-settings/${PRO_UPGRADE_PAYMENT_ACCOUNT_KEY}`,
      {
        method: "PUT",
        body: JSON.stringify({
          value: JSON.stringify({
            accountId: account?.id || "",
            merchantCode: account?.merchantCode || "",
            updatedAt: new Date().toISOString(),
          }),
        }),
      },
    );
    if (!res.ok) {
      throw new Error("Pro Upgrade төлбөрийн данс хадгалахад алдаа гарлаа");
    }
  };

  const saveUpgradePaymentAccount = async () => {
    setSavingUpgradeAccount(true);
    setUpgradeAccountSaved(false);
    try {
      await persistUpgradePaymentAccount(upgradePaymentAccountId);
      setUpgradeAccountSaved(true);
    } catch (error) {
      console.error("save Pro Upgrade payment account error", error);
      alert(
        error instanceof Error
          ? error.message
          : "Pro Upgrade төлбөрийн данс хадгалахад алдаа гарлаа",
      );
    } finally {
      setSavingUpgradeAccount(false);
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

  const findExactMinuSubMerchant = async (merchantCode: string) => {
    const expectedCode = String(merchantCode || "").trim().toLowerCase();
    if (!expectedCode) return null;

    const res = await adminFetch(`${API}/contracts/minu-dynamic-qr/sub-merchants?query=${encodeURIComponent(merchantCode)}`);
    const data = await res.json();
    if (!data.success || data.fallback) return null;

    const rows = Array.isArray(data.subMerchants) ? data.subMerchants : [];
    return rows.find((item: any) =>
      String(item.merchantCode || "").trim().toLowerCase() === expectedCode
    ) || null;
  };

  const upsertCurrentPaymentAccount = async (
    overrides: Partial<ContractPaymentAccount> = {},
    options: PaymentAccountUpsertOptions = {},
  ) => {
    const config = settings.systemQr || {};
    let nextMerchantName = String(overrides.merchantName || config.merchantName || "").trim();
    let nextMerchantCode = String(overrides.merchantCode || config.merchantCode || "").trim();
    if (!nextMerchantName || !nextMerchantCode) {
      alert("Дансны санд хадгалахын тулд мерчант нэр болон merchant code шаардлагатай");
      return null;
    }

    let verifiedSubMerchant: any = null;
    if (!options.trustedMerchantCode) {
      verifiedSubMerchant = await findExactMinuSubMerchant(nextMerchantCode).catch(() => null);
      if (!verifiedSubMerchant?.merchantCode) {
        alert(MANUAL_SYSTEMQR_CODE_ERROR);
        return null;
      }

      nextMerchantName = String(verifiedSubMerchant.merchantName || nextMerchantName).trim();
      nextMerchantCode = String(verifiedSubMerchant.merchantCode || nextMerchantCode).trim();
    }

    const existingId = config.selectedAccountId || overrides.id;
    const now = new Date().toISOString();
    const accountCorporateFlag = String(overrides.corporateFlag || config.corporateFlag || DEFAULT_SYSTEMQR_LOCATION.corporateFlag).trim();
    const account: ContractPaymentAccount = {
      id: String(existingId || `account_${Date.now()}`),
      label: String(overrides.label || config.label || nextMerchantName || "Minu данс").trim(),
      merchantName: nextMerchantName,
      merchantCode: nextMerchantCode,
      username: String(overrides.username || verifiedSubMerchant?.username || config.username || nextMerchantCode).trim(),
      password: String(overrides.password || verifiedSubMerchant?.password || config.password || "").trim(),
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

    const removedAccount = (settings.paymentAccounts || []).find((item: ContractPaymentAccount) => item.id === accountId);
    const nextAccounts = (settings.paymentAccounts || []).filter((item: ContractPaymentAccount) => item.id !== accountId);
    try {
      await persistPaymentAccounts(nextAccounts);
      if (upgradePaymentAccountId === accountId) {
        await persistUpgradePaymentAccount("");
        setUpgradePaymentAccountId("");
        setUpgradeAccountSaved(false);
      }
      setSettings((prev: any) => ({
        ...prev,
        paymentAccounts: nextAccounts,
        systemQr: prev.systemQr?.selectedAccountId === accountId
          || (removedAccount?.merchantCode && prev.systemQr?.merchantCode === removedAccount.merchantCode)
          ? {
              ...prev.systemQr,
              enabled: false,
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
            }
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
    const isCorporateMerchant = String(config.corporateFlag || DEFAULT_SYSTEMQR_LOCATION.corporateFlag).trim() === "1";
    if (config.merchantName && config.merchantCode) {
      setConnectingMinuAccount(true);
      try {
        const account = await upsertCurrentPaymentAccount();
        if (account) alert("Minu merchant code дансны санд хадгалагдлаа.");
      } finally {
        setConnectingMinuAccount(false);
      }
      return;
    }

    if (config.merchantName && !config.merchantCode) {
      setConnectingMinuAccount(true);
      try {
        const res = await adminFetch(`${API}/contracts/minu-dynamic-qr/sub-merchants?query=${encodeURIComponent(config.merchantName)}`);
        const data = await res.json();
        const existing = Array.isArray(data.subMerchants)
          ? data.subMerchants.find((item: any) =>
              String(item.merchantName || "").trim().toLowerCase() === config.merchantName.toLowerCase()
              || String(item.merchantCode || "").trim().toLowerCase() === config.merchantName.toLowerCase()
            )
          : null;
        if (data.success && !data.fallback && existing?.merchantCode) {
          await upsertCurrentPaymentAccount({
            merchantName: existing.merchantName || config.merchantName,
            merchantCode: existing.merchantCode,
            username: existing.username || existing.merchantCode,
            password: existing.password || "",
          }, { trustedMerchantCode: true });
          alert("Minu дээр бүртгэлтэй merchant code-г авч хадгаллаа.");
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
      (!isCorporateMerchant && (!config.firstName || !config.lastName)) ||
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
        username: data.username || data.merchantCode,
        password: data.password || "",
      }, { trustedMerchantCode: true });
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

      const prefix = data.fallback
        ? "Minu шалгалт түр боломжгүй тул дансны сангаас харуулж байна:\n"
        : "";
      alert(prefix + rows.slice(0, 5).map((item: any) =>
        `${item.merchantName || "-"} — ${item.merchantCode || "-"}`
      ).join("\n"));
    } catch (error) {
      console.error("check minu sub merchants error", error);
      alert("Minu бүртгэл шалгахад серверийн алдаа гарлаа");
    } finally {
      setCheckingMinuAccounts(false);
    }
  };

  const selectedUpgradeAccount = (settings.paymentAccounts || []).find(
    (account: ContractPaymentAccount) =>
      account.id === upgradePaymentAccountId,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              Pro Upgrade төлбөрийн данс
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Кассын системийн эрх сунгалтын бүх Minu Dynamic QR төлбөр зөвхөн
              энд сонгосон платформын дансанд орно. Vendor Profile-ийн POS
              merchant тохиргоог ашиглахгүй.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Сунгалтын орлого хүлээн авах Minu данс
            </span>
            <select
              value={upgradePaymentAccountId}
              onChange={(event) => {
                setUpgradePaymentAccountId(event.target.value);
                setUpgradeAccountSaved(false);
              }}
              className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            >
              <option value="">Данс сонгоогүй — Pro Upgrade төлбөр хаалттай</option>
              {(settings.paymentAccounts || []).map(
                (account: ContractPaymentAccount) => (
                  <option key={account.id} value={account.id}>
                    {account.label || account.merchantName} ·{" "}
                    {getBankLabel(account.bankCode)} {account.accountNumber || "-"}
                    {" · "}{account.merchantCode}
                  </option>
                ),
              )}
            </select>
          </label>

          <button
            type="button"
            onClick={saveUpgradePaymentAccount}
            disabled={savingUpgradeAccount}
            className="mt-auto inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingUpgradeAccount ? (
              <Loader2 size={16} className="animate-spin" />
            ) : upgradeAccountSaved ? (
              <ShieldCheck size={16} />
            ) : (
              <Save size={16} />
            )}
            {savingUpgradeAccount
              ? "Хадгалж байна..."
              : upgradeAccountSaved
                ? "Хадгалагдсан"
                : "Pro Upgrade-д хадгалах"}
          </button>
        </div>

        {selectedUpgradeAccount && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            <CreditCard size={15} />
            {selectedUpgradeAccount.label || selectedUpgradeAccount.merchantName}
            {" · "}{getBankLabel(selectedUpgradeAccount.bankCode)}
            {" · "}{selectedUpgradeAccount.accountNumber || "Дансны дугаар хадгалагдаагүй"}
          </div>
        )}
      </section>

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
    </div>
  );
}
