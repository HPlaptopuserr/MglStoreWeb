import { Sparkles } from "lucide-react";

function StatsPill({
  membersCount,
  departmentsCount,
}: {
  membersCount: number;
  departmentsCount: number;
}) {
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-2xl border border-white/10 bg-white/[0.07] shadow-2xl shadow-black/20 backdrop-blur-md">
      <div className="px-6 py-4 text-center">
        <div className="text-2xl font-black text-white">{membersCount}</div>
        <div className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-white/45">
          Нийт гишүүн
        </div>
      </div>
      <div className="my-4 w-px bg-white/10" />
      <div className="px-6 py-4 text-center">
        <div className="text-2xl font-black text-white">{departmentsCount}</div>
        <div className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-white/45">
          Хэлтэс
        </div>
      </div>
    </div>
  );
}

export function TeamHero({
  loading,
  membersCount,
  departmentsCount,
}: {
  loading: boolean;
  membersCount: number;
  departmentsCount: number;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-[#070707]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,173,2,0.22),transparent_34%),radial-gradient(circle_at_85%_22%,rgba(14,165,233,0.16),transparent_24%),linear-gradient(180deg,#0a0a0a_0%,#111827_100%)]" />
      <div
        className="absolute inset-0 -z-10 opacity-[0.055]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-50 to-transparent" />

      <div className="relative mx-auto flex min-h-[320px] max-w-6xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:min-h-[380px] lg:py-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
          <Sparkles size={13} />
          Баг хамт олон
        </div>

        <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
          MGL Store-ийн ард ажиллаж буй баг
        </h1>

        <p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-slate-300 sm:text-base">
          Бүтээгдэхүүн, үйлчилгээ, түншлэл, хүний нөөцийн ажлыг өдөр бүр
          урагшлуулж буй мэргэжлийн хамт олонтой танилцаарай.
        </p>

        {!loading && membersCount > 0 && (
          <div className="mt-8">
            <StatsPill membersCount={membersCount} departmentsCount={departmentsCount} />
          </div>
        )}
      </div>
    </section>
  );
}
