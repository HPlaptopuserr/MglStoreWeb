import { PartnershipForm } from "../../../../components/organisms/partnership/PartnershipForm";
import { PartnershipHero } from "../../../../components/organisms/partnership/PartnershipHero";

export default function PartnershipFormSection() {
  return (
    <section className="w-full bg-[#FFB700] py-20 px-4 md:px-6 lg:px-8 font-sans overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="mx-auto max-w-7xl relative z-10">
        <header className="text-center mb-16 text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Мерчант болох хүсэлт илгээх
          </h2>
          <p className="text-white/90 text-base max-w-2xl mx-auto">
            Та доорх маягтыг бөглөснөөр бидэнтэй хамтран ажиллах боломжтой
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <PartnershipForm />
          <PartnershipHero />
        </div>
      </div>
    </section>
  );
}
