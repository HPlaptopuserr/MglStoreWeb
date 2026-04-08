"use client";
import { CareersPhone } from "@/components/organisms/careers/CareersPhone";
import { CareersForm } from "@/components/organisms/careers/CareersForm";

export default function CareersFormSection() {
  return (
    <section
      id="job-form"
      className="w-full bg-linear-to-br from-[#FFB700] to-[#FF9500] pt-24 px-4 md:px-6 lg:px-8 font-sans overflow-hidden relative"
    >
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-16 text-white">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight drop-shadow-sm">
            Бидэнтэй Нэгдээрэй
          </h2>
          <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
            Таны ирээдүй, таны гарт. Мөрөөдлийн ажлаа өнөөдөр эхлүүлээрэй.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-7 relative">
            <CareersForm />
          </div>

          <div className="md:pl-20">
            <CareersPhone />
          </div>
        </div>
      </div>
    </section>
  );
}