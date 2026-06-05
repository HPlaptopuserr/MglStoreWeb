import { ArrowUpRight, Network, Sparkles } from "lucide-react";
import { NETWORK_COMPANIES, NetworkCompany } from "./team-network-data";

function NetworkCompanyCard({
  company,
  index,
}: {
  company: NetworkCompany;
  index: number;
}) {
  const Icon = company.icon;

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/70 bg-white p-5 shadow-sm shadow-slate-950/[0.04] transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-950/10">
      <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-br ${company.tone}`} />
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15" />
      <div className="absolute right-7 top-8 h-12 w-12 rounded-full bg-white/12" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/50 bg-white/20 text-white shadow-xl shadow-slate-950/10 backdrop-blur-md">
            <Icon size={28} />
          </div>
          <div className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white backdrop-blur-md">
            {String(index + 1).padStart(2, "0")}
          </div>
        </div>

        <div className="mt-14">
          <div className="mb-3 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-500">
            {company.label}
          </div>
          <h3 className="text-xl font-black tracking-tight text-slate-950">
            {company.name}
          </h3>
          <p className="mt-3 min-h-[72px] text-sm font-medium leading-6 text-slate-500">
            {company.description}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-sm font-black text-slate-700">{company.metric}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white transition group-hover:rotate-12 group-hover:bg-amber-500">
            <ArrowUpRight size={17} />
          </span>
        </div>
      </div>
    </article>
  );
}

export function TeamCompanyNetwork() {
  return (
    <section className="mb-10 rounded-[34px] border border-slate-200/80 bg-slate-950 p-4 shadow-2xl shadow-slate-950/10 sm:p-6">
      <div className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_15%_0%,rgba(251,191,36,0.22),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(14,165,233,0.18),transparent_28%),linear-gradient(135deg,#0f172a_0%,#020617_100%)] px-5 py-7 text-white sm:px-7">
        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-200 backdrop-blur-md">
              <Sparkles size={13} />
              Company network
            </div>
            <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              MGL сүлжээ байгууллагууд
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-300">
              Худалдаа, бизнес, логистик, санхүү, хөрөнгө оруулалт, нийлүүлэлтийн
              урсгалуудыг нэг ecosystem болгон холбож буй group company бүтэц.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 text-center backdrop-blur-md">
            <div>
              <div className="text-2xl font-black">{NETWORK_COMPANIES.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-white/45">
                нэгж
              </div>
            </div>
            <div className="border-x border-white/10 px-3">
              <div className="text-2xl font-black">6</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-white/45">
                чиглэл
              </div>
            </div>
            <div>
              <Network size={27} className="mx-auto mt-0.5" />
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/45">
                сүлжээ
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {NETWORK_COMPANIES.map((company, index) => (
          <NetworkCompanyCard key={company.id} company={company} index={index} />
        ))}
      </div>
    </section>
  );
}
