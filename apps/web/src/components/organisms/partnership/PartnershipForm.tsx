"use client";

import { useState } from "react";
import {
  Building2,
  Briefcase,
  Clock,
  Mail,
  Phone,
  ArrowRight,
} from "lucide-react";
import { Button } from "../../../../../../packages/ui/src/atoms/Button";

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

      const res = await fetch("http://localhost:4000/api/partner-requests", {
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
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                name="businessCategory"
                value={form.businessCategory}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-[#FFB700] focus:border-[#FFB700] block pl-11 p-3.5 appearance-none outline-none"
                required
              >
                <option value="">Чиглэл сонгох</option>
                <option value="retail">Худалдаа</option>
                <option value="service">Үйлчилгээ</option>
                <option value="food">Хоол үйлдвэрлэл</option>
                <option value="other">Бусад</option>
              </select>
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
              <label className="text-sm font-semibold text-gray-700 ml-1">
                И-мэйл
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
                  required
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
