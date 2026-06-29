"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, CreditCard, Loader2, RefreshCw, Unplug } from "lucide-react";
import { API, authFetch, getStoredOrgUser } from "@/lib/api";
import {
  connectRestaurantCardTerminal,
  getRestaurantPosRegisters,
  type RestaurantPosRegister,
} from "@/lib/restaurant-pos-api";

type MerchantStatus = {
  success?: boolean;
  isConnected: boolean;
  merchantId: string | null;
  connectedAt: string | null;
  orgName?: string;
  managedBySystem?: boolean;
  message?: string;
  error?: string;
};

type City = {
  code: string;
  name: string;
  districts?: Array<{ code: string; name: string }>;
};

type Khoroo = {
  code: string;
  name: string;
};

type SystemQrCategory = {
  code: string;
  name: string;
  categoryCode?: string;
  categoryName?: string;
};

const BANK_OPTIONS = [
  { code: "050000", name: "Хаан банк" },
  { code: "150000", name: "Голомт банк" },
  { code: "040000", name: "TDB" },
  { code: "320000", name: "ХасБанк" },
  { code: "340000", name: "Төрийн банк" },
  { code: "300000", name: "Капитрон банк" },
  { code: "500000", name: "Мобифинанс" },
];

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-100";
const DEFAULT_ANDROID_PGW_BRIDGE_URL = "http://127.0.0.1:7420";

