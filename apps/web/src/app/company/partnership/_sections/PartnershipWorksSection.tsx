import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  Handshake,
  BarChart3,
  Globe,
  Users,
  ShieldCheck,
  Zap,
  Target,
  Truck,
  ArrowUpRight,
} from "lucide-react";

interface ServiceStep {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
  iconColor: string;
  borderAccent: string;
}

const steps: ServiceStep[] = [
  {
    title: "Зах зээлийг тэлэх",
    description:
      "Улаанбаатар хотын иргэн бүртэй холбогдож, бүтээгдэхүүнээ олон мянган хүнд санал болгох боломжтой.",
    icon: Handshake,
    accent: "from-amber-500/10 to-orange-500/5",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    borderAccent: "group-hover:border-amber-500/30",
  },
  {
    title: "Шоппер карт",
    description:
      "Захиалга бүрийн төлбөрийг тухай бүр шилжүүлж, бизнесийн хөрвөх чадварыг сайжруулж, мөнгөн урсгалыг нэмэгдүүлнэ.",
    icon: Target,
    accent: "from-blue-500/10 to-cyan-500/5",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    borderAccent: "group-hover:border-blue-500/30",
  },
  {
    title: "Маркетинг дэмжлэг",
    description:
      "Хамтарсан маркетинг, тусгай урамшуулал, зорилтот сурталчилгааг ашиглан бүтээгдэхүүнийг хэрэглэгчдэд ойртуулна.",
    icon: Zap,
    accent: "from-violet-500/10 to-purple-500/5",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
    borderAccent: "group-hover:border-violet-500/30",
  },
  {
    title: "Найдвартай хүргэлт",
    description:
      "Хүргэлтийн бүх үе шатыг хариуцаж, хурдан найдвартай үйлчилгээ үзүүлнэ. Та бизнесийнхээ өсөлтөд төвлөрч болно.",
    icon: Truck,
    accent: "from-emerald-500/10 to-green-500/5",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    borderAccent: "group-hover:border-emerald-500/30",
  },
  {
    title: "Борлуулалтын аналитик",
    description:
      "Борлуулалтын анализыг нарийвчилсан цагийн горимд хүлээн авч, бизнесийн стратегийг оновчтой болгоно.",
    icon: BarChart3,
    accent: "from-rose-500/10 to-pink-500/5",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-500",
    borderAccent: "group-hover:border-rose-500/30",
  },
  {
    title: "Захиалгын удирдлага",
    description:
      "Хүссэн үедээ бүтээгдэхүүн нэмэх, захиалга удирдах боломжтой дижитал платформ.",
    icon: Globe,
    accent: "from-cyan-500/10 to-teal-500/5",
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-500",
    borderAccent: "group-hover:border-cyan-500/30",
  },
  {
    title: "Мэдээллийн аюулгүй байдал",
    description:
      "Олон улсын стандартад нийцсэн мэдээллийн хамгаалалт, хэрэглэгчийн нууцлалын баталгаа.",
    icon: ShieldCheck,
    accent: "from-sky-500/10 to-blue-500/5",
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-500",
    borderAccent: "group-hover:border-sky-500/30",
  },
  {
    title: "Бизнес түншлэл",
    description:
      "B2B харилцааг өргөжүүлж, бизнесийн сүлжээндээ шинэ боломжуудыг нэмэгдүүлнэ.",
    icon: Users,
    accent: "from-orange-500/10 to-amber-500/5",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    borderAccent: "group-hover:border-orange-500/30",
  },
];

export const PartnershipWorksSection: React.FC = () => {
  return (
    <section className="relative py-24 px-4 md:px-6 lg:px-8 bg-gradient-to-b from-white via-gray-50/80 to-white overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#FFB700]/[0.03] rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/[0.02] rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFB700]/10 border border-[#FFB700]/20 text-[#FFB700] text-sm font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFB700]"></span>
            Давуу талууд
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Бидэнтэй хамтран ажиллахын{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFB700] to-orange-500">
              давуу талууд
            </span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Энгийн, ил тод, үр дүнтэй үйл явц. Манай экосистемд нэгдэж бизнесээ
            цэцэглүүлээрэй.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className={`group relative bg-white rounded-2xl border border-gray-100 ${step.borderAccent} p-6 transition-all duration-500 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 cursor-default`}
            >
              {/* Gradient overlay on hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${step.accent} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              ></div>

              <div className="relative z-10">
                {/* Number + Icon row */}
                <div className="flex items-center justify-between mb-5">
                  <div
                    className={`w-12 h-12 ${step.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                  >
                    <step.icon
                      className={`w-6 h-6 ${step.iconColor}`}
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="text-4xl font-bold text-gray-100 group-hover:text-gray-200/80 transition-colors select-none">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-gray-900 transition-colors">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-3">
                  {step.description}
                </p>

                {/* Hover arrow */}
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-400 group-hover:text-[#FFB700] transition-colors duration-300">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Дэлгэрэнгүй
                  </span>
                  <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-0.5 -translate-y-0 group-hover:-translate-y-0.5 transition-all duration-300" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom stat bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              value: "500+",
              label: "Түнш байгууллага",
              color: "text-[#FFB700]",
            },
            {
              value: "50K+",
              label: "Идэвхтэй хэрэглэгч",
              color: "text-blue-500",
            },
            {
              value: "99.9%",
              label: "Системийн тогтвортой байдал",
              color: "text-emerald-500",
            },
            {
              value: "24/7",
              label: "Техникийн дэмжлэг",
              color: "text-violet-500",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-6 bg-white rounded-2xl border border-gray-100"
            >
              <div className={`text-3xl font-bold ${stat.color} mb-1`}>
                {stat.value}
              </div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
