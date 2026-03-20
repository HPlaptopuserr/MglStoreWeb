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
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

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
          organizationName: form.organizationName,
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

      setMessage("Хүсэлт амжилттай илгээгдлээ.");

      setForm({
        organizationName: "",
        businessCategory: "",
        operatingYears: "",
        email: "",
        phoneNumber: "",
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative group">
      <div className="absolute -inset-1 bg-white/30 rounded-4xl blur-sm transition duration-500 group-hover:bg-white/40"></div>

      <div className="relative bg-white rounded-[1.75rem] p-8 md:p-10 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold text-gray-900">Хамтран ажиллах</h3>
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Нээлттэй
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 ml-1">
              Байгууллагын нэр
            </label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                name="organizationName"
                type="text"
                value={form.organizationName}
                onChange={handleChange}
                placeholder="Компанийн нэрээ оруулна уу"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-[#FFB700] focus:border-[#FFB700] block pl-11 p-3.5 outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 ml-1">
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
                className={`w-full bg-gray-50 border text-left text-sm rounded-xl pl-11 pr-10 p-3.5 outline-none transition-all flex items-center ${
                  catOpen
                    ? "border-[#FFB700] ring-2 ring-[#FFB700]/30"
                    : "border-gray-200 hover:border-gray-300"
                } ${selectedCat ? "text-gray-900" : "text-gray-400"}`}
              >
                {selectedCat ? (
                  <span className="flex items-center gap-2">
                    {selectedCat.icon && (
                      <img
                        src={selectedCat.icon}
                        alt=""
                        className="h-4 w-4 rounded object-cover"
                      />
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
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                            active
                              ? "bg-[#FFB700]/10 text-[#FFB700] font-semibold"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {cat.icon ? (
                            <img
                              src={cat.icon}
                              alt=""
                              className="h-5 w-5 rounded object-cover"
                            />
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

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 ml-1">
              Үйл ажиллагаа явуулсан жил
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Clock className="h-5 w-5" />
              </div>
              <input
                name="operatingYears"
                type="number"
                value={form.operatingYears}
                onChange={handleChange}
                placeholder="Жил"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-[#FFB700] focus:border-[#FFB700] block pl-11 p-3.5 transition-colors outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 ml-1 flex items-center gap-1.5">
                И-мэйл
                <span className="text-xs font-normal text-gray-400">(сонголтот)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-[#FFB700] focus:border-[#FFB700] block pl-11 p-3.5 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 ml-1">
                Утасны дугаар
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  name="phoneNumber"
                  type="tel"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  placeholder="9911xxxx"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-[#FFB700] focus:border-[#FFB700] block pl-11 p-3.5 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {message && (
            <div className="text-sm font-medium text-gray-700">{message}</div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-15 bg-[#FFB700] hover:bg-[#e6a600] text-white font-bold py-4 rounded-xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span className="text-lg">
              {loading ? "Илгээж байна..." : "Илгээх"}
            </span>
            <ArrowRight className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