const terminalSourceLabel = (source?: string | null) => {
  if (source === "REGISTER") return "Энэ кассын terminal";
  if (source === "ORG_REGISTER") return "Байгууллагын existing terminal";
  if (source === "CARD_TERMINAL_REQUEST") return "Батлагдсан terminal хүсэлт";
  return "Terminal тохируулаагүй";
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function buildQuery(organizationId: string | null) {
  if (!organizationId) return "";
  return `?${new URLSearchParams({ organizationId }).toString()}`;
}

export function OrgMerchantSettings() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [status, setStatus] = useState<MerchantStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [tab, setTab] = useState<"manual" | "register">("manual");
  const [posRegisters, setPosRegisters] = useState<RestaurantPosRegister[]>(
    [],
  );
  const [terminalLoading, setTerminalLoading] = useState(true);
  const [terminalSubmitting, setTerminalSubmitting] = useState(false);
  const [terminalMessage, setTerminalMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [selectedTerminalRegisterId, setSelectedTerminalRegisterId] =
    useState("");
  const [terminalProvider, setTerminalProvider] = useState<
    "ANDROID_PGW" | "MINU_AGENT"
  >("ANDROID_PGW");
  const [terminalBridgeUrl, setTerminalBridgeUrl] = useState(
    DEFAULT_ANDROID_PGW_BRIDGE_URL,
  );
  const [terminalId, setTerminalId] = useState("");
  const [minuUsername, setMinuUsername] = useState("");
  const [minuPassword, setMinuPassword] = useState("");
  const [minuBranchId, setMinuBranchId] = useState("");

  const [manualMerchantCode, setManualMerchantCode] = useState("");

  const [merchantType, setMerchantType] = useState<"company" | "person">(
    "company",
  );
  const [registerNumber, setRegisterNumber] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [corporateName, setCorporateName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"M" | "F">("M");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [khorooId, setKhorooId] = useState("");
  const [building, setBuilding] = useState("");
  const [doorNo, setDoorNo] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("36");
  const [bankCode, setBankCode] = useState(BANK_OPTIONS[0].code);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountNumberConfirm, setAccountNumberConfirm] = useState("");
  const [accountName, setAccountName] = useState("");

  const [cities, setCities] = useState<City[]>([]);
  const [khoroos, setKhoroos] = useState<Khoroo[]>([]);
  const [categories, setCategories] = useState<SystemQrCategory[]>([]);

  const query = useMemo(() => buildQuery(organizationId), [organizationId]);
  const selectedCity = cities.find((city) => city.code === cityId);
  const districts = selectedCity?.districts || [];
  const selectedTerminalRegister = useMemo(
    () =>
      posRegisters.find((register) => register.id === selectedTerminalRegisterId) ||
      posRegisters[0] ||
      null,
    [posRegisters, selectedTerminalRegisterId],
  );
  const terminalReady = Boolean(
    selectedTerminalRegister?.cardEnabled &&
      selectedTerminalRegister.cardProviderType &&
      (selectedTerminalRegister.cardProviderType === "ANDROID_PGW"
        ? selectedTerminalRegister.terminalBridgeUrl
        : selectedTerminalRegister.cardTerminalId),
  );

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch(`${API}/vendor/merchant/status${query}`);
      const data = (await response
        .json()
        .catch(() => null)) as MerchantStatus | null;
      if (response.ok && data?.success !== false) {
        setStatus(data);
      } else {
        setMessage({
          type: "error",
          text:
            data?.error ||
            data?.message ||
            "Merchant тохиргоо авахад алдаа гарлаа",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadMeta = useCallback(async () => {
    const [citiesResponse, categoriesResponse] = await Promise.all([
      authFetch(`${API}/vendor/merchant/systemqr/cities`),
      authFetch(`${API}/vendor/merchant/systemqr/categories`),
    ]);

    if (citiesResponse.ok) {
      const data = await citiesResponse.json().catch(() => null);
      setCities(Array.isArray(data?.cities) ? data.cities : []);
    }

    if (categoriesResponse.ok) {
      const data = await categoriesResponse.json().catch(() => null);
      const nextCategories = Array.isArray(data?.categories)
        ? data.categories
        : [];
      setCategories(nextCategories);
      if (
        nextCategories.length > 0 &&
        !nextCategories.some(
          (category: SystemQrCategory) => category.code === subCategoryId,
        )
      ) {
        setSubCategoryId(nextCategories[0].code);
      }
    }
  }, [subCategoryId]);

  const loadPosRegisters = useCallback(async () => {
    setTerminalLoading(true);
    setTerminalMessage(null);
    try {
      const registers = await getRestaurantPosRegisters();
      setPosRegisters(registers);
      setSelectedTerminalRegisterId((current) =>
        registers.some((register) => register.id === current)
          ? current
          : (registers[0]?.id ?? ""),
      );
    } catch (error) {
      setTerminalMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "POS register жагсаалт авахад алдаа гарлаа",
      });
      setPosRegisters([]);
      setSelectedTerminalRegisterId("");
    } finally {
      setTerminalLoading(false);
    }
  }, []);

  useEffect(() => {
    setOrganizationId(getStoredOrgUser()?.organizationId || null);
  }, []);

  useEffect(() => {
    void loadStatus();
    void loadMeta();
    void loadPosRegisters();
  }, [loadMeta, loadPosRegisters, loadStatus]);

  useEffect(() => {
    if (!selectedTerminalRegister) return;

    if (
      selectedTerminalRegister.cardProviderType === "ANDROID_PGW" ||
      selectedTerminalRegister.cardProviderType === "MINU_AGENT"
    ) {
      setTerminalProvider(selectedTerminalRegister.cardProviderType);
    }

    if (selectedTerminalRegister.terminalBridgeUrl) {
      setTerminalBridgeUrl(selectedTerminalRegister.terminalBridgeUrl);
    }

    if (selectedTerminalRegister.cardTerminalId) {
      setTerminalId(selectedTerminalRegister.cardTerminalId);
    }

    if (selectedTerminalRegister.minuAgentUsername) {
      setMinuUsername(selectedTerminalRegister.minuAgentUsername);
    }

    if (selectedTerminalRegister.minuAgentBranchId) {
      setMinuBranchId(selectedTerminalRegister.minuAgentBranchId);
    }
  }, [selectedTerminalRegister]);

  useEffect(() => {
    setDistrictId("");
    setKhorooId("");
  }, [cityId]);

  useEffect(() => {
    if (!districtId) {
      setKhoroos([]);
      setKhorooId("");
      return;
    }

    void (async () => {
      const response = await authFetch(
        `${API}/vendor/merchant/systemqr/khoroo/${encodeURIComponent(districtId)}`,
      );
      if (!response.ok) return;
      const data = await response.json().catch(() => null);
      setKhoroos(Array.isArray(data?.khoroos) ? data.khoroos : []);
    })();
  }, [districtId]);

  const handleManualConnect = async () => {
    const merchantCode = manualMerchantCode.trim();
    if (!merchantCode) {
      setMessage({ type: "error", text: "Merchant code оруулна уу" });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const response = await authFetch(`${API}/vendor/merchant/connect`, {
        method: "POST",
        body: JSON.stringify({
          merchantId: merchantCode,
          merchantKey: "systemqr",
          invoiceCode: "SYSTEMQR",
          ...(organizationId ? { organizationId } : {}),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Merchant code холбох үед алдаа гарлаа",
        );
      }

      setManualMerchantCode("");
      setMessage({
        type: "success",
        text: data.message || "Merchant code холбогдлоо",
      });
      await loadStatus();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Серверийн алдаа",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    const merchantTitle = merchantName.trim();
    const account = accountNumber.trim();
    const confirmAccount = accountNumberConfirm.trim();
    const ownerFirstName =
      merchantType === "company"
        ? firstName.trim() || merchantTitle
        : firstName.trim();
    const ownerLastName =
      merchantType === "company" ? lastName.trim() || "-" : lastName.trim();

    if (
      !registerNumber.trim() ||
      !merchantTitle ||
      !cityId ||
      !districtId ||
      !khorooId ||
      !building.trim() ||
      !doorNo.trim() ||
      !phone.trim() ||
      !subCategoryId ||
      !account ||
      !accountName.trim()
    ) {
      setMessage({
        type: "error",
        text: "Заавал бөглөх талбаруудыг гүйцээнэ үү",
      });
      return;
    }

    if (merchantType === "company" && !corporateName.trim()) {
      setMessage({ type: "error", text: "Байгууллагын нэр оруулна уу" });
      return;
    }

    if (merchantType === "person" && (!ownerFirstName || !ownerLastName)) {
      setMessage({ type: "error", text: "Эзэмшигчийн овог, нэр оруулна уу" });
      return;
    }

    if (account !== confirmAccount) {
      setMessage({
        type: "error",
        text: "Дансны дугаар давтан оруулахад зөрж байна",
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const bankAccount = {
        account_bank_code: bankCode,
        account_number: account,
        account_name: accountName.trim(),
        is_default: true,
      };
      const response = await authFetch(`${API}/vendor/merchant/register`, {
        method: "POST",
        body: JSON.stringify({
          provider: "systemqr",
          type: merchantType,
          merchantName: merchantTitle,
          accountNumber: account,
          bankCode,
          cityId,
          districtId,
          khorooId,
          building: building.trim(),
          doorNo: doorNo.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          firstName: ownerFirstName,
          lastName: ownerLastName,
          corporateFlag: merchantType === "company" ? "1" : "0",
          corporateName:
            merchantType === "company" ? corporateName.trim() : undefined,
          registerNumber: registerNumber.trim(),
          gender,
          subCategoryId,
          bank_accounts: [bankAccount],
          ...(organizationId ? { organizationId } : {}),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Submerchant бүртгэхэд алдаа гарлаа");
      }

      setMessage({
        type: "success",
        text: data.message || "Minu Dynamic QR submerchant бүртгэгдлээ",
      });
      setTab("manual");
      await loadStatus();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Серверийн алдаа",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConnectPosTerminal = async () => {
    if (!selectedTerminalRegister) {
      setTerminalMessage({ type: "error", text: "POS register сонгоно уу" });
      return;
    }

    if (terminalProvider === "MINU_AGENT" && !terminalId.trim()) {
      setTerminalMessage({
        type: "error",
        text: "Minu Agent terminalId оруулна уу",
      });
      return;
    }

    setTerminalSubmitting(true);
    setTerminalMessage(null);
    try {
      const updated =
        terminalProvider === "ANDROID_PGW"
          ? await connectRestaurantCardTerminal({
              registerId: selectedTerminalRegister.id,
              providerType: "ANDROID_PGW",
              terminalBridgeUrl:
                terminalBridgeUrl.trim() || DEFAULT_ANDROID_PGW_BRIDGE_URL,
            })
          : await connectRestaurantCardTerminal({
              registerId: selectedTerminalRegister.id,
              providerType: "MINU_AGENT",
              cardTerminalId: terminalId.trim(),
              minuAgentUsername: minuUsername.trim() || undefined,
              minuAgentPassword: minuPassword.trim() || undefined,
              minuAgentBranchId: minuBranchId.trim() || undefined,
            });

      setPosRegisters((current) =>
        current.map((register) =>
          register.id === updated.id ? { ...register, ...updated } : register,
        ),
      );
      setSelectedTerminalRegisterId(updated.id);
      setMinuPassword("");
      setTerminalMessage({
        type: "success",
        text: `${updated.cardProviderType || terminalProvider} terminal холбогдлоо`,
      });
    } catch (error) {
      setTerminalMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "POS terminal холбох үед алдаа гарлаа",
      });
    } finally {
      setTerminalSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Minu Dynamic QR тохиргоог салгах уу?")) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const response = await authFetch(`${API}/vendor/merchant/disconnect`, {
        method: "POST",
        body: JSON.stringify(organizationId ? { organizationId } : {}),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Merchant салгахад алдаа гарлаа");
      }
      setMessage({
        type: "success",
        text: data.message || "Merchant салгагдлаа",
      });
      await loadStatus();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Серверийн алдаа",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const connected = Boolean(status?.isConnected && status.merchantId);

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
            Payment settings
          </p>
          <h3 className="mt-1 text-2xl font-black text-slate-950">
            Minu Dynamic QR submerchant
          </h3>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            Restaurant QR menu-ийн QPay төлбөр энэ org-level submerchant-ийг
            ашиглана. POS register дээр merchant тохируулах шаардлагагүй.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadStatus()}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      {message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-bold ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
                POS terminal
              </p>
              <h4 className="mt-1 text-xl font-black text-slate-950">
                Картын терминал холболт
              </h4>
              <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                Рестораны касс дээр картын төлбөр авах terminal-аа эндээс
                холбоно. Нэг байгууллагын холболттой terminal-ыг бусад касс
                автоматаар ашиглаж чадна.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadPosRegisters()}
            disabled={terminalLoading || terminalSubmitting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {terminalLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Шинэчлэх
          </button>
        </div>

        {terminalMessage ? (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${
              terminalMessage.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {terminalMessage.text}
          </div>
        ) : null}

        {terminalLoading ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-500">
            POS register жагсаалт ачаалж байна...
          </div>
        ) : posRegisters.length === 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
            POS register олдсонгүй. Эхлээд рестораны касс дээр register үүсгээд
            дараа нь terminal холбоно.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <Field label="POS register">
                <select
                  value={selectedTerminalRegisterId}
                  onChange={(event) =>
                    setSelectedTerminalRegisterId(event.target.value)
                  }
                  disabled={terminalSubmitting}
                  className={inputClass}
                >
                  {posRegisters.map((register) => (
                    <option key={register.id} value={register.id}>
                      {register.label || register.name} · {register.branch.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div
                className={`rounded-2xl border p-4 ${
                  terminalReady
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {terminalReady ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                  )}
                  <div>
                    <p
                      className={`font-black ${
                        terminalReady ? "text-emerald-950" : "text-slate-800"
                      }`}
                    >
                      {terminalReady
                        ? "Картын terminal бэлэн"
                        : "Terminal холбогдоогүй"}
                    </p>
                    <p
                      className={`mt-1 text-sm font-semibold ${
                        terminalReady ? "text-emerald-800" : "text-slate-500"
                      }`}
                    >
                      {terminalSourceLabel(
                        selectedTerminalRegister?.cardTerminalSource,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm font-bold text-slate-700 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Provider
                    </p>
                    <p className="mt-1 text-slate-950">
                      {selectedTerminalRegister?.cardProviderType || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Terminal ID
                    </p>
                    <p className="mt-1 break-all font-mono text-slate-950">
                      {selectedTerminalRegister?.cardTerminalId || "-"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Bridge URL
                    </p>
                    <p className="mt-1 break-all font-mono text-slate-950">
                      {selectedTerminalRegister?.terminalBridgeUrl || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div>
                <p className="font-black text-slate-950">
                  Terminal тохируулах
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  Android PGW нь cashier PC дээрх bridge ашиглана. Minu Agent нь
                  terminalId шаарддаг.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTerminalProvider("ANDROID_PGW")}
                  disabled={terminalSubmitting}
                  className={`h-11 rounded-xl border text-sm font-black ${
                    terminalProvider === "ANDROID_PGW"
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  } disabled:opacity-60`}
                >
                  Android PGW
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalProvider("MINU_AGENT")}
                  disabled={terminalSubmitting}
                  className={`h-11 rounded-xl border text-sm font-black ${
                    terminalProvider === "MINU_AGENT"
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  } disabled:opacity-60`}
                >
                  Minu Agent
                </button>
              </div>

              {terminalProvider === "ANDROID_PGW" ? (
                <Field label="Bridge URL">
                  <input
                    value={terminalBridgeUrl}
                    onChange={(event) => setTerminalBridgeUrl(event.target.value)}
                    placeholder={DEFAULT_ANDROID_PGW_BRIDGE_URL}
                    disabled={terminalSubmitting}
                    className={inputClass}
                  />
                </Field>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Terminal ID">
                    <input
                      value={terminalId}
                      onChange={(event) => setTerminalId(event.target.value)}
                      placeholder="terminalId"
                      disabled={terminalSubmitting}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Branch ID">
                    <input
                      value={minuBranchId}
                      onChange={(event) => setMinuBranchId(event.target.value)}
                      placeholder="optional"
                      disabled={terminalSubmitting}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Minu username">
                    <input
                      value={minuUsername}
                      onChange={(event) => setMinuUsername(event.target.value)}
                      placeholder="optional"
                      disabled={terminalSubmitting}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Minu password">
                    <input
                      value={minuPassword}
                      onChange={(event) => setMinuPassword(event.target.value)}
                      placeholder="Хоосон бол өмнөх password ашиглана"
                      type="password"
                      disabled={terminalSubmitting}
                      className={inputClass}
                    />
                  </Field>
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleConnectPosTerminal()}
                disabled={
                  terminalSubmitting ||
                  !selectedTerminalRegister ||
                  (terminalProvider === "MINU_AGENT" && !terminalId.trim())
                }
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {terminalSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Terminal холбох
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
          Merchant тохиргоо ачаалж байна...
        </div>
      ) : connected ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-black text-emerald-950">
                  Minu Dynamic QR холбогдсон
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-800">
                  Merchant code:{" "}
                  <span className="font-mono">{status?.merchantId}</span>
                </p>
                {status?.connectedAt ? (
                  <p className="mt-1 text-xs font-bold text-emerald-700">
                    {new Date(status.connectedAt).toLocaleString("mn-MN")}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleDisconnect()}
              disabled={submitting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 text-sm font-black text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
            >
              <Unplug className="h-4 w-4" />
              Салгах
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
          Minu Dynamic QR холбогдоогүй байна. Доороос merchant code холбох эсвэл
          шинээр submerchant бүртгэнэ.
        </div>
      )}

      <div className="grid overflow-hidden rounded-xl border border-slate-200 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setTab("manual")}
          className={`h-11 text-sm font-black ${
            tab === "manual"
              ? "bg-slate-950 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Merchant code холбох
        </button>
        <button
          type="button"
          onClick={() => setTab("register")}
          className={`h-11 text-sm font-black ${
            tab === "register"
              ? "bg-slate-950 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Шинээр бүртгэх
        </button>
      </div>

      {tab === "manual" ? (
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <Field label="Merchant Code / Submerchant code">
            <input
              value={manualMerchantCode}
              onChange={(event) => setManualMerchantCode(event.target.value)}
              placeholder="Жишээ: MC000123"
              className={inputClass}
            />
          </Field>
          <button
            type="button"
            onClick={() => void handleManualConnect()}
            disabled={submitting || !manualMerchantCode.trim()}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Холбох
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMerchantType("company")}
              className={`h-10 rounded-xl border text-sm font-black ${
                merchantType === "company"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              Байгууллага
            </button>
            <button
              type="button"
              onClick={() => setMerchantType("person")}
              className={`h-10 rounded-xl border text-sm font-black ${
                merchantType === "person"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              Хувь хүн
            </button>
          </div>

          <Field
            label={merchantType === "company" ? "УБД / Регистр" : "Регистр"}
          >
            <input
              value={registerNumber}
              onChange={(event) => setRegisterNumber(event.target.value)}
              placeholder={
                merchantType === "company" ? "9323472" : "АА12345678"
              }
              className={inputClass}
            />
          </Field>
          <Field label="QPay дээр харагдах нэр">
            <input
              value={merchantName}
              onChange={(event) => {
                setMerchantName(event.target.value);
                if (!accountName) setAccountName(event.target.value);
              }}
              placeholder="Restaurant name"
              className={inputClass}
            />
          </Field>

          {merchantType === "company" ? (
            <Field label="Байгууллагын нэр">
              <input
                value={corporateName}
                onChange={(event) => setCorporateName(event.target.value)}
                placeholder="ХХК нэр"
                className={inputClass}
              />
            </Field>
          ) : null}
          <Field label="Эзэмшигчийн нэр">
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Нэр"
              className={inputClass}
            />
          </Field>
          <Field label="Эзэмшигчийн овог">
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Овог"
              className={inputClass}
            />
          </Field>
          <Field label="Хүйс">
            <select
              value={gender}
              onChange={(event) => setGender(event.target.value as "M" | "F")}
              className={inputClass}
            >
              <option value="M">Эрэгтэй</option>
              <option value="F">Эмэгтэй</option>
            </select>
          </Field>

          <Field label="Утас">
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="99112233"
              className={inputClass}
            />
          </Field>
          <Field label="Имэйл">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="info@example.mn"
              className={inputClass}
            />
          </Field>

          <Field label="Үйл ажиллагааны чиглэл">
            <select
              value={subCategoryId}
              onChange={(event) => setSubCategoryId(event.target.value)}
              className={inputClass}
            >
              {categories.length > 0 ? (
                categories.map((category) => (
                  <option key={category.code} value={category.code}>
                    {category.categoryName
                      ? `${category.categoryName} - ${category.name}`
                      : category.name}
                  </option>
                ))
              ) : (
                <option value="36">Бусад</option>
              )}
            </select>
          </Field>
          <Field label="Хот / аймаг">
            {cities.length > 0 ? (
              <select
                value={cityId}
                onChange={(event) => setCityId(event.target.value)}
                className={inputClass}
              >
                <option value="">Сонгоно уу</option>
                {cities.map((city) => (
                  <option key={city.code} value={city.code}>
                    {city.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={cityId}
                onChange={(event) => setCityId(event.target.value)}
                placeholder="11000"
                className={inputClass}
              />
            )}
          </Field>

          <Field label="Дүүрэг / сум">
            {districts.length > 0 ? (
              <select
                value={districtId}
                onChange={(event) => setDistrictId(event.target.value)}
                className={inputClass}
              >
                <option value="">Сонгоно уу</option>
                {districts.map((district) => (
                  <option key={district.code} value={district.code}>
                    {district.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={districtId}
                onChange={(event) => setDistrictId(event.target.value)}
                placeholder="Дүүргийн код"
                className={inputClass}
              />
            )}
          </Field>
          <Field label="Хороо / баг">
            {khoroos.length > 0 ? (
              <select
                value={khorooId}
                onChange={(event) => setKhorooId(event.target.value)}
                className={inputClass}
              >
                <option value="">Сонгоно уу</option>
                {khoroos.map((khoroo) => (
                  <option key={khoroo.code} value={khoroo.code}>
                    {khoroo.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={khorooId}
                onChange={(event) => setKhorooId(event.target.value)}
                placeholder="Хорооны код"
                className={inputClass}
              />
            )}
          </Field>

          <Field label="Барилга / хашаа">
            <input
              value={building}
              onChange={(event) => setBuilding(event.target.value)}
              placeholder="Building"
              className={inputClass}
            />
          </Field>
          <Field label="Тоот">
            <input
              value={doorNo}
              onChange={(event) => setDoorNo(event.target.value)}
              placeholder="101"
              className={inputClass}
            />
          </Field>

          <Field label="Банк">
            <select
              value={bankCode}
              onChange={(event) => setBankCode(event.target.value)}
              className={inputClass}
            >
              {BANK_OPTIONS.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Данс эзэмшигч">
            <input
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder="Дансны нэр"
              className={inputClass}
            />
          </Field>
          <Field label="Дансны дугаар">
            <input
              value={accountNumber}
              onChange={(event) => {
                setAccountNumber(event.target.value);
                setAccountNumberConfirm("");
              }}
              placeholder="5000000000"
              className={inputClass}
            />
          </Field>
          <Field label="Дансны дугаар давтах">
            <input
              value={accountNumberConfirm}
              onChange={(event) => setAccountNumberConfirm(event.target.value)}
              placeholder="Давтан оруулна"
              className={inputClass}
            />
          </Field>

          <button
            type="button"
            onClick={() => void handleRegister()}
            disabled={submitting}
            className="md:col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Minu Dynamic QR submerchant бүртгэх
          </button>
        </div>
      )}
    </div>
  );
}
