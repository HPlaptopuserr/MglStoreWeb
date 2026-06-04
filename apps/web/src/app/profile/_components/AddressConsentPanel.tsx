import {
  AlertCircle,
  Check,
  Home,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
} from "lucide-react";
import type { FormEvent } from "react";
import type { ProfileFormState } from "./types";

type AddressConsentPanelProps = {
  form: ProfileFormState;
  saving: boolean;
  saved: boolean;
  error: string;
  onChange: (patch: Partial<ProfileFormState>) => void;
  onSubmit: (event: FormEvent) => void;
};

export function AddressConsentPanel({
  form,
  saving,
  saved,
  error,
  onChange,
  onSubmit,
}: AddressConsentPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">
          Address & consent
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Гэрийн хаяг ба зөвшөөрөл
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Хүргэлт, үйлчилгээний захиалга, төлбөртэй материалын account эрх дээр
          ашиглагдах үндсэн тохиргоо.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
              Хаягийн нэр
            </label>
            <div className="relative">
              <Home className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={form.addressLabel}
                onChange={(event) =>
                  onChange({ addressLabel: event.target.value })
                }
                placeholder="Гэр, оффис..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
              Дэлгэрэнгүй хаяг
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
              <textarea
                value={form.fullAddress}
                onChange={(event) =>
                  onChange({ fullAddress: event.target.value })
                }
                rows={4}
                placeholder="Аймаг/дүүрэг, хороо, байр, тоот..."
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["city", "Хот/аймаг", form.city],
              ["district", "Дүүрэг/сум", form.district],
              ["khoroo", "Хороо", form.khoroo],
              ["apartment", "Байр/тоот", form.apartment],
            ].map(([key, label, value]) => (
              <div key={key}>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                  {label}
                </label>
                <input
                  value={value}
                  onChange={(event) =>
                    onChange({ [key]: event.target.value } as Partial<ProfileFormState>)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-950 p-5 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-orange-200">
              <ShieldCheck size={24} />
            </div>
            <h3 className="mt-4 text-xl font-black">Зөвшөөрөл</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/55">
              Худалдан авалт, төлбөртэй файл хадгалалт, M point log болон
              үйлчилгээний хүсэлтүүд account дээр бүртгэгдэх нөхцөлийг
              зөвшөөрнө.
            </p>
          </div>

          <label className="flex cursor-pointer gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(event) =>
                onChange({ acceptTerms: event.target.checked })
              }
              className="mt-1 h-5 w-5 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
            />
            <span>
              <span className="block text-sm font-black text-slate-950">
                Үйлчилгээний нөхцөл зөвшөөрөх
              </span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                Төлбөртэй үйлчилгээ авахад заавал шаардлагатай.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={form.marketingConsent}
              onChange={(event) =>
                onChange({ marketingConsent: event.target.checked })
              }
              className="mt-1 h-5 w-5 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
            />
            <span>
              <span className="block text-sm font-black text-slate-950">
                Мэдэгдэл, санал авах
              </span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                Урамшуулал болон account-тэй холбоотой мэдэгдэл.
              </span>
            </span>
          </label>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              <Check size={16} />
              Хаяг, зөвшөөрөл хадгалагдлаа
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:brightness-105 disabled:opacity-60"
          >
            {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </form>
    </section>
  );
}
