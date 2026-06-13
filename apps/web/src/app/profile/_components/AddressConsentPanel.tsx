import {
  AlertCircle,
  Check,
  CirclePlus,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
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
  const [addressFormOpen, setAddressFormOpen] = useState(false);

  useEffect(() => {
    if (saved) setAddressFormOpen(false);
  }, [saved]);

  const openNewAddressForm = () => {
    onNewAddress();
    setAddressFormOpen(true);
  };

  const openEditAddressForm = (address: AuthAddress) => {
    onSelectAddress(address);
    setAddressFormOpen(true);
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-sm md:rounded-3xl md:p-6">
      <div className="mb-4 md:mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-500 md:text-xs md:tracking-[0.22em]">
          Address & consent
        </p>
        <h2 className="mt-1.5 text-xl font-black text-slate-950 md:mt-2 md:text-2xl">
          Хүргэлтийн хаяг ба зөвшөөрөл
        </h2>
        <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-500 md:mt-2 md:text-sm">
          Хүргэлт, үйлчилгээний захиалга, төлбөртэй материалын account эрх дээр
          ашиглагдах үндсэн тохиргоо.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <div className="space-y-4 md:space-y-5">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 md:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Хадгалсан хүргэлтийн хаягууд
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 md:text-sm">
                  Өөр өөр байршил руу хүргүүлэхийн тулд хэдэн ч хаяг хадгалж болно.
                </p>
              </div>
              <button
                type="button"
                onClick={openNewAddressForm}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-orange-500 sm:w-auto md:h-11"
              >
                <CirclePlus size={16} />
                Шинэ хаяг
              </button>
            </div>

            {addresses.length > 0 ? (
              <div className="mt-3 grid gap-2 md:mt-4 md:grid-cols-2">
                {addresses.map((address) => {
                  const active = selectedAddressId === address.id;
                  return (
                    <div
                      key={address.id}
                      className={`min-w-0 rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-orange-300 bg-orange-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-orange-200"
                      }`}
                    >
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-black text-slate-950">
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
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectAddress(address)}
                          className="h-9 rounded-xl bg-white px-3 text-xs font-black text-slate-600 ring-1 ring-slate-200"
                        >
                          Сонгох
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditAddressForm(address)}
                          className="h-9 rounded-xl bg-slate-950 px-3 text-xs font-black text-white"
                        >
                          Засах
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-bold text-slate-500">
                <p>Одоогоор хадгалсан хүргэлтийн хаяг алга.</p>
                <button
                  type="button"
                  onClick={openNewAddressForm}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-black text-white"
                >
                  Хаяг нэмэх
                </button>
              </div>
            )}
          </div>

          {addressFormOpen ? (
            <>
              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-950">
                      {selectedAddressId ? "Хаяг засах" : "Шинэ хаяг нэмэх"}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-slate-500">
                      Хаягаа бөглөөд хадгалах дарна.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddressFormOpen(false)}
                    className="h-9 shrink-0 rounded-xl bg-white px-3 text-xs font-black text-slate-600 ring-1 ring-orange-100"
                  >
                    Хаах
                  </button>
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
                rows={3}
                placeholder="Аймаг/дүүрэг, хороо, байр, тоот..."
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 md:py-4"
              />
            </div>
          </div>

          <div className="grid gap-3.5 md:grid-cols-2 md:gap-4">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Хот/аймаг
              </label>
              <select
                value={form.city}
                onChange={(event) => onChange({ city: event.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 md:py-4"
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
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 md:py-4"
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
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 md:py-4"
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
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 md:py-4"
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
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 md:py-4"
              />
            </div>
          </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center">
              <p className="text-sm font-black text-slate-800">
                Хаяг засах эсвэл нэмэх үед form энд гарна.
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Дээрээс хадгалсан хаягаа сонгоод засах, эсвэл шинэ хаяг нэмнэ.
              </p>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-3.5 md:space-y-4">
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3.5 text-slate-950 md:rounded-3xl md:bg-slate-950 md:p-5 md:text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm md:h-12 md:w-12 md:bg-white/10 md:text-orange-200 md:shadow-none">
              <ShieldCheck size={21} />
            </div>
            <h3 className="mt-2 text-base font-black md:mt-4 md:text-xl">Зөвшөөрөл</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 md:mt-2 md:text-sm md:leading-6 md:text-white/55">
              Худалдан авалт, төлбөртэй файл хадгалалт, M point log болон
              үйлчилгээний хүсэлтүүд account дээр бүртгэгдэх нөхцөлийг
              зөвшөөрнө.
            </p>
          </div>

          <label className="flex min-w-0 cursor-pointer gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 md:p-4">
            <input
              type="checkbox"
              checked={form.addressIsDefault}
              onChange={(event) =>
                onChange({ addressIsDefault: event.target.checked })
              }
              className="mt-1 h-5 w-5 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
            />
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-950">
                Энэ хаягийг үндсэн болгох
              </span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                Checkout дээр эхэнд сонгогдох хаяг болно.
              </span>
            </span>
          </label>

          <label className="flex min-w-0 cursor-pointer gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 md:p-4">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(event) =>
                onChange({ acceptTerms: event.target.checked })
              }
              className="mt-1 h-5 w-5 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
            />
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-950">
                Үйлчилгээний нөхцөл зөвшөөрөх
              </span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                Төлбөртэй үйлчилгээ авахад заавал шаардлагатай.
              </span>
            </span>
          </label>

          <label className="flex min-w-0 cursor-pointer gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 md:p-4">
            <input
              type="checkbox"
              checked={form.marketingConsent}
              onChange={(event) =>
                onChange({ marketingConsent: event.target.checked })
              }
              className="mt-1 h-5 w-5 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
            />
            <span className="min-w-0">
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:brightness-105 disabled:opacity-60 md:py-4"
          >
            {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </form>
    </section>
  );
}
