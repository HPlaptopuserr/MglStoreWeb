import { Building2, ShieldCheck } from "lucide-react";

const BENEFITS = [
  "Байгууллагын profile ба ажилтны эрх",
  "Нээлттэй module: бараа, үйлчилгээ, агуулах",
  "Хүнсний дэлгүүрт хэт уягдаагүй ерөнхий workflow",
];

export default function LoginHero() {
  return (
    <section className="hidden bg-slate-950 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
      <div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="mt-8 max-w-md text-4xl font-black tracking-tight">
          MGL Store байгууллагын удирдлага
        </h1>
        <p className="mt-4 max-w-lg text-sm font-semibold leading-7 text-slate-300">
          Дэлгүүр, үйлчилгээ, сургалт, холбоо, агуулахтай байгууллага гээд бүгд
          нэг ерөнхий удирдлагын орчноос өөрт хэрэгтэй модулиа ашиглана.
        </p>
      </div>

      <div className="grid gap-3">
        {BENEFITS.map((item) => (
          <div
            key={item}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-100"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
