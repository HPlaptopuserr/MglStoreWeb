import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

type Accent = {
  pageBg: string;
  border: string;
  heroBg: string;
  cardBg: string;
  glowPrimary: string;
  glowSecondary: string;
  eyebrow: string;
  panelBg: string;
  chipBg: string;
  chipText: string;
  marker: string;
  highlightBg: string;
};

export type InfoCard = {
  title: string;
  price: string;
  description?: string;
  points?: string[];
};

export type InfoPackage = {
  title: string;
  price: string;
  items: string[];
};

export type InfoHighlight = {
  label: string;
  value: string;
};

type InfoDetailPageProps = {
  accent: Accent;
  eyebrow: string;
  title: string;
  description: string;
  cardsEyebrow: string;
  cardsTitle: string;
  cards: InfoCard[];
  servicesEyebrow: string;
  servicesTitle: string;
  services: string[];
  packagesEyebrow: string;
  packagesTitle: string;
  packages: InfoPackage[];
  highlights?: InfoHighlight[];
  primaryAction?: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
};

export function InfoDetailPage({
  accent,
  eyebrow,
  title,
  description,
  cardsEyebrow,
  cardsTitle,
  cards,
  servicesEyebrow,
  servicesTitle,
  services,
  packagesEyebrow,
  packagesTitle,
  packages,
  highlights,
  primaryAction,
  secondaryAction,
}: InfoDetailPageProps) {
  const summaryItems =
    highlights && highlights.length > 0
      ? highlights
      : packages.slice(0, 2).map((pack) => ({
          label: pack.title,
          value: pack.price,
        }));

  return (
    <div className={`min-h-screen text-slate-900 ${accent.pageBg}`}>
      <section className={`border-b bg-white/70 ${accent.border}`}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div
            className={`relative isolate overflow-hidden rounded-[1.5rem] px-5 py-7 text-white shadow-[0_22px_70px_rgba(15,23,42,0.18)] sm:px-8 sm:py-9 lg:px-10 ${accent.heroBg}`}
          >
            <div
              className={`absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl ${accent.glowPrimary}`}
            />
            <div
              className={`absolute -bottom-24 left-8 h-60 w-60 rounded-full blur-3xl ${accent.glowSecondary}`}
            />
            <div className="relative grid items-center gap-7 lg:grid-cols-[1.12fr_0.88fr]">
              <div>
                <div
                  className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] ${accent.eyebrow}`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {eyebrow}
                </div>
                <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                  {title}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-200">
                  {description}
                </p>
                {(primaryAction || secondaryAction) && (
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    {primaryAction && (
                      <Link
                        href={primaryAction.href}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FFAD02] px-5 text-sm font-black text-slate-950 transition hover:bg-[#f4a200]"
                      >
                        {primaryAction.label}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                    {secondaryAction && (
                      <Link
                        href={secondaryAction.href}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/15"
                      >
                        {secondaryAction.label}
                      </Link>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur">
                <p className="text-sm font-black text-white">Товч мэдээлэл</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {summaryItems.map((highlight) => (
                    <div
                      key={highlight.label}
                      className="rounded-xl border border-white/10 bg-white/10 p-4"
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                        {highlight.label}
                      </p>
                      <p className="mt-2 text-lg font-black leading-7 text-white">
                        {highlight.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_280px] lg:px-8">
        <div className="space-y-8">
          <section
            id="prices"
            className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${accent.border}`}
          >
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p
                  className={`text-xs font-black uppercase tracking-[0.24em] ${accent.chipText}`}
                >
                  {cardsEyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  {cardsTitle}
                </h2>
              </div>
              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-black ${accent.chipBg} ${accent.chipText}`}
              >
                {cards.length} төрөл
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((item) => (
                <article
                  key={item.title}
                  className={`rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#FFAD02] hover:shadow-md ${accent.cardBg}`}
                >
                  <div className="flex h-full flex-col">
                    <h3 className="text-lg font-black leading-7 text-slate-950">
                      {item.title}
                    </h3>
                    <span
                      className={`mt-3 w-fit rounded-full px-3 py-1 text-sm font-black ${accent.chipBg} ${accent.chipText}`}
                    >
                      {item.price}
                    </span>
                    {item.description && (
                      <p className="mt-4 text-sm leading-7 text-slate-600">
                        {item.description}
                      </p>
                    )}
                    {item.points && (
                      <ul className="mt-4 space-y-2 text-sm text-slate-700">
                        {item.points.map((point) => (
                          <li key={point} className="flex gap-2">
                            <span
                              className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${accent.marker}`}
                            />
                            <span className="leading-6">{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section
            id="services"
            className={`rounded-2xl border p-5 sm:p-6 ${accent.panelBg} ${accent.border}`}
          >
            <p
              className={`text-xs font-black uppercase tracking-[0.24em] ${accent.chipText}`}
            >
              {servicesEyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              {servicesTitle}
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <div
                  key={service}
                  className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 shadow-sm"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#FFAD02]" />
                  <span className="leading-6">{service}</span>
                </div>
              ))}
            </div>
          </section>

          <section
            id="packages"
            className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${accent.border}`}
          >
            <p
              className={`text-xs font-black uppercase tracking-[0.24em] ${accent.chipText}`}
            >
              {packagesEyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              {packagesTitle}
            </h2>

            <div className="mt-5 grid gap-5 xl:grid-cols-3">
              {packages.map((pack) => (
                <article
                  key={pack.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-black text-slate-950">
                      {pack.title}
                    </h3>
                    <span className="mt-3 inline-flex rounded-full bg-slate-950 px-3 py-1 text-sm font-black text-white">
                      {pack.price}
                    </span>
                  </div>
                  <ol className="mt-4 space-y-3 text-sm text-slate-700">
                    {pack.items.map((item, index) => (
                      <li key={item} className="flex gap-3">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${accent.chipBg} ${accent.chipText}`}
                        >
                          {index + 1}
                        </span>
                        <span className="leading-6">{item}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="hidden lg:block">
          <div
            className={`sticky top-28 rounded-2xl border bg-white p-4 shadow-sm ${accent.border}`}
          >
            <p className="text-sm font-black text-slate-950">Хэсгүүд</p>
            <nav className="mt-3 space-y-2 text-sm font-bold text-slate-600">
              <Link
                href="#prices"
                className="block rounded-xl px-3 py-2 hover:bg-slate-50 hover:text-slate-950"
              >
                Зах зээлийн үнэ
              </Link>
              <Link
                href="#services"
                className="block rounded-xl px-3 py-2 hover:bg-slate-50 hover:text-slate-950"
              >
                Үйлчилгээ
              </Link>
              <Link
                href="#packages"
                className="block rounded-xl px-3 py-2 hover:bg-slate-50 hover:text-slate-950"
              >
                Багцууд
              </Link>
            </nav>
            {primaryAction && (
              <Link
                href={primaryAction.href}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFAD02] px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-[#f4a200]"
              >
                {primaryAction.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
