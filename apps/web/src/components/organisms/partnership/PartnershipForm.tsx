"use client";

import { useState, useEffect, useRef } from "react";
import {
  Building2,
  Briefcase,
  Clock,
  Mail,
  Phone,
  ArrowRight,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@mgl/ui";
import { API } from "@/lib/api";

interface BusinessCategory {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
}

const FALLBACK_CATEGORIES: BusinessCategory[] = [
  { id: "1", slug: "retail", name: "Худалдаа", icon: null, sortOrder: 0 },
  { id: "2", slug: "food", name: "Хоол үйлдвэрлэл", icon: null, sortOrder: 1 },
  { id: "3", slug: "service", name: "Үйлчилгээ", icon: null, sortOrder: 2 },
  { id: "4", slug: "pharmacy", name: "Эм, эмнэлэг", icon: null, sortOrder: 3 },
  {
    id: "5",
    slug: "electronics",
    name: "Электроник",
    icon: null,
    sortOrder: 4,
  },
  { id: "6", slug: "other", name: "Бусад", icon: null, sortOrder: 5 },
];

const MONGOLIAN_ORG_NAME_ALLOWED_CHARS = /[^А-Яа-яЁёӨөҮү\s"“”'.,№-]/g;
const MONGOLIAN_ORG_NAME_PATTERN = /^[А-Яа-яЁёӨөҮү\s"“”'.,№-]+$/;
const MONGOLIAN_ORG_NAME_ERROR =
  "Байгууллагын нэрийг зөвхөн монгол үсгээр бичнэ үү.";

export function PartnershipForm() {
  const [form, setForm] = useState({
    organizationName: "",
    businessCategory: "",
    operatingYears: "",
    email: "",
    phoneNumber: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");
  const [organizationNameError, setOrganizationNameError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/business-categories?level=0`)
      .then((r) => r.json())
      .then((data: BusinessCategory[]) =>
        setCategories(data?.length ? data : FALLBACK_CATEGORIES),
      )
      .catch(() => setCategories(FALLBACK_CATEGORIES));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectedCat = categories.find((c) => c.slug === form.businessCategory);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    if (name === "organizationName") {
      const rawSanitizedValue = value.replace(
        MONGOLIAN_ORG_NAME_ALLOWED_CHARS,
        "",
      );
      const hasBlockedChars = rawSanitizedValue !== value;
      const sanitizedValue = hasBlockedChars
        ? rawSanitizedValue.replace(/\s{2,}/g, " ").trim()
        : rawSanitizedValue;

      setOrganizationNameError(
        hasBlockedChars ? MONGOLIAN_ORG_NAME_ERROR : "",
      );
      setMessage(hasBlockedChars ? MONGOLIAN_ORG_NAME_ERROR : "");
      setMessageType("error");
      setForm((prev) => ({
        ...prev,
        organizationName: sanitizedValue,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setMessageType("error");

    if (!MONGOLIAN_ORG_NAME_PATTERN.test(form.organizationName.trim())) {
      setOrganizationNameError(MONGOLIAN_ORG_NAME_ERROR);
      setMessage(MONGOLIAN_ORG_NAME_ERROR);
      return;
    }

    if (form.email && !form.email.toLowerCase().endsWith("@gmail.com")) {
      setMessage("И-мэйл хаяг @gmail.com байх шаардлагатай");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API}/partner-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
          phoneNumber: form.phoneNumber,
          organizationName: form.organizationName.trim(),
          businessCategory: form.businessCategory,
          operatingYears: form.operatingYears
            ? Number(form.operatingYears)
            : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Хүсэлт илгээж чадсангүй");
      }

      setMessageType("success");
      setMessage("Хүсэлт илгээгдсэн, админ зөвшөөрсөнөөр бүртгэл идэвхжинэ.");
      setSubmitted(true);

      setForm({
        organizationName: "",
        businessCategory: "",
        operatingYears: "",
        email: "",
        phoneNumber: "",
      });
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative group">
      <div className="absolute -inset-1 rounded-[28px] bg-[#FFB700]/10 blur-sm transition duration-500 group-hover:bg-[#FFB700]/15"></div>

      <div className="relative flex flex-col rounded-[24px] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 md:rounded-[28px] md:p-8">
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Хүсэлт амжилттай илгээгдлээ!</h3>
            <p className="text-sm text-gray-600 max-w-sm">
              Таны хүсэлтийг хүлээн авлаа. Админ зөвшөөрсөнөөр бүртгэл идэвхжиж, таны и-мэйл рүү мэдэгдэл очно.
            </p>
            <button
              type="button"
              onClick={() => { setSubmitted(false); setMessage(""); }}
              className="mt-2 text-sm font-semibold text-[#FFB700] hover:text-[#e6a600] transition-colors"
            >
              Дахин хүсэлт илгээх
            </button>
          </div>
        ) : (
        <>
        <div className="mb-6 flex items-center justify-between gap-3 md:mb-8">
          <h3 className="text-2xl font-black text-gray-900">Бүртгүүлэх</h3>
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Нээлттэй
          </div>
        </div>

        <form className="space-y-4 md:space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="ml-1 text-base font-bold text-gray-800">
              Байгууллагын нэр
            </label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                name="organizationName"
                type="text"
                autoComplete="organization"
                value={form.organizationName}
                onChange={handleChange}
                placeholder="Компанийн нэрээ оруулна уу"
                className="block min-h-14 w-full rounded-xl border border-gray-200 bg-gray-50 p-4 pl-11 text-base text-gray-900 outline-none focus:border-[#FFB700] focus:ring-[#FFB700]"
                required
              />
            </div>
            {organizationNameError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {organizationNameError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-base font-bold text-gray-800">
              Үйл ажиллагааны чиглэл
            </label>

            <select
              tabIndex={-1}
              name="businessCategory"
              value={form.businessCategory}
              onChange={() => {}}
              required
              className="sr-only"
              aria-hidden="true"
            >
              <option value=""></option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            <div ref={catRef} className="relative">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 z-1 pointer-events-none" />

              <button
                type="button"
                onClick={() => setCatOpen((v) => !v)}
                className={`flex min-h-14 w-full items-center rounded-xl border bg-gray-50 p-4 pl-11 pr-10 text-left text-base outline-none transition-all ${
                  catOpen
                    ? "border-[#FFB700] ring-2 ring-[#FFB700]/30"
                    : "border-gray-200 hover:border-gray-300"
                } ${selectedCat ? "text-gray-900" : "text-gray-400"}`}
              >
                {selectedCat ? (
                  <span className="flex items-center gap-2">
                    {selectedCat.icon && (
                      selectedCat.icon.startsWith("data:image") || selectedCat.icon.startsWith("http") ? (
                        <img
                          src={selectedCat.icon}
                          alt=""
                          className="h-4 w-4 rounded object-cover"
                        />
                      ) : (
                        <span className="text-sm">{selectedCat.icon}</span>
                      )
                    )}
                    {selectedCat.name}
                  </span>
                ) : (
                  "Чиглэл сонгох"
                )}
              </button>

              <ChevronDown
                className={`absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform pointer-events-none ${catOpen ? "rotate-180" : ""}`}
              />

              {catOpen && (
                <ul
                  onWheel={(e) => e.stopPropagation()}
                  className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 max-h-60 overflow-auto overscroll-contain animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  {categories.map((cat) => {
                    const active = form.businessCategory === cat.slug;
                    return (
                      <li key={cat.slug}>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((p) => ({
                              ...p,
                              businessCategory: cat.slug,
                            }));
                            setCatOpen(false);
                          }}
                          className={`flex w-full items-center gap-2.5 px-4 py-3 text-left text-base transition-colors ${
                            active
                              ? "bg-[#FFB700]/10 text-[#FFB700] font-semibold"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {cat.icon ? (
                            cat.icon.startsWith("data:image") || cat.icon.startsWith("http") ? (
                              <img
                                src={cat.icon}
                                alt=""
                                className="h-5 w-5 rounded object-cover"
                              />
                            ) : (
                              <span className="text-base">{cat.icon}</span>
                            )
                          ) : (
                            <Briefcase className="h-4 w-4 text-gray-400 shrink-0" />
                          )}
                          <span className="flex-1">{cat.name}</span>
                          {active && (
                            <Check className="h-4 w-4 text-[#FFB700] shrink-0" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-base font-bold text-gray-800">
              Үйл ажиллагаа явуулсан жил
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Clock className="h-5 w-5" />
              </div>
              <input
                name="operatingYears"
                type="number"
                inputMode="numeric"
                min="0"
                value={form.operatingYears}
                onChange={handleChange}
                placeholder="Жил"
                className="block min-h-14 w-full rounded-xl border border-gray-200 bg-gray-50 p-4 pl-11 text-base text-gray-900 outline-none transition-colors focus:border-[#FFB700] focus:ring-[#FFB700]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            <div className="space-y-2">
              <label className="ml-1 flex items-center gap-1.5 text-base font-bold text-gray-800">
                И-мэйл
                <span className="text-xs font-normal text-gray-400">(сонголтот)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="block min-h-14 w-full rounded-xl border border-gray-200 bg-gray-50 p-4 pl-11 text-base text-gray-900 outline-none focus:border-[#FFB700] focus:ring-[#FFB700]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-base font-bold text-gray-800">
                Утасны дугаар
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  name="phoneNumber"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  placeholder="9911xxxx"
                  className="block min-h-14 w-full rounded-xl border border-gray-200 bg-gray-50 p-4 pl-11 text-base text-gray-900 outline-none focus:border-[#FFB700] focus:ring-[#FFB700]"
                  required
                />
              </div>
            </div>
          </div>

          {message && !submitted && (
            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
              messageType === "error"
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-green-50 border border-green-200 text-green-700"
            }`}>
              {messageType === "error" ? (
                <span className="shrink-0 text-red-500">⚠</span>
              ) : (
                <Check className="h-4 w-4 shrink-0 text-green-500" />
              )}
              {message}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="flex min-h-14 w-full transform items-center justify-center gap-2 rounded-xl bg-[#FFB700] py-4 text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 hover:bg-[#e6a600]"
          >
            <span className="text-lg font-black">
              {loading ? "Илгээж байна..." : "Илгээх"}
            </span>
            <ArrowRight className="h-5 w-5" />
          </Button>
        </form>
        </>
        )}
      </div>
    </div>
  );
}
