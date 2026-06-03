import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  ClipboardCheck,
  FileText,
  GraduationCap,
  SearchCheck,
  Users,
} from "lucide-react";

const hrServices = [
  {
    title: "HR FIX",
    description: "Одоо байгаа HR асуудал, гэрээ, журам, эрсдэлийг богино хугацаанд цэгцлэх.",
    price: "100,000-аас",
    icon: ClipboardCheck,
  },
  {
    title: "HR BUILD",
    description: "Хөдөлмөрийн гэрээ, тушаал, дотоод журам, HR процессын суурь систем бүрдүүлэх.",
    price: "200,000-аас",
    icon: FileText,
  },
  {
    title: "HR SCALE",
    description: "Гүйцэтгэл, сургалт, тогтоц, шилдэг ажилтан татах дараагийн шатны зөвлөх үйлчилгээ.",
    price: "300,000-аас",
    icon: BriefcaseBusiness,
  },
];

const quickItems = [
  { label: "Ажилтан сонгон шалгаруулалт", icon: SearchCheck },
  { label: "HR бичиг баримт", icon: FileText },
  { label: "Дотоод журам ба бодлого", icon: ClipboardCheck },
  { label: "Багийн сургалт", icon: GraduationCap },
];

export function HrServicesSpotlight() {
  return (
    <section className="border-b border-slate-100 bg-white py-8 sm:py-10">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.45fr] lg:items-stretch">
          <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFAD02] text-slate-950">
                <Users className="h-6 w-6" />
              </div>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-[#FFAD02]">
                Онцлох үйлчилгээ
              </span>
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-[#FFAD02]">
              Human resources
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Хүний нөөцийн үйлчилгээ
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Ажилтан авах, гэрээ журам цэгцлэх, HR процесс байгуулах, сургалт хөгжлийн
              ажлыг нэг дороос сонгоно.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {quickItems.map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex min-h-[58px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#FFAD02]" />
                  <span className="text-xs font-semibold leading-4 text-slate-100">{label}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/info/hr"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FFAD02] px-5 text-sm font-black text-slate-950 transition-colors hover:bg-[#ffc247]"
              >
                Задаргаа харах <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/our-services#hr"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-5 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Захиалах
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {hrServices.map(({ title, description, price, icon: Icon }) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 bg-[#FAFAFA] p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#FFAD02] hover:bg-white hover:shadow-lg"
              >
                <div className="flex h-full min-h-[210px] flex-col">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF3D6] text-slate-950">
                      <Icon className="h-5 w-5" />
                    </div>
                    <BadgeCheck className="h-5 w-5 text-[#FFAD02]" />
                  </div>
                  <h3 className="mt-5 text-lg font-black tracking-tight text-slate-950">
                    {title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                  <div className="mt-5 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <span className="text-xs font-semibold text-slate-500">Үнэ</span>
                    <p className="text-sm font-black text-slate-950">{price}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
