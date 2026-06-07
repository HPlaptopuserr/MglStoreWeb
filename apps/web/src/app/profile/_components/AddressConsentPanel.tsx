import {
  AlertCircle,
  Check,
  CirclePlus,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
} from "lucide-react";
import type { FormEvent } from "react";
import type { AuthAddress } from "@/lib/auth-context";
import type { ProfileFormState } from "./types";

type AddressConsentPanelProps = {
  form: ProfileFormState;
  addresses: AuthAddress[];
  saving: boolean;
  saved: boolean;
  error: string;
  onChange: (patch: Partial<ProfileFormState>) => void;
  onSelectAddress: (address: AuthAddress) => void;
  onNewAddress: () => void;
  onSubmit: (event: FormEvent) => void;
};

const CITY_OPTIONS = ["Улаанбаатар"];
const DISTRICT_OPTIONS = [
  "Багануур",
  "Багахангай",
  "Баянгол",
  "Баянзүрх",
  "Налайх",
  "Сонгинохайрхан",
  "Сүхбаатар",
  "Хан-Уул",
  "Чингэлтэй",
];
const KHOROO_OPTIONS = Array.from({ length: 43 }, (_, index) => `${index + 1}-р хороо`);

export function AddressConsentPanel({
  form,
  addresses,
  saving,
  saved,
  error,
  onChange,
  onSelectAddress,
  onNewAddress,
  onSubmit,
}: AddressConsentPanelProps) {
  const selectedAddressId = form.addressId;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">
          Address & consent
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Хүргэлтийн хаяг ба зөвшөөрөл
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Хүргэлт, үйлчилгээний захиалга, төлбөртэй материалын account эрх дээр
          ашиглагдах үндсэн тохиргоо.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Хадгалсан хүргэлтийн хаягууд
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Өөр өөр байршил руу хүргүүлэхийн тулд хэдэн ч хаяг хадгалж болно.
                </p>
              </div>
              <button
                type="button"
                onClick={onNewAddress}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-orange-500"
              >
                <CirclePlus size={16} />
                Шинэ хаяг
              </button>
            </div>

            {addresses.length > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {addresses.map((address) => {
                  const active = selectedAddressId === address.id;
                  return (
                    <button
                      key={address.id}
                      type="button"
                      onClick={() => onSelectAddress(address)}
                      className={`rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-orange-300 bg-orange-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-orange-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-black text-slate-950">
                          {address.fullAddress}
                        </span>
                        {address.isDefault && (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">
                            Үндсэн
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
                        {[address.city, address.district, address.khoroo].filter(Boolean).join(", ") || "Байршлын мэдээлэл"}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-bold text-slate-500">
                Одоогоор хадгалсан хүргэлтийн хаяг алга.
              </div>
            )}
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
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Хот/аймаг
              </label>
              <select
                value={form.city}
                onChange={(event) => onChange({ city: event.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              >
                <option value="">Сонгох</option>
                {CITY_OPTIONS.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Дүүрэг/сум
              </label>
              <select
                value={form.district}
                onChange={(event) => onChange({ district: event.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              >
                <option value="">Сонгох</option>
                {DISTRICT_OPTIONS.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Хороо
              </label>
              <select
                value={form.khoroo}
                onChange={(event) => onChange({ khoroo: event.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              >
                <option value="">Сонгох</option>
                {KHOROO_OPTIONS.map((khoroo) => (
                  <option key={khoroo} value={khoroo}>
                    {khoroo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Байр/тоот
              </label>
              <input
                value={form.apartment}
                onChange={(event) => onChange({ apartment: event.target.value })}
                placeholder="Байр, орц, давхар, тоот"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Орц/хаалга
              </label>
              <input
                value={form.entrance}
                onChange={(event) => onChange({ entrance: event.target.value })}
                placeholder="Жишээ: 2-р орц, код 1234"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>
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
              checked={form.addressIsDefault}
              onChange={(event) =>
                onChange({ addressIsDefault: event.target.checked })
              }
              className="mt-1 h-5 w-5 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
            />
            <span>
              <span className="block text-sm font-black text-slate-950">
                Энэ хаягийг үндсэн болгох
              </span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                Checkout дээр эхэнд сонгогдох хаяг болно.
              </span>
            </span>
          </label>

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
