"use client";

import { useState, useEffect } from "react";
import {
  RotateCcw,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";
import {
  BANK_OPTIONS,
  DEFAULT_BANK_ACCOUNT,
  merchantInputClass as inputCls,
} from "./_merchant-settings/constants";
import type {
  BankAccount,
  City,
  District,
  Khoroo,
  ManualPaymentProvider,
  MerchantMessage,
  MerchantSettingsChannel,
  MerchantSettingsMode,
  MerchantStatus,
  MinuAgentStatus,
  SystemQrCategory,
} from "./_merchant-settings/types";
import { MerchantSettingsMessage, Field } from "./_merchant-settings/shared";
import { MinuTerminalMerchantCard } from "./_merchant-settings/MinuTerminalMerchantCard";
import { ConnectedMerchantStatusCard } from "./_merchant-settings/ConnectedMerchantStatusCard";
import { BankAccountsEditor } from "./_merchant-settings/BankAccountsEditor";
import { SearchableSelect } from "./_merchant-settings/SearchableSelect";
import { MerchantConnectionChooser } from "./_merchant-settings/MerchantConnectionChooser";
import { ExistingMerchantDialog } from "./_merchant-settings/ExistingMerchantDialog";
import {
  RegistrationHeader,
  RegistrationProgress,
  RegistrationSuccess,
} from "./_merchant-settings/MerchantRegistrationChrome";
import { FALLBACK_SYSTEMQR_CATEGORIES } from "@mgl/types";

/* ── Component ──────────────────────────────────────────── */
export function MerchantSettingsSection({
  organizationId,
  mode = "qpay",
  channel = "POS",
}: {
  organizationId?: string;
  mode?: MerchantSettingsMode;
  channel?: MerchantSettingsChannel;
}) {
  const [merchantStatus, setMerchantStatus] = useState<MerchantStatus | null>(
    null,
  );
  const [minuStatus, setMinuStatus] = useState<MinuAgentStatus | null>(null);
  const [isQpayLoading, setIsQpayLoading] = useState(true);
  const [isMinuLoading, setIsMinuLoading] = useState(true);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [existingAccountOpen, setExistingAccountOpen] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(0);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [message, setMessage] = useState<MerchantMessage | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedBankAccounts, setSavedBankAccounts] = useState<BankAccount[]>([]);
  const [editingBankAccounts, setEditingBankAccounts] = useState(false);
  const [connectedBankAccounts, setConnectedBankAccounts] = useState<
    BankAccount[]
  >([{ ...DEFAULT_BANK_ACCOUNT }]);
  const [confirmNumbers, setConfirmNumbers] = useState<string[]>([""]);

  // Registration form state
  const [merchantType, setMerchantType] = useState<"company" | "person">(
    "company",
  );
  const [registerNumber, setRegisterNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [khorooId, setKhorooId] = useState("");
  const [building, setBuilding] = useState("");
  const [doorNo, setDoorNo] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [gender, setGender] = useState("M");
  const [subCategoryId, setSubCategoryId] = useState("36");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    { ...DEFAULT_BANK_ACCOUNT },
  ]);

  const [regConfirmNumbers, setRegConfirmNumbers] = useState<string[]>([""]);

  // City / district
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [khoroos, setKhoroos] = useState<Khoroo[]>([]);
  const [systemQrCategories, setSystemQrCategories] = useState<
    SystemQrCategory[]
  >(() => [...FALLBACK_SYSTEMQR_CATEGORIES]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  // Manual connect form
  const [manualProvider, setManualProvider] =
    useState<ManualPaymentProvider>("systemqr");
  const [merchantId, setMerchantId] = useState("");
  const [merchantKey, setMerchantKey] = useState("");
  const [invoiceCode, setInvoiceCode] = useState("");
  const [recoveryRegNum, setRecoveryRegNum] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [minuUsername, setMinuUsername] = useState("");
  const [minuPassword, setMinuPassword] = useState("");
  const [minuBranchId, setMinuBranchId] = useState("");
  useEffect(() => {
    if (!organizationId) return;

    if (mode === "terminal") {
      loadMinuStatus();
      loadBankAccounts();
      return;
    }

    loadMerchantStatus();
    loadCities();
    loadSystemQrCategories();
    loadBankAccounts();
  }, [channel, mode, organizationId]);

  useEffect(() => {
    if (city) loadDistricts(city);
    else setDistricts([]);
    setDistrict("");
  }, [city]);

  useEffect(() => {
    if (district) loadKhoroos(district);
    else setKhoroos([]);
    setKhorooId("");
  }, [district]);

  useEffect(() => {
    if (!registrationOpen && !existingAccountOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting && !registrationComplete) {
        setRegistrationOpen(false);
        setExistingAccountOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [
    existingAccountOpen,
    isSubmitting,
    registrationComplete,
    registrationOpen,
  ]);

  const merchantQueryParams = new URLSearchParams();
  if (organizationId) merchantQueryParams.set("organizationId", organizationId);
  merchantQueryParams.set("channel", channel);
  const orgQuery = merchantQueryParams.toString()
    ? `?${merchantQueryParams.toString()}`
    : "";

  const loadBankAccounts = async () => {
    try {
      const res = await authFetch(
        `${API}/vendor/merchant/bank-accounts${orgQuery}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.bank_accounts)) {
          const nextAccounts = data.bank_accounts;
          setSavedBankAccounts(nextAccounts);
          setConnectedBankAccounts(
            nextAccounts.length > 0
              ? nextAccounts
              : [{ ...DEFAULT_BANK_ACCOUNT }],
          );
        }
      }
    } catch {}
  };

  const loadMerchantStatus = async () => {
    setIsQpayLoading(true);
    try {
      const res = await authFetch(`${API}/vendor/merchant/status${orgQuery}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setMerchantStatus(data);
      }
    } finally {
      setIsQpayLoading(false);
    }
  };

  const loadMinuStatus = async () => {
    setIsMinuLoading(true);
    try {
      const res = await authFetch(
        `${API}/vendor/merchant/minu/status${orgQuery}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMinuStatus(data);
          setMinuUsername(data.username || "");
          setMinuBranchId(data.branchId || "");
        }
      }
    } catch {
    } finally {
      setIsMinuLoading(false);
    }
  };

  const loadCities = async () => {
    setCitiesLoading(true);
    try {
      const res = await authFetch(`${API}/vendor/merchant/systemqr/cities`);
      const data = await res.json();
      if (res.ok) {
        setCities(data.cities || []);
      } else {
        setMessage({
          type: "error",
          text: data.message || "Байршлын мэдээлэл авч чадсангүй",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Байршлын API-тай холбогдож чадсангүй",
      });
    } finally {
      setCitiesLoading(false);
    }
  };

  const loadDistricts = async (cityCode: string) => {
    const selectedCity = cities.find((item) => item.code === cityCode);
    if (selectedCity?.districts?.length) {
      setDistricts(selectedCity.districts);
      return;
    }
    setDistricts([]);
  };

  const loadKhoroos = async (districtCode: string) => {
    try {
      const res = await authFetch(
        `${API}/vendor/merchant/systemqr/khoroo/${districtCode}`,
      );
      if (res.ok) {
        const data = await res.json();
        setKhoroos(data.khoroos || []);
      }
    } catch {}
  };

  const loadSystemQrCategories = async () => {
    try {
      const res = await authFetch(`${API}/vendor/merchant/systemqr/categories`);
      const data = await res.json();
      if (res.ok) {
        const categories: SystemQrCategory[] = data.categories || [];
        const availableCategories = categories.length
          ? categories
          : [...FALLBACK_SYSTEMQR_CATEGORIES];
        setSystemQrCategories(availableCategories);
        if (!availableCategories.some((item) => item.code === subCategoryId)) {
          setSubCategoryId(availableCategories[0].code);
        }
      } else {
        setSystemQrCategories([...FALLBACK_SYSTEMQR_CATEGORIES]);
        setMessage({
          type: "error",
          text: data.message || "Ангиллын мэдээлэл авч чадсангүй",
        });
      }
    } catch {
      setSystemQrCategories([...FALLBACK_SYSTEMQR_CATEGORIES]);
      setMessage({
        type: "error",
        text: "Ангиллын API-тай холбогдож чадсангүй",
      });
    }
  };

  /* ── Register ─────────────────────────────────────────── */
  const handleRegister = async () => {
    if (
      !registerNumber ||
      !displayName ||
      !subCategoryId ||
      !city ||
      !district ||
      !khorooId ||
      !building ||
      !doorNo ||
      !phone ||
      (merchantType === "person" && (!ownerFirstName || !ownerLastName))
    ) {
      setMessage({
        type: "error",
        text: "Бүх шаардлагатай талбарыг бөглөнө үү",
      });
      return;
    }
    if (merchantType === "company" && !companyName) {
      setMessage({ type: "error", text: "Байгууллагын нэр шаардлагатай" });
      return;
    }
    const validBanks = bankAccounts.filter(
      (b) => b.account_number && b.account_name,
    );
    if (validBanks.length === 0) {
      setMessage({
        type: "error",
        text: "Дор хаяж нэг банкны данс бүрэн бөглөнө үү",
      });
      return;
    }
    for (let i = 0; i < bankAccounts.length; i++) {
      const b = bankAccounts[i];
      if (!b.account_number) continue;
      if ((regConfirmNumbers[i] ?? "") !== b.account_number) {
        setMessage({
          type: "error",
          text: `Данс ${i + 1}-н дугаар баталгаажаагүй байна. Дугаарыг давтан оруулна уу.`,
        });
        return;
      }
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const defaultBank =
        validBanks.find((bank) => bank.is_default) || validBanks[0];
      const normalizedOwnerFirstName =
        merchantType === "company"
          ? ownerFirstName.trim() || displayName.trim() || companyName.trim()
          : ownerFirstName.trim();
      const normalizedOwnerLastName =
        merchantType === "company"
          ? ownerLastName.trim() || "-"
          : ownerLastName.trim();
      const body = {
        provider: "systemqr",
        type: merchantType,
        merchantName: displayName.trim(),
        accountNumber: defaultBank.account_number.trim(),
        bankCode: defaultBank.account_bank_code.trim(),
        cityId: city,
        districtId: district,
        khorooId,
        building: building.trim(),
        doorNo: doorNo.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        firstName: normalizedOwnerFirstName,
        lastName: normalizedOwnerLastName,
        corporateFlag: merchantType === "company" ? "1" : "0",
        corporateName: merchantType === "company" ? companyName.trim() : null,
        registerNumber: registerNumber.trim(),
        gender,
        subCategoryId,
        bank_accounts: validBanks,
      };

      const res = await authFetch(`${API}/vendor/merchant/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          channel,
          ...(organizationId ? { organizationId } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: "success",
          text: "Minu Dynamic QR дэд мерчант амжилттай бүртгэгдлээ!",
        });
        setRegistrationComplete(true);
        await loadMerchantStatus();
        await loadBankAccounts();
      } else if (data.alreadyRegistered) {
        setRegistrationOpen(false);
        setExistingAccountOpen(true);
        setMessage({
          type: "error",
          text: data.message,
        });
      } else {
        setMessage({
          type: "error",
          text: data.message || "Бүртгэхэд алдаа гарлаа",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Серверийн алдаа" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Manual connect ───────────────────────────────────── */
  const handleManualConnect = async () => {
    const isSystemQr = manualProvider === "systemqr";
    if (!merchantId || (!isSystemQr && !merchantKey)) {
      setMessage({
        type: "error",
        text: isSystemQr
          ? "Merchant code шаардлагатай"
          : "Мерчант ID ба key шаардлагатай",
      });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await authFetch(`${API}/vendor/merchant/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          merchantKey: isSystemQr ? "systemqr" : merchantKey,
          ...(isSystemQr
            ? { invoiceCode: "SYSTEMQR" }
            : invoiceCode
              ? { invoiceCode }
              : {}),
          channel,
          ...(organizationId ? { organizationId } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setMerchantId("");
        setMerchantKey("");
        setInvoiceCode("");
        await loadMerchantStatus();
        await loadBankAccounts();
      } else {
        setMessage({ type: "error", text: data.message || "Алдаа гарлаа" });
      }
    } catch {
      setMessage({ type: "error", text: "Серверийн алдаа" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Recover ──────────────────────────────────────────── */
  const handleRecover = async () => {
    if (!recoveryRegNum) {
      setMessage({ type: "error", text: "Регистрийн дугаараа оруулна уу" });
      return;
    }
    setRecoveryLoading(true);
    setMessage(null);
    try {
      const res = await authFetch(
        `${API}/vendor/merchant/recover/${encodeURIComponent(recoveryRegNum)}${orgQuery}`,
      );
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        await loadMerchantStatus();
        await loadBankAccounts();
      } else {
        setMessage({
          type: "error",
          text: data.message || "Мэдээлэл олдсонгүй",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Серверийн алдаа" });
    } finally {
      setRecoveryLoading(false);
    }
  };

  /* ── Disconnect ───────────────────────────────────────── */
  const handleDisconnect = async () => {
    if (!confirm("Мерчант данс салгахыг зөвшөөрч байна уу?")) return;
    setIsSubmitting(true);
    try {
      const res = await authFetch(`${API}/vendor/merchant/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          ...(organizationId ? { organizationId } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        await loadMerchantStatus();
      } else {
        setMessage({ type: "error", text: data.message || "Алдаа гарлаа" });
      }
    } catch {
      setMessage({ type: "error", text: "Серверийн алдаа" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMinuConnect = async () => {
    if (!minuUsername.trim() || !minuBranchId.trim()) {
      setMessage({
        type: "error",
        text: "Minu username болон branchId шаардлагатай",
      });
      return;
    }
    if (!minuPassword.trim() && !minuStatus?.passwordSet) {
      setMessage({ type: "error", text: "Minu password шаардлагатай" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await authFetch(`${API}/vendor/merchant/minu/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: minuUsername.trim(),
          ...(minuPassword.trim() ? { password: minuPassword.trim() } : {}),
          branchId: minuBranchId.trim(),
          ...(organizationId ? { organizationId } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setMinuPassword("");
        await loadMinuStatus();
      } else {
        setMessage({
          type: "error",
          text: data.message || "Minu Agent холбоход алдаа гарлаа",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Серверийн алдаа" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMinuDisconnect = async () => {
    if (!confirm("Minu Agent merchant салгахыг зөвшөөрч байна уу?")) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await authFetch(`${API}/vendor/merchant/minu/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(organizationId ? { organizationId } : {}),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setMinuUsername("");
        setMinuPassword("");
        setMinuBranchId("");
        await loadMinuStatus();
      } else {
        setMessage({
          type: "error",
          text: data.message || "Minu Agent салгахад алдаа гарлаа",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Серверийн алдаа" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Bank account helpers ─────────────────────────────── */
  const addBankAccount = () => {
    setBankAccounts((prev) => [
      ...prev,
      {
        account_bank_code: "050000",
        account_number: "",
        account_name: "",
        is_default: false,
      },
    ]);
    setRegConfirmNumbers((prev) => [...prev, ""]);
  };

  const removeBankAccount = (i: number) => {
    setBankAccounts((prev) => prev.filter((_, idx) => idx !== i));
    setRegConfirmNumbers((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateBankAccount = (
    i: number,
    field: keyof BankAccount,
    value: string | boolean,
  ) => {
    setBankAccounts((prev) =>
      prev.map((b, idx) => {
        if (idx !== i)
          return field === "is_default" && value
            ? { ...b, is_default: false }
            : b;
        return { ...b, [field]: value };
      }),
    );
  };

  const handleSaveConnectedBankAccounts = async () => {
    const valid = connectedBankAccounts.filter(
      (account) => account.account_number && account.account_name,
    );
    if (valid.length === 0) {
      setMessage({ type: "error", text: "Дор хаяж нэг данс бүрэн бөглөнө үү" });
      return;
    }

    for (let i = 0; i < connectedBankAccounts.length; i++) {
      const account = connectedBankAccounts[i];
      if (!account.account_number) continue;
      if ((confirmNumbers[i] ?? "") !== account.account_number) {
        setMessage({
          type: "error",
          text: `Данс ${i + 1}-н дугаар баталгаажаагүй байна. Дугаарыг давтан оруулна уу.`,
        });
        return;
      }
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await authFetch(`${API}/vendor/merchant/bank-accounts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_accounts: valid,
          channel,
          organizationId: organizationId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedBankAccounts(valid);
        setEditingBankAccounts(false);
        setMessage({ type: "success", text: "Банкны данс хадгалагдлаа" });
      } else {
        setMessage({ type: "error", text: data.message || "Алдаа гарлаа" });
      }
    } catch {
      setMessage({ type: "error", text: "Алдаа гарлаа" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelConnectedBankAccountEdit = () => {
    setEditingBankAccounts(false);
    setConnectedBankAccounts(
      savedBankAccounts.length > 0
        ? savedBankAccounts
        : [{ ...DEFAULT_BANK_ACCOUNT }],
    );
    setConfirmNumbers(savedBankAccounts.map(() => ""));
  };

  const renderMinuSection = () => (
    <MinuTerminalMerchantCard
      status={minuStatus}
      bankAccounts={savedBankAccounts}
      username={minuUsername}
      password={minuPassword}
      branchId={minuBranchId}
      isSubmitting={isSubmitting}
      onUsernameChange={setMinuUsername}
      onPasswordChange={setMinuPassword}
      onBranchIdChange={setMinuBranchId}
      onConnect={handleMinuConnect}
      onDisconnect={handleMinuDisconnect}
    />
  );

  /* ── Render ───────────────────────────────────────────── */
  const isLoading = mode === "terminal" ? isMinuLoading : isQpayLoading;
  const registrationSteps = [
    {
      title: "Үндсэн мэдээлэл",
      description: "Мерчантын төрөл, нэр ба үйл ажиллагаа",
    },
    { title: "Эзэмшигч", description: "Хариуцагч болон холбоо барих мэдээлэл" },
    { title: "Байршил", description: "Үйл ажиллагаа явуулах хаяг" },
    {
      title: "Банкны данс",
      description: "Орлого хүлээн авах дансаа баталгаажуулах",
    },
  ] as const;

  const canContinueRegistration = () => {
    if (registrationStep === 0) {
      return Boolean(
        registerNumber.trim() &&
        displayName.trim() &&
        subCategoryId &&
        (merchantType === "person" || companyName.trim()),
      );
    }
    if (registrationStep === 1) {
      return Boolean(
        phone.trim() &&
        email.trim() &&
        (merchantType === "company" ||
          (ownerFirstName.trim() && ownerLastName.trim())),
      );
    }
    if (registrationStep === 2) {
      return Boolean(
        city && district && khorooId && building.trim() && doorNo.trim(),
      );
    }
    return bankAccounts.some((account, index) =>
      Boolean(
        account.account_number &&
        account.account_name &&
        regConfirmNumbers[index] === account.account_number,
      ),
    );
  };

  const continueRegistration = () => {
    if (!canContinueRegistration()) {
      setMessage({
        type: "error",
        text: "Энэ алхмын шаардлагатай мэдээллийг бүрэн, зөв бөглөнө үү.",
      });
      return;
    }
    setMessage(null);
    setRegistrationStep((step) =>
      Math.min(step + 1, registrationSteps.length - 1),
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">Ачаалж байна...</span>
      </div>
    );
  }

  if (mode === "terminal") {
    return (
      <div className="space-y-6">
        {renderMinuSection()}

        <MerchantSettingsMessage message={message} />
      </div>
    );
  }

  /* Connected state */
  if (merchantStatus?.isConnected && !registrationComplete) {
    return (
      <div className="space-y-6">
        <ConnectedMerchantStatusCard
          status={merchantStatus}
          copied={copied}
          onCopyMerchantId={() => {
            navigator.clipboard.writeText(merchantStatus.merchantId || "");
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        />

        {/* Bank accounts section */}
        <BankAccountsEditor
          savedAccounts={savedBankAccounts}
          editingAccounts={connectedBankAccounts}
          confirmNumbers={confirmNumbers}
          isEditing={editingBankAccounts}
          isSubmitting={isSubmitting}
          managedBySystem={merchantStatus.managedBySystem}
          onStartEditing={() => {
            setEditingBankAccounts(true);
            setConfirmNumbers(connectedBankAccounts.map(() => ""));
          }}
          onAccountsChange={setConnectedBankAccounts}
          onConfirmNumbersChange={setConfirmNumbers}
          onSave={handleSaveConnectedBankAccounts}
          onCancel={handleCancelConnectedBankAccountEdit}
        />

        <MerchantSettingsMessage message={message} />

        <button
          onClick={handleDisconnect}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Мерчант данс салгах
        </button>
      </div>
    );
  }

  /* Registration / connect form */
  return (
    <div className="space-y-6">
      <MerchantConnectionChooser
        message={message}
        onCreate={() => {
          setRegistrationOpen(true);
          setRegistrationComplete(false);
          setMessage(null);
        }}
        onConnectExisting={() => {
          setExistingAccountOpen(true);
          setMessage(null);
        }}
      />

      {registrationOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="merchant-registration-title"
        >
          <div className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-3xl">
            {registrationComplete ? (
              <RegistrationSuccess
                onClose={() => {
                  setRegistrationOpen(false);
                  setRegistrationComplete(false);
                }}
              />
            ) : (
              <>
                <RegistrationHeader
                  onClose={() => setRegistrationOpen(false)}
                />
                <RegistrationProgress
                  steps={registrationSteps}
                  currentStep={registrationStep}
                />

                <div
                  className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 py-6 [scrollbar-gutter:stable] sm:px-7"
                  data-lenis-prevent="true"
                >
                  <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                    <p className="font-bold text-indigo-950">
                      {registrationSteps[registrationStep].title}
                    </p>
                    <p className="mt-1 text-sm text-indigo-700">
                      {registrationSteps[registrationStep].description}
                    </p>
                  </div>
                  <MerchantSettingsMessage message={message} />
                  <div className="mt-5 space-y-5">
                    {registrationStep === 0 && (
                      <>
                        {/* Merchant type */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                            Мерчант төрөл
                          </label>
                          <div className="flex gap-3">
                            {(["company", "person"] as const).map((t) => (
                              <button
                                key={t}
                                onClick={() => setMerchantType(t)}
                                className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${merchantType === t ? "border-[#5B4CFF] bg-indigo-50 text-[#5B4CFF]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                              >
                                {t === "company"
                                  ? "Байгууллага (ААН)"
                                  : "Хувь хүн"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Register number */}
                        <Field
                          label={
                            merchantType === "company"
                              ? "ААН-ийн улсын бүртгэлийн дугаар *"
                              : "Регистрийн дугаар *"
                          }
                        >
                          <input
                            type="text"
                            value={registerNumber}
                            onChange={(e) => setRegisterNumber(e.target.value)}
                            placeholder={
                              merchantType === "company"
                                ? "9323472"
                                : "АМ05321712"
                            }
                            className={inputCls}
                          />
                        </Field>

                        {/* Company/business name */}
                        <Field
                          label={
                            merchantType === "company"
                              ? "Байгууллагын нэр *"
                              : "Бизнесийн нэр *"
                          }
                        >
                          <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder={
                              merchantType === "company"
                                ? "ХХК нэр"
                                : "Дэлгүүрийн нэр"
                            }
                            className={inputCls}
                          />
                        </Field>

                        {/* Display name */}
                        <Field label="QR төлбөр дээр харагдах нэр *">
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="MYSHOP_MN"
                            className={inputCls}
                          />
                        </Field>

                        {/* Owner name */}
                        <div className="grid grid-cols-2 gap-3">
                          <Field
                            label={
                              merchantType === "company"
                                ? "Эзэмшигчийн овог"
                                : "Эзэмшигчийн овог *"
                            }
                          >
                            <input
                              type="text"
                              value={ownerLastName}
                              onChange={(e) => setOwnerLastName(e.target.value)}
                              placeholder="Батбаяр"
                              className={inputCls}
                            />
                          </Field>
                          <Field
                            label={
                              merchantType === "company"
                                ? "Эзэмшигчийн нэр"
                                : "Эзэмшигчийн нэр *"
                            }
                          >
                            <input
                              type="text"
                              value={ownerFirstName}
                              onChange={(e) =>
                                setOwnerFirstName(e.target.value)
                              }
                              placeholder="Оюунбаяр"
                              className={inputCls}
                            />
                          </Field>
                        </div>

                        <Field label="Хүйс *">
                          <div className="grid grid-cols-2 gap-2">
                            {(
                              [
                                ["M", "Эрэгтэй"],
                                ["F", "Эмэгтэй"],
                              ] as const
                            ).map(([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setGender(value)}
                                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${gender === value ? "border-[#5B4CFF] bg-indigo-50 text-[#5B4CFF]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </Field>

                        {/* Category */}
                        <Field label="Үйл ажиллагааны чиглэл *">
                          <SearchableSelect
                            ariaLabel="Үйл ажиллагааны чиглэл сонгох"
                            value={subCategoryId}
                            onChange={setSubCategoryId}
                            options={systemQrCategories.map((item) => ({
                              value: item.code,
                              label: item.categoryName
                                ? `${item.categoryName} - ${item.name}`
                                : item.name,
                              keywords: `${item.categoryName ?? ""} ${item.name} ${item.code}`,
                            }))}
                          />
                        </Field>
                      </>
                    )}

                    {registrationStep === 2 && (
                      <>
                        {/* City */}
                        <Field label="Аймаг/Хот *">
                          {cities.length > 0 ? (
                            <div className="relative">
                              <select
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className={inputCls + " appearance-none pr-8"}
                              >
                                <option value="">Сонгоно уу</option>
                                {cities.map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              placeholder={
                                citiesLoading
                                  ? "Ачаалж байна..."
                                  : "11000 (Улаанбаатар)"
                              }
                              disabled={citiesLoading}
                              className={inputCls}
                            />
                          )}
                        </Field>

                        {/* District */}
                        <Field label="Дүүрэг/Сум *">
                          {districts.length > 0 ? (
                            <div className="relative">
                              <select
                                value={district}
                                onChange={(e) => setDistrict(e.target.value)}
                                className={inputCls + " appearance-none pr-8"}
                              >
                                <option value="">Сонгоно уу</option>
                                {districts.map((d) => (
                                  <option key={d.code} value={d.code}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={district}
                              onChange={(e) => setDistrict(e.target.value)}
                              placeholder="12000 (Хан-Уул)"
                              className={inputCls}
                            />
                          )}
                        </Field>

                        {/* Khoroo */}
                        <Field label="Хороо/Баг *">
                          {khoroos.length > 0 ? (
                            <div className="relative">
                              <select
                                value={khorooId}
                                onChange={(e) => setKhorooId(e.target.value)}
                                className={inputCls + " appearance-none pr-8"}
                              >
                                <option value="">Сонгоно уу</option>
                                {khoroos.map((item) => (
                                  <option key={item.code} value={item.code}>
                                    {item.name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={khorooId}
                              onChange={(e) => setKhorooId(e.target.value)}
                              placeholder="15782385"
                              className={inputCls}
                            />
                          )}
                        </Field>

                        {/* Address */}
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Барилга/хашаа *">
                            <input
                              type="text"
                              value={building}
                              onChange={(e) => setBuilding(e.target.value)}
                              placeholder="Ascom"
                              className={inputCls}
                            />
                          </Field>
                          <Field label="Тоот *">
                            <input
                              type="text"
                              value={doorNo}
                              onChange={(e) => setDoorNo(e.target.value)}
                              placeholder="2"
                              className={inputCls}
                            />
                          </Field>
                        </div>

                        <Field label="Дэлгэрэнгүй хаяг">
                          <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Нэмэлт тайлбар"
                            className={inputCls}
                          />
                        </Field>
                      </>
                    )}

                    {registrationStep === 1 && (
                      <>
                        {/* Phone & email */}
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Утас *">
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="99112210"
                              className={inputCls}
                            />
                          </Field>
                          <Field label="И-мэйл *">
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="info@shop.mn"
                              className={inputCls}
                            />
                          </Field>
                        </div>
                      </>
                    )}

                    {registrationStep === 3 && (
                      <>
                        {/* Bank accounts */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              Банкны данс
                            </label>
                            <button
                              onClick={addBankAccount}
                              className="flex items-center gap-1 text-xs text-[#5B4CFF] hover:underline font-semibold"
                            >
                              <Plus className="h-3.5 w-3.5" /> Данс нэмэх
                            </button>
                          </div>
                          <div className="space-y-3">
                            {bankAccounts.map((b, i) => (
                              <div
                                key={i}
                                className="rounded-lg border border-slate-200 p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="relative flex-1 mr-2">
                                    <select
                                      value={b.account_bank_code}
                                      onChange={(e) =>
                                        updateBankAccount(
                                          i,
                                          "account_bank_code",
                                          e.target.value,
                                        )
                                      }
                                      className={
                                        inputCls + " appearance-none pr-8"
                                      }
                                    >
                                      {BANK_OPTIONS.map((bk) => (
                                        <option key={bk.code} value={bk.code}>
                                          {bk.name}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                  </div>
                                  {bankAccounts.length > 1 && (
                                    <button
                                      onClick={() => removeBankAccount(i)}
                                      className="p-1.5 text-red-400 hover:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  value={b.account_number}
                                  onChange={(e) => {
                                    updateBankAccount(
                                      i,
                                      "account_number",
                                      e.target.value,
                                    );
                                    setRegConfirmNumbers((prev) => {
                                      const n = [...prev];
                                      n[i] = "";
                                      return n;
                                    });
                                  }}
                                  placeholder="Дансны дугаар"
                                  className={inputCls}
                                />
                                {(() => {
                                  const confirmVal = regConfirmNumbers[i] ?? "";
                                  const mismatch =
                                    confirmVal.length > 0 &&
                                    confirmVal !== b.account_number;
                                  return (
                                    <>
                                      <input
                                        type="text"
                                        value={confirmVal}
                                        onChange={(e) =>
                                          setRegConfirmNumbers((prev) => {
                                            const n = [...prev];
                                            n[i] = e.target.value;
                                            return n;
                                          })
                                        }
                                        placeholder="Дансны дугаар давтан оруулах (баталгаажуулах)"
                                        className={
                                          inputCls +
                                          (mismatch
                                            ? " border-red-400"
                                            : confirmVal && !mismatch
                                              ? " border-emerald-400"
                                              : "")
                                        }
                                      />
                                      {mismatch && (
                                        <p className="text-xs text-red-500">
                                          Дансны дугаар таарахгүй байна
                                        </p>
                                      )}
                                      {confirmVal && !mismatch && (
                                        <p className="text-xs text-emerald-600">
                                          ✓ Таарч байна
                                        </p>
                                      )}
                                    </>
                                  );
                                })()}
                                <input
                                  type="text"
                                  value={b.account_name}
                                  onChange={(e) =>
                                    updateBankAccount(
                                      i,
                                      "account_name",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Дансны эзэмшигчийн нэр"
                                  className={inputCls}
                                />
                                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="defaultBank"
                                    checked={b.is_default}
                                    onChange={() =>
                                      updateBankAccount(i, "is_default", true)
                                    }
                                    className="accent-[#5B4CFF]"
                                  />
                                  Үндсэн данс
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        registrationStep === 0
                          ? setRegistrationOpen(false)
                          : setRegistrationStep((step) => Math.max(0, step - 1))
                      }
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                      <ArrowLeft className="h-4 w-4" />{" "}
                      {registrationStep === 0 ? "Болих" : "Өмнөх"}
                    </button>
                    <div className="hidden items-center gap-2 text-xs font-semibold text-slate-400 md:flex">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Мэдээлэл хамгаалагдана
                    </div>
                    {registrationStep < registrationSteps.length - 1 ? (
                      <button
                        type="button"
                        onClick={continueRegistration}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
                      >
                        Үргэлжлүүлэх <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRegister}
                        disabled={isSubmitting || !canContinueRegistration()}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Бүртгэл баталгаажуулах
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MANUAL TAB ── */}
      {existingAccountOpen && (
        <ExistingMerchantDialog
          message={message}
          provider={manualProvider}
          merchantId={merchantId}
          merchantKey={merchantKey}
          invoiceCode={invoiceCode}
          recoveryRegNum={recoveryRegNum}
          recoveryLoading={recoveryLoading}
          isSubmitting={isSubmitting}
          onClose={() => setExistingAccountOpen(false)}
          onProviderChange={setManualProvider}
          onMerchantIdChange={setMerchantId}
          onMerchantKeyChange={setMerchantKey}
          onInvoiceCodeChange={setInvoiceCode}
          onRecoveryRegNumChange={setRecoveryRegNum}
          onRecover={handleRecover}
          onConnect={handleManualConnect}
        />
      )}
    </div>
  );
}
