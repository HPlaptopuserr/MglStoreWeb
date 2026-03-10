import { PartnershipForm } from "../../../../components/organisms/partnership/PartnershipForm";
import { PartnershipHero } from "../../../../components/organisms/partnership/PartnershipHero";

export default function PartnershipFormSection() {
  return (
    <section
      id="partnership-form"
      className="w-full bg-[#FFB700] py-24 px-4 md:px-6 lg:px-8 font-sans overflow-hidden relative"
    >
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none overflow-hidden">
        <svg
          viewBox="0 0 1000 600"
          className="w-full h-full object-cover grayscale invert"
        >
          <path d="M150,200 L850,200 L800,500 L200,500 Z" fill="currentColor" />
        </svg>
      </div>

      <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/20 rounded-full blur-[120px]" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-600/20 rounded-full blur-[120px]" />

      <div className="mx-auto max-w-7xl relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">
          <div className="w-full lg:w-1/2 space-y-8">
            <header className="text-left text-white">
              <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-white/30">
                Нийлүүлэгч болох
              </span>
              <h2 className="text-4xl md:text-5xl font-black mb-6 leading-[1.1]">
                Үндэсний үйлдвэрлэлээ <br />
                <span className="text-slate-900">Хамтдаа дэмжье</span>
              </h2>
              <p className="text-white/80 text-lg leading-relaxed max-w-xl">
                Бид дотоодын үйлдвэрлэгчдийг зах зээлд гаргах, борлуулалтыг
                нэмэгдүүлэх нэгдсэн экосистемийг бүрдүүлж байна. Монголдоо
                мөнгөө үлдээх их үйлсэд таны оролцоо чухал.
              </p>
            </header>

            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/20 transition-transform hover:scale-105">
                <p className="text-3xl font-bold text-white tracking-tight">
                  24/7
                </p>
                <p className="text-sm text-white/70">Хяналтын систем</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/20 transition-transform hover:scale-105">
                <p className="text-3xl font-bold text-white tracking-tight">
                  100%
                </p>
                <p className="text-sm text-white/70">Монгол хөрөнгө оруулалт</p>
              </div>
            </div>

            <div className="hidden lg:block">
              <PartnershipHero />
            </div>
          </div>

          <div className="w-full lg:w-1/2 flex justify-center">
            <div className="w-full bg-white p-8 md:p-12 rounded-4xl shadow-2xl shadow-slate-900/10 border border-white/50 relative">
              <div className="absolute -top-4 -right-4 bg-slate-900 text-white p-4 rounded-2xl shadow-xl transform rotate-12 hidden md:block">
                <svg
                  className="w-6 h-6 text-[#FFB700]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <PartnershipForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
