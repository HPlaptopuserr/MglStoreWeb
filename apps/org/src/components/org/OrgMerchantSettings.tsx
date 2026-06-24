"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Loader2, RefreshCw, Unplug } from "lucide-react";
import { API, authFetch, getStoredOrgUser } from "@/lib/api";

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

  useEffect(() => {
    setOrganizationId(getStoredOrgUser()?.organizationId || null);
  }, []);

  useEffect(() => {
    void loadStatus();
    void loadMeta();
  }, [loadMeta, loadStatus]);

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
