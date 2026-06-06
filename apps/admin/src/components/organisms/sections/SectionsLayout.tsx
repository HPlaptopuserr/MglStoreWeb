import { Save, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import type { SectionKey } from "@/lib/sections/types";
import { SECTIONS } from "@/lib/sections/constants";
import { SectionsSidebar } from "./SectionsSidebar";

type Props = {
  active: SectionKey;
  setActive: (key: SectionKey) => void;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
  children: React.ReactNode;
  visibleSections?: typeof SECTIONS;
};

const SECTION_COPY: Record<
  SectionKey,
  { eyebrow: string; title: string; description: string }
> = {
  banner: {
    eyebrow: "Homepage",
    title: "Промо баннер",
    description:
      "Нүүр хуудасны hero slider, campaign banner болон default загваруудыг удирдана.",
  },
  categories: {
    eyebrow: "Catalog",
    title: "Ангилал",
    description:
      "Нүүр хуудсанд харагдах ангиллын дараалал, сонголтыг тохируулна.",
  },
  branches: {
    eyebrow: "Locations",
    title: "Салбар байршил",
    description:
      "Салбар дэлгүүрүүдийн хаяг, координат болон web map-ийн харагдах төлвийг удирдана.",
  },
  cards: {
    eyebrow: "Printing",
    title: "Карт хэвлэх",
    description:
      "Гишүүн байгууллагын карт, өнгөний scheme болон хэвлэх layout-ийг бэлдэнэ.",
  },
  qr: {
    eyebrow: "Utilities",
    title: "QR Generator",
    description:
      "Холбоос, үйлчилгээ, мэдээллийн QR кодыг хурдан үүсгэх туслах хэрэгсэл.",
  },
  pos: {
    eyebrow: "Operations",
    title: "POS Register",
    description:
      "Салбарын касс, register болон төлбөрийн төхөөрөмжийн тохиргоог удирдана.",
  },
  "vendor-features": {
    eyebrow: "Vendor app",
    title: "Vendor тохиргоо",
    description:
      "Vendor хэрэглэгчдэд нээлттэй байх боломж, функцуудыг тохируулна.",
  },
  hr: {
    eyebrow: "People",
    title: "Хүний нөөц",
    description:
      "Ажилтан, эрх, байгууллагын багийн зохион байгуулалтыг хянана.",
  },
  forms: {
    eyebrow: "Forms",
    title: "Маягт үүсгэгч",
    description:
      "Public form, бүртгэлийн маягт болон custom талбаруудыг үүсгэнэ.",
  },
  survey: {
    eyebrow: "Survey",
    title: "Судалгаа",
    description:
      "Маягт үүсгэгчээс бэлдсэн маягтыг сонгож, web дээр судалгааны хэсэг болгон нээж ажиллуулна.",
  },
  team: {
    eyebrow: "Company",
    title: "Баг хамт олон",
    description: "Компанийн танилцуулга, багийн гишүүдийн мэдээллийг удирдана.",
  },
  "mgl-services": {
    eyebrow: "Services",
    title: "MGL Үйлчилгээ",
    description:
      "Мэргэжлийн үйлчилгээний ангилал, багц, үнэ болон сонголтуудыг шинэчилнэ.",
  },
  "hr-services": {
    eyebrow: "People services",
    title: "HR үйлчилгээ",
    description:
      "Web header дээр гарах хүний нөөцийн үйлчилгээний бүлэг, багц, үнэ болон сонголтуудыг удирдана.",
  },
  franchise: {
    eyebrow: "Franchise",
    title: "Franchise",
    description:
      "Франчайз танилцуулга, зураг, PDF болон нийтлэгдэх төлвийг удирдана.",
  },
  projects: {
    eyebrow: "Projects",
    title: "Төсөл",
    description:
      "Төслийн зураг, PDF, үнэ, дэлгэрэнгүй мэдээлэл болон нийтлэгдэх төлвийг удирдана.",
  },
};

export function SectionsLayout({
  active,
  setActive,
  onSave = () => {},
  saving = false,
  saved = false,
  children,
  visibleSections,
}: Props) {
  const activeInfo = SECTION_COPY[active];
  const activeSection = (visibleSections ?? SECTIONS).find(
    (section) => section.key === active,
  );
  const ActiveIcon = activeSection?.icon ?? Sparkles;
  const showSave = active === "banner" || active === "categories";

  return (
    <div className="relative -m-4 min-h-[calc(100vh-5rem)] bg-[#f6f7fb] p-4 sm:-m-6 sm:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
        <div className="sticky top-3 z-30 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <SectionsSidebar
                active={active}
                onSelect={setActive}
                visibleSections={visibleSections}
              />
            </div>

            {showSave && (
              <button
                onClick={onSave}
                disabled={saving}
                className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-sm transition-all disabled:opacity-60 ${
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
