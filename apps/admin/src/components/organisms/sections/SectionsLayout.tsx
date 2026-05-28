import { Save, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import type { SectionKey } from "@/lib/sections/types";
import { SECTIONS } from "@/lib/sections/constants";
import { SectionsSidebar } from "./SectionsSidebar";

type Props = {
  active: SectionKey;
  setActive: (key: SectionKey) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  children: React.ReactNode;
  visibleSections?: typeof SECTIONS;
};

const SECTION_COPY: Record<SectionKey, { eyebrow: string; title: string; description: string }> = {
  banner: {
    eyebrow: "Homepage",
    title: "Промо баннер",
    description: "Нүүр хуудасны hero slider, campaign banner болон default загваруудыг удирдана.",
  },
  categories: {
    eyebrow: "Catalog",
    title: "Ангилал",
    description: "Нүүр хуудсанд харагдах ангиллын дараалал, сонголтыг тохируулна.",
  },
  branches: {
    eyebrow: "Locations",
    title: "Салбар байршил",
    description: "Салбар дэлгүүрүүдийн хаяг, координат болон web map-ийн харагдах төлвийг удирдана.",
  },
  cards: {
    eyebrow: "Printing",
    title: "Карт хэвлэх",
    description: "Гишүүн байгууллагын карт, өнгөний scheme болон хэвлэх layout-ийг бэлдэнэ.",
  },
  qr: {
    eyebrow: "Utilities",
    title: "QR Generator",
    description: "Холбоос, үйлчилгээ, мэдээллийн QR кодыг хурдан үүсгэх туслах хэрэгсэл.",
  },
  pos: {
    eyebrow: "Operations",
    title: "POS Register",
    description: "Салбарын касс, register болон төлбөрийн төхөөрөмжийн тохиргоог удирдана.",
  },
  "vendor-features": {
    eyebrow: "Vendor app",
    title: "Vendor тохиргоо",
    description: "Vendor хэрэглэгчдэд нээлттэй байх боломж, функцуудыг тохируулна.",
  },
  hr: {
    eyebrow: "People",
    title: "Хүний нөөц",
    description: "Ажилтан, эрх, байгууллагын багийн зохион байгуулалтыг хянана.",
  },
  forms: {
    eyebrow: "Forms",
    title: "Маягт үүсгэгч",
    description: "Public form, бүртгэлийн маягт болон custom талбаруудыг үүсгэнэ.",
  },
  team: {
    eyebrow: "Company",
    title: "Баг хамт олон",
    description: "Компанийн танилцуулга, багийн гишүүдийн мэдээллийг удирдана.",
  },
  "mgl-services": {
    eyebrow: "Services",
    title: "MGL Үйлчилгээ",
    description: "Мэргэжлийн үйлчилгээний ангилал, багц, үнэ болон сонголтуудыг шинэчилнэ.",
  },
  projects: {
    eyebrow: "Franchise",
    title: "Franchise",
    description: "Franchise боломжуудын зураг, PDF, үнэ болон нийтлэгдэх төлвийг удирдана.",
  },
};

export function SectionsLayout({
  active,
  setActive,
  onSave,
  saving,
  saved,
  children,
  visibleSections,
}: Props) {
  const activeInfo = SECTION_COPY[active];
  const activeSection = (visibleSections ?? SECTIONS).find((section) => section.key === active);
  const ActiveIcon = activeSection?.icon ?? Sparkles;
  const showSave = active === "banner" || active === "categories";

  return (
    <div className="relative -m-4 min-h-[calc(100vh-5rem)] bg-[#f6f7fb] p-4 sm:-m-6 sm:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-600">
                Content manager
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Нэмэлт хэсгүүд
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Нүүр хуудас болон public контент бүрийг тусдаа ажлын хэсгээр удирдана.
                Доорх хэсгээс сонгоод, баруун дээд хадгалах үйлдлийг ашиглана.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Нийт</p>
                <p className="mt-1 text-xl font-black text-slate-950">{(visibleSections ?? SECTIONS).length}</p>
              </div>
              <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-violet-400">Одоо засаж буй</p>
                <p className="mt-1 text-sm font-black text-violet-800">{activeInfo.title}</p>
              </div>
              {showSave && (
                <button
                  onClick={onSave}
                  disabled={saving}
                  className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-sm transition-all disabled:opacity-60 ${
                    saved
                      ? "bg-emerald-500"
                      : "bg-slate-950 hover:-translate-y-0.5 hover:bg-violet-700"
                  }`}
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : saved ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {saved ? "Хадгалагдлаа" : "Хадгалах"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <SectionsSidebar active={active} onSelect={setActive} visibleSections={visibleSections} />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {active !== "forms" && (
            <div className="border-b border-slate-100 bg-white px-5 py-5 sm:px-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <ActiveIcon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">
                      {activeInfo.eyebrow}
                    </p>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                      {activeInfo.title}
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                      {activeInfo.description}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  UI хэсэг сонгогдсон
                </div>
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
