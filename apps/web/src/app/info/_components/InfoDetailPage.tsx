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
}: InfoDetailPageProps) {
  return (
    <div
      className={`min-h-screen px-4 py-10 text-slate-900 sm:px-6 lg:px-8 ${accent.pageBg}`}
    >
      <section
        className={`mx-auto max-w-5xl overflow-hidden rounded-[2rem] border bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)] ${accent.border}`}
      >
        <div
          className={`relative isolate overflow-hidden px-6 py-10 text-white sm:px-10 sm:py-14 ${accent.heroBg}`}
        >
          <div
            className={`absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl ${accent.glowPrimary}`}
          />
          <div
            className={`absolute -bottom-24 left-8 h-60 w-60 rounded-full blur-3xl ${accent.glowSecondary}`}
          />
          <div className="relative">
            <p
              className={`text-sm font-bold uppercase tracking-[0.35em] ${accent.eyebrow}`}
            >
              {eyebrow}
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              {description}
            </p>
          </div>
        </div>

        <div className="space-y-10 p-5 sm:p-8 lg:p-10">
          <section>
            <div className="mb-5">
              <p
                className={`text-sm font-bold uppercase tracking-[0.24em] ${accent.chipText}`}
              >
                {cardsEyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {cardsTitle}
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {cards.map((item) => (
                <article
                  key={item.title}
                  className={`rounded-3xl border border-slate-100 p-5 ${accent.cardBg}`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-lg font-black text-slate-950">
                      {item.title}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-black ${accent.chipBg} ${accent.chipText}`}
                    >
                      {item.price}
                    </span>
                  </div>
                  {item.description && (
                    <p className="mt-3 text-sm leading-7 text-slate-600">
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
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className={`rounded-3xl p-5 sm:p-6 ${accent.panelBg}`}>
            <p
              className={`text-sm font-bold uppercase tracking-[0.24em] ${accent.chipText}`}
            >
              {servicesEyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              {servicesTitle}
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <div
                  key={service}
                  className="rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
                >
                  {service}
                </div>
              ))}
            </div>
          </section>

          <section>
            <p
              className={`text-sm font-bold uppercase tracking-[0.24em] ${accent.chipText}`}
            >
              {packagesEyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              {packagesTitle}
            </h2>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {packages.map((pack) => (
                <article
                  key={pack.title}
                  className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-lg font-black text-slate-950">
                      {pack.title}
                    </h3>
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-sm font-black text-white">
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

          {highlights && highlights.length > 0 && (
            <section className="grid gap-4 md:grid-cols-2">
              {highlights.map((highlight) => (
                <div
                  key={highlight.label}
                  className={`rounded-3xl p-5 text-white ${accent.highlightBg}`}
                >
                  <p className="text-sm font-semibold text-slate-300">
                    {highlight.label}
                  </p>
                  <p className="mt-1 text-xl font-black">{highlight.value}</p>
                </div>
              ))}
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
