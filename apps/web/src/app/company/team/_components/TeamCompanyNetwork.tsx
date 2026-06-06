import { ArrowUpRight, Building2, Network, Sparkles } from "lucide-react";
import { TeamNetworkCompany } from "./team-types";
import { NETWORK_COMPANIES } from "./team-network-data";

const TONES = [
  "from-amber-400 via-orange-500 to-red-500",
  "from-sky-400 via-blue-500 to-indigo-600",
  "from-emerald-400 via-teal-500 to-cyan-600",
  "from-violet-400 via-purple-500 to-fuchsia-600",
  "from-rose-400 via-pink-500 to-orange-500",
  "from-lime-400 via-green-500 to-emerald-600",
];

function getPartnerDescription(company: TeamNetworkCompany) {
  return (
    company.shortDescription ||
    company.description ||
    company.address ||
    "MGL Store ecosystem-д бүртгэлтэй түнш байгууллага."
  );
}

function NetworkCompanyCard({
  company,
  index,
}: {
  company: TeamNetworkCompany;
  index: number;
}) {
  const tone = TONES[index % TONES.length];
  const metric = company.stats?.branches
    ? `${company.stats.branches} салбар`
    : company.stats?.products
      ? `${company.stats.products} бүтээгдэхүүн`
      : company.isInvestor
        ? "Investor"
        : "Түнш";

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/70 bg-white p-5 shadow-sm shadow-slate-950/[0.04] transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-950/10">
      <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-br ${tone}`} />
      {company.bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={company.bannerUrl}
          alt=""
          className="absolute inset-x-0 top-0 h-28 w-full object-cover opacity-35 mix-blend-luminosity"
        />
      )}
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15" />
      <div className="absolute right-7 top-8 h-12 w-12 rounded-full bg-white/12" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/50 bg-white/20 text-white shadow-xl shadow-slate-950/10 backdrop-blur-md">
            {company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoUrl} alt={company.name} className="h-full w-full object-cover" />
            ) : (
              <Building2 size={28} />
            )}
          </div>
          <div className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white backdrop-blur-md">
            {String(index + 1).padStart(2, "0")}
          </div>
        </div>

        <div className="mt-14">
          <div className="mb-3 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-500">
            {company.businessCategory || (company.isInvestor ? "Investor" : "Partner")}
          </div>
          <h3 className="line-clamp-2 text-xl font-black tracking-tight text-slate-950">
            {company.name}
          </h3>
          <p className="mt-3 min-h-[72px] line-clamp-3 text-sm font-medium leading-6 text-slate-500">
            {getPartnerDescription(company)}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-sm font-black text-slate-700">{metric}</span>
          <a
            href={`/partners/${company.slug || company.id}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white transition group-hover:rotate-12 group-hover:bg-amber-500"
          >
            <ArrowUpRight size={17} />
          </a>
        </div>
      </div>
    </article>
  );
}

function fallbackNetworkCompanies(): TeamNetworkCompany[] {
  return NETWORK_COMPANIES.map((company) => ({
    id: company.id,
    name: company.name,
    slug: company.id,
    logoUrl: null,
    bannerUrl: null,
    businessCategory: company.label,
    description: company.description,
    shortDescription: company.description,
    address: null,
    isInvestor: company.label.toLowerCase().includes("investment"),
    stats: {},
  }));
}

export function TeamCompanyNetwork({
  companies,
}: {
  companies: TeamNetworkCompany[];
}) {
  const items = companies.length > 0 ? companies : fallbackNetworkCompanies();
  const directions = new Set(items.map((company) => company.businessCategory).filter(Boolean));

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
              Түнш байгууллагын бүртгэлээс шууд татагдаж буй ecosystem компаниуд.
              Түншүүдийн logo, тайлбар, салбар болон бүтээгдэхүүний мэдээлэл энд харагдана.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 text-center backdrop-blur-md">
            <div>
              <div className="text-2xl font-black">{items.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-white/45">
                байгууллага
              </div>
            </div>
            <div className="border-x border-white/10 px-3">
              <div className="text-2xl font-black">{directions.size || 1}</div>
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
        {items.map((company, index) => (
          <NetworkCompanyCard key={company.id} company={company} index={index} />
        ))}
      </div>
    </section>
  );
}
