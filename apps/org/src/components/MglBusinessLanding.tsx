import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Network,
  ShieldCheck,
  Store,
} from "lucide-react";
import { landingContent } from "@/lib/mgl-business-landing-content";

const pillarIcons = [Network, Store, ShieldCheck];

function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  tone = "light",
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: "light" | "white" | "dark";
}) {
  const dark = tone === "dark";

  return (
    <section
      id={id}
      className={`px-4 py-14 sm:px-6 lg:px-8 ${
        tone === "white" ? "bg-white" : dark ? "bg-slate-950" : "bg-[#f7f8f4]"
      }`}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-3xl">
          <p
            className={`text-xs font-black uppercase tracking-[0.14em] ${
              dark ? "text-amber-300" : "text-[#b87900]"
            }`}
          >
            {eyebrow}
          </p>
          <h2
            className={`mt-3 text-3xl font-black leading-tight tracking-[-0.02em] sm:text-5xl ${
              dark ? "text-white" : "text-slate-950"
            }`}
          >
            {title}
          </h2>
          {description ? (
            <p
              className={`mt-4 text-base font-semibold leading-8 ${
                dark ? "text-white/70" : "text-slate-600"
              }`}
            >
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}

export default function MglBusinessLanding() {
  const { hero } = landingContent;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f8f4] text-slate-950">
      <section className="relative isolate overflow-hidden border-b border-slate-200">
        <Image
          src="/brand/mglstore-market-basket.png"
          alt="MGL Store marketplace"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[78%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,248,244,0.99)_0%,rgba(247,248,244,0.94)_45%,rgba(247,248,244,0.68)_100%)]" />

        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <Link className="flex min-w-0 items-center gap-3" href="/">
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <Image
                  src="/brand/mglstore-logo.png"
                  alt="MGL Store"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-lg font-black leading-tight">
                  MGL Business
                </span>
                <span className="block truncate text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Organization platform
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                className="hidden h-11 items-center rounded-md border border-slate-200 bg-white/90 px-4 text-sm font-black shadow-sm transition hover:border-[#17683b] md:inline-flex"
                href="/login"
              >
                Нэвтрэх
              </Link>
              <Link
                className="hidden h-11 items-center gap-2 rounded-md bg-[#ffad02] px-4 text-sm font-black text-[#17130a] shadow-sm transition hover:bg-[#e69b00] md:inline-flex"
                href="/dashboard"
              >
                Dashboard
                <ArrowRight size={17} />
              </Link>
            </div>
          </header>

          <nav className="mt-5 hidden w-fit rounded-md border border-slate-200 bg-white/75 p-1 shadow-sm backdrop-blur md:flex">
            {[
              ["Зорилго", "#goal"],
              ["Шатлал", "#tiers"],
              ["Стратеги", "#strategy"],
              ["Харьцуулалт", "#compare"],
            ].map(([label, href]) => (
              <a
                className="rounded px-4 py-2 text-xs font-black uppercase tracking-[0.1em] text-slate-600 transition hover:bg-[#eef8ed] hover:text-[#17683b]"
                href={href}
                key={href}
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="grid flex-1 content-center gap-8 py-10 lg:grid-cols-[0.96fr_1.04fr] lg:items-center lg:py-14">
            <div className="max-w-3xl">
              <p className="mb-5 inline-block rounded-md border border-slate-200 bg-white/86 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#17683b] shadow-sm sm:tracking-[0.14em]">
                {hero.eyebrow}
              </p>
              <h1 className="max-w-[10ch] text-5xl font-black leading-[0.98] tracking-[-0.02em] text-slate-950 sm:text-7xl lg:text-8xl">
                {hero.shortTitle}
              </h1>
              <p className="mt-5 max-w-xl text-xl font-black leading-tight text-[#17683b] sm:text-3xl">
                Бизнесийн нэгдсэн систем
              </p>
              <p className="mt-6 max-w-xl text-[15px] font-bold leading-7 text-slate-600 sm:max-w-2xl sm:text-lg sm:leading-8">
                <span className="sm:hidden">{hero.mobileDescription}</span>
                <span className="hidden sm:inline">{hero.description}</span>
              </p>
              <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#ffad02] px-5 text-sm font-black text-[#17130a] shadow-sm transition hover:bg-[#e69b00]"
                  href="/dashboard"
                >
                  Dashboard нээх
                  <ArrowRight size={18} />
                </Link>
                <a
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white/88 px-5 text-sm font-black text-slate-900 shadow-sm transition hover:border-[#17683b]"
                  href="#goal"
                >
                  Танилцуулга үзэх
                </a>
              </div>
            </div>

            <aside className="rounded-md border border-white/70 bg-white/92 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.15)] backdrop-blur">
              <div className="grid gap-4 sm:flex sm:items-start">
                <span className="grid size-12 shrink-0 place-items-center rounded-md bg-[#eef8ed] text-[#17683b]">
                  <BarChart3 size={24} />
                </span>
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-[#b87900]">
                    System overview
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    MGL нэгдсэн систем
                  </h2>
                  <p className="mt-3 max-w-md text-sm font-semibold leading-7 text-slate-600">
                    <span className="sm:hidden">
                      {landingContent.mobileOverview}
                    </span>
                    <span className="hidden sm:inline">
                      {landingContent.overview}
                    </span>
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {landingContent.metrics.map((metric) => (
                  <div
                    className="rounded-md border border-slate-200 bg-[#f8faf6] p-4"
                    key={metric.value}
                  >
                    <p className="text-3xl font-black text-[#17683b]">
                      {metric.value}
                    </p>
                    <p className="mt-2 text-xs font-bold leading-5 text-slate-600">
                      {metric.label}
                    </p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Section
        id="goal"
        eyebrow="Үндсэн зорилго"
        title="Борлуулалт, нийлүүлэлт, маркетингийг нэг системд оруулна"
        description="PDF/PPTX дээрх гол санааг 3004-ийн org portal-д тохируулан, dashboard руу чиглэсэн танилцуулга болгон боловсрууллаа."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {landingContent.pillars.map((item, index) => {
            const Icon = pillarIcons[index % pillarIcons.length];
            return (
              <article
                className="rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#17683b]/40 hover:shadow-md"
                key={item.title}
              >
                <span className="grid size-11 place-items-center rounded-md bg-[#eef8ed] text-[#17683b]">
                  <Icon size={22} />
                </span>
                <h3 className="mt-5 text-lg font-black">{item.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                  {item.text}
                </p>
              </article>
            );
          })}
        </div>
      </Section>

      <Section
        id="tiers"
        eyebrow="Өсөлтийн шатлал"
        title="Member-ээс Mall хүртэл нэг platform дээр"
        tone="white"
      >
        <div className="grid gap-4 lg:grid-cols-4">
          {landingContent.tiers.map((tier, index) => (
            <article
              className="relative rounded-md border border-slate-200 bg-white p-5 shadow-sm"
              key={tier.title}
            >
              <span className="absolute right-5 top-5 text-5xl font-black leading-none text-slate-100">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="relative text-sm font-black text-[#b87900]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="relative mt-3 text-2xl font-black">{tier.title}</h3>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                {tier.text}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        id="strategy"
        eyebrow="MGL Store стратеги"
        title="Сүлжээ болсон үед л гардаг давуу талууд"
        description="Худалдан авалт, нийлүүлэгчийн дэмжлэг, нэмүү өртөг үйлчилгээ, технологийн удирдлагыг нэг дор харуулна."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {landingContent.strategy.map((item) => (
            <div
              className="flex gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm"
              key={item}
            >
              <CheckCircle2 className="mt-1 size-5 shrink-0 text-[#17683b]" />
              <p className="text-sm font-semibold leading-7 text-slate-600">
                {item}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="compare"
        eyebrow="Харьцуулалт"
        title="Бие даасан дэлгүүр ба MGL сүлжээ"
        tone="white"
      >
        <div className="grid gap-3 lg:grid-cols-3">
          {landingContent.comparison.map((row) => (
            <article
              className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
              key={row.metric}
            >
              <h3 className="text-lg font-black">{row.metric}</h3>
              <div className="mt-4 grid gap-3">
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-[#b87900]">
                    Бие даасан
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                    {row.alone}
                  </p>
                </div>
                <div className="rounded-md bg-[#eef8ed] p-3">
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-[#17683b]">
                    MGL сүлжээ
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#17683b]">
                    {row.network}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Дараагийн алхам"
        title="3004 дээр танилцуулгаас dashboard руу шууд ордог боллоо"
        description="Root page нь танилцуулга болж, байгууллагын удирдлагын хэсэг `/dashboard`, нэвтрэх хэсэг `/login` дээр хэвээр байна."
        tone="dark"
      >
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-12 items-center gap-2 rounded-md bg-[#ffad02] px-5 text-sm font-black text-[#17130a]"
            href="/dashboard"
          >
            Dashboard руу орох
            <ArrowRight size={18} />
          </Link>
          <Link
            className="inline-flex h-12 items-center gap-2 rounded-md border border-white/15 bg-white/8 px-5 text-sm font-black text-white"
            href="/login"
          >
            Нэвтрэх
          </Link>
        </div>
      </Section>
    </main>
  );
}
