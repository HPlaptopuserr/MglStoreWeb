type ProjectsHeroProps = {
  loading: boolean;
  projectCount: number;
};

export function ProjectsHero({ loading, projectCount }: ProjectsHeroProps) {
  return (
    <section className="relative z-10 mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200">
          <span className="h-px w-8 bg-orange-300/70" />
          Dynamic QR access
        </div>
        <h1 className="mt-4 text-4xl font-black leading-none tracking-tight text-white sm:text-5xl">
          Төсөл{" "}
          <span className="font-serif text-3xl text-orange-200 sm:text-4xl">
            хөтөлбөрүүд
          </span>
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-orange-50/70">
          Admin-аас нийтэлсэн төслүүдийн хураангуйг үзээд, дэлгэрэнгүй мэдээлэл
          болон PDF файлыг Dynamic QR төлбөрөөр нээнэ.
        </p>
      </div>

      <div className="w-fit rounded-xl border border-orange-200/20 bg-white/[0.04] px-5 py-4 text-sm font-black text-orange-100 shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
        {loading ? "Ачаалж байна" : `${projectCount} төсөл бэлэн`}
      </div>
    </section>
  );
}

