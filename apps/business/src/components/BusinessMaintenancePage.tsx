import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Factory,
  Handshake,
  Mail,
  Network,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { mglBusinessContent } from "@/lib/mgl-business-content";

const featureIcons = [Network, Store, Factory, ShieldCheck, Handshake, Truck];
const navItems = [
  { label: "Зорилго", href: "#goal" },
  { label: "Шатлал", href: "#tiers" },
  { label: "Стратеги", href: "#strategy" },
  { label: "Харьцуулалт", href: "#compare" },
];

function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className = "",
  dark = false,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <section
      id={id}
      className={`mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 ${className}`}
    >
      <div className="mb-8 max-w-3xl">
        <p
          className={`text-xs font-black uppercase tracking-[0.12em] sm:tracking-[0.16em] ${
            dark ? "text-[#ffad02]" : "text-[#b87900]"
          }`}
        >
          {eyebrow}
        </p>
        <h2
          className={`mt-3 text-3xl font-black leading-tight tracking-[-0.02em] sm:text-5xl ${
            dark ? "text-white" : "text-[#10140f]"
          }`}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={`mt-4 text-base font-semibold leading-8 ${
              dark ? "text-white/70" : "text-[#596451]"
            }`}
          >
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FeatureGrid({
  items,
}: {
  items: readonly { title: string; text: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => {
        const Icon = featureIcons[index % featureIcons.length];
        return (
          <article
            className="rounded-md border border-[#dfe5d7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#17683b]/40 hover:shadow-md"
            key={item.title}
          >
            <span className="grid size-11 place-items-center rounded-md bg-[#eef8ed] text-[#17683b]">
              <Icon size={22} />
            </span>
            <h3 className="mt-5 text-lg font-black leading-tight">{item.title}</h3>
            <p className="mt-3 text-sm font-semibold leading-7 text-[#66705d]">
              {item.text}
            </p>
          </article>
        );
      })}
    </div>
  );
}

function TagCloud({ items }: { items: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          className="rounded-full border border-[#dfe5d7] bg-white px-4 py-2 text-sm font-black text-[#17683b] shadow-sm"
          key={item}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function TierCards() {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {mglBusinessContent.tiers.map((tier, index) => (
        <article
          className="relative flex min-h-full flex-col rounded-md border border-[#dfe5d7] bg-white p-5 shadow-sm"
          key={tier.name}
        >
          <span className="absolute right-5 top-5 text-5xl font-black leading-none text-[#eef3e9]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="relative text-sm font-black text-[#b87900]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="relative mt-3 text-2xl font-black leading-tight text-[#10140f]">
            {tier.name}
          </h3>
          <p className="mt-3 text-sm font-bold leading-7 text-[#596451]">
            {tier.description}
          </p>
          <ul className="mt-5 grid gap-3">
            {tier.points.map((point) => (
              <li className="flex gap-2 text-sm font-semibold leading-6 text-[#66705d]" key={point}>
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#17683b]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function Standards() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {mglBusinessContent.standards.map((standard) => (
        <article
          className="rounded-md border border-[#dfe5d7] bg-[#f8faf6] p-5"
          key={standard.title}
        >
          <h3 className="text-lg font-black">{standard.title}</h3>
          <p className="mt-3 text-4xl font-black text-[#17683b]">{standard.value}</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#66705d]">
            {standard.text}
          </p>
        </article>
      ))}
    </div>
  );
}

function OperationsList() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {mglBusinessContent.operations.map((item) => (
        <div
          className="flex gap-3 rounded-md border border-[#dfe5d7] bg-white p-4 shadow-sm"
          key={item}
        >
          <CheckCircle2 className="mt-1 size-5 shrink-0 text-[#17683b]" />
          <p className="text-sm font-semibold leading-7 text-[#596451]">{item}</p>
        </div>
      ))}
    </div>
  );
}

function PartnerGroups() {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {mglBusinessContent.partners.map((group) => (
        <article
          className="rounded-md border border-[#dfe5d7] bg-white p-5 shadow-sm"
          key={group.title}
        >
          <h3 className="text-base font-black">{group.title}</h3>
          <ul className="mt-4 grid gap-2">
            {group.items.map((item) => (
              <li className="text-sm font-semibold leading-6 text-[#66705d]" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function ComparisonTable() {
  return (
    <>
      <div className="grid gap-3 lg:hidden">
        {mglBusinessContent.comparison.map((row) => (
          <article
            className="rounded-md border border-[#dfe5d7] bg-white p-4 shadow-sm"
            key={row.metric}
          >
            <h3 className="text-base font-black text-[#10140f]">{row.metric}</h3>
            <div className="mt-4 grid gap-3">
              <div className="rounded-md bg-[#f8faf6] p-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-[#b87900]">
                  Бие даасан
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#66705d]">
                  {row.independent}
                </p>
              </div>
              <div className="rounded-md bg-[#eef8ed] p-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-[#17683b]">
                  MGL Store
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#17683b]">
                  {row.network}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-md border border-[#dfe5d7] bg-white shadow-sm lg:block">
        <table className="min-w-[900px] border-collapse text-left">
        <thead>
          <tr className="bg-[#eef8ed] text-sm font-black uppercase tracking-[0.08em] text-[#17683b]">
            <th className="p-4">Үзүүлэлт</th>
            <th className="p-4">Бие даасан дэлгүүр</th>
            <th className="p-4">MGL Store сүлжээ</th>
          </tr>
        </thead>
        <tbody>
          {mglBusinessContent.comparison.map((row) => (
            <tr className="border-t border-[#dfe5d7]" key={row.metric}>
              <th className="w-[22%] p-4 text-sm font-black text-[#10140f]">
                {row.metric}
              </th>
              <td className="p-4 text-sm font-semibold leading-7 text-[#66705d]">
                {row.independent}
              </td>
              <td className="p-4 text-sm font-semibold leading-7 text-[#17683b]">
                {row.network}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}

export function BusinessMaintenancePage() {
  const { hero } = mglBusinessContent;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8faf6] text-[#10140f]">
      <section className="relative isolate overflow-hidden border-b border-[#dfe5d7]">
        <Image
          src="/brand/mglstore-market-basket.png"
          alt="MGL Store marketplace"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[78%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,250,246,0.99)_0%,rgba(248,250,246,0.95)_46%,rgba(248,250,246,0.74)_100%)]" />

        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <Link className="flex min-w-0 items-center gap-3" href="/">
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md border border-[#e5eadf] bg-white shadow-sm">
                <Image
                  src="/brand/mglstore-logo.png"
                  alt="MGL Store"
                  width={32}
                  height={32}
                  className="object-contain"
                  priority
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-lg font-black leading-tight">
                  MGL Business
                </span>
                <span className="block truncate text-xs font-black uppercase tracking-[0.16em] text-[#6c7465]">
                  Store ecosystem
                </span>
              </span>
            </Link>

            <a
              className="inline-flex h-11 items-center gap-2 rounded-md border border-[#dfe5d7] bg-white/88 px-4 text-sm font-black text-[#171b15] shadow-sm transition hover:border-[#ffad02]"
              href="https://mglstore.mn"
            >
              <Store size={17} />
              <span className="hidden sm:inline">MGL Store</span>
            </a>
          </header>

          <nav className="mt-5 hidden rounded-md border border-[#dfe5d7] bg-white/72 p-1 shadow-sm backdrop-blur md:flex md:w-fit">
            {navItems.map((item) => (
              <a
                className="rounded px-4 py-2 text-xs font-black uppercase tracking-[0.1em] text-[#596451] transition hover:bg-[#eef8ed] hover:text-[#17683b]"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="grid flex-1 content-center gap-8 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-14">
            <div className="max-w-3xl">
              <p className="mb-5 inline-block max-w-full rounded-md border border-[#dfe5d7] bg-white/86 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#17683b] shadow-sm sm:tracking-[0.14em]">
                <span className="sm:hidden">MGL нэгдсэн систем</span>
                <span className="hidden sm:inline">{hero.kicker}</span>
              </p>

              <h1 className="max-w-[11ch] text-5xl font-black leading-[0.98] tracking-[-0.02em] text-[#10140f] sm:text-7xl lg:text-8xl">
                Мөнгөө Монголдоо үлдээе
              </h1>

              <p className="mt-6 max-w-[20rem] text-[15px] font-bold leading-7 text-[#596451] sm:max-w-2xl sm:text-lg sm:leading-8">
                <span className="sm:hidden">{hero.mobileDescription}</span>
                <span className="hidden sm:inline">{hero.description}</span>
              </p>

              <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
                <a
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#ffad02] px-5 text-sm font-black text-[#17130a] shadow-sm shadow-[#b87900]/20 transition hover:bg-[#e69b00]"
                  href={hero.actions[0].href}
                >
                  <ArrowLeft size={18} />
                  {hero.actions[0].label}
                </a>
                <a
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[#ccd6c4] bg-white/88 px-5 text-sm font-black text-[#1b2118] shadow-sm transition hover:border-[#17683b]"
                  href={hero.actions[1].href}
                >
                  <Mail size={18} />
                  {hero.actions[1].label}
                </a>
              </div>
            </div>

            <aside className="min-w-0 rounded-md border border-white/70 bg-white/92 p-5 shadow-[0_30px_90px_rgba(20,32,18,0.16)] backdrop-blur">
              <div className="grid gap-4 sm:flex sm:items-start">
                <span className="grid size-12 shrink-0 place-items-center rounded-md bg-[#eef8ed] text-[#17683b]">
                  <BarChart3 size={24} />
                </span>
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-[#b87900]">
                    System overview
                  </p>
                  <h2 className="mt-2 text-2xl font-black">MGL нэгдсэн систем</h2>
                  <p className="mt-3 max-w-[19rem] text-sm font-semibold leading-7 text-[#66705d] sm:max-w-none">
                    Компани, салбар, борлуулалт, нийлүүлэлт, маркетингийг нэг
                    удирдлагын загварт холбож тогтвортой ажиллагааг хангана.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {mglBusinessContent.metrics.map((metric) => (
                  <div
                    className="min-w-0 rounded-md border border-[#dfe5d7] bg-[#f8faf6] p-4"
                    key={metric.value}
                  >
                    <p className="text-3xl font-black text-[#17683b]">{metric.value}</p>
                    <p className="mt-2 text-[11px] font-bold leading-5 text-[#66705d] sm:text-xs">
                      <span className="sm:hidden">{metric.shortLabel}</span>
                      <span className="hidden sm:inline">{metric.label}</span>
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
        title="Салбаруудыг нэг системд холбож, хэрэглэгчийн урсгалыг өсгөнө"
        description="PPTX-ийн гол санаа нь үйлчилгээ, борлуулалт, нийлүүлэлт, маркетинг, хуулийн зөвлөгөө, хүний нөөцийг нэг системд оруулах явдал."
      >
        <FeatureGrid items={mglBusinessContent.ecosystem} />
      </Section>

      <Section
        eyebrow="Хамтын эзэмшил"
        title={mglBusinessContent.ownership.title}
        description={mglBusinessContent.ownership.description}
        className="border-y border-[#dfe5d7] bg-white"
      >
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-3">
            {mglBusinessContent.ownership.cards.map((item) => (
              <article
                className="rounded-md border border-[#dfe5d7] bg-[#f8faf6] p-5"
                key={item.title}
              >
                <h3 className="text-lg font-black text-[#10140f]">{item.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-7 text-[#66705d]">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
          <div>
            <h3 className="mb-4 text-lg font-black text-[#10140f]">
              Оролцох боломжтой салбарууд
            </h3>
            <TagCloud items={mglBusinessContent.ownership.participants} />
          </div>
        </div>
      </Section>

      <Section
        eyebrow="Хэрэгжүүлж буй төслүүд"
        title="MGL брэндүүд нэг экосистем дотор ажиллана"
        description="Дэлгүүр, ресторан, кафе, аялал жуулчлал, түргэн хоол болон худалдааны төслүүдийг нэг бодлого, нэг сувгаар өсгөнө."
        className="border-y border-[#dfe5d7] bg-white"
      >
        <TagCloud items={mglBusinessContent.projects} />
      </Section>

      <Section
        id="tiers"
        eyebrow="Дэлгүүрийн сүлжээний тогтолцоо"
        title="Member-ээс Mall хүртэл өсөх дөрвөн шат"
        description="Одоо байгаа дэлгүүрийг MGL системд холбохоос эхлээд 20,000 м²-аас дээш MGL Mall хүртэл шаталсан бүтэцтэй."
      >
        <TierCards />
      </Section>

      <Section
        id="strategy"
        eyebrow="MGL Store стратеги"
        title="Худалдан авалт, маркетинг, нийлүүлэгч, технологийн хүчийг нэгтгэнэ"
      >
        <FeatureGrid items={mglBusinessContent.storeStrategy} />
      </Section>

      <Section
        eyebrow="Байршил ба стандарт"
        title="Хот, аймаг, сумын төвийн дэлгүүрийн зай ба ажиллагааны стандарт"
        description="Стратеги хөгжүүлэлт, хүний нөөцийн дэмжлэг, эрх зүйн хамгаалалт, дотоод зохион байгуулалтын зөвлөгөө, сургалт тогтмол дагалдана."
        className="border-y border-[#dfe5d7] bg-white"
      >
        <div className="grid gap-6">
          <Standards />
          <OperationsList />
        </div>
      </Section>

      <Section
        eyebrow="MGL Mall зохион байгуулалт"
        title="Худалдаа, үйлчилгээ, чөлөөт цаг, ложистикийн цогц төв"
      >
        <TagCloud items={mglBusinessContent.mallZones} />
      </Section>

      <Section
        eyebrow="Судлах боломжтой ханган нийлүүлэгчид"
        title="Тоног төхөөрөмж, тохижилт, сургалт, санхүүгийн байгууллагууд"
        description="PPTX-д дурдсан байгууллагуудыг ангилж орууллаа. Эдгээр нь судалж, харьцуулах эхний жагсаалт."
        className="border-y border-[#dfe5d7] bg-white"
      >
        <PartnerGroups />
      </Section>

      <Section
        id="compare"
        eyebrow="Харьцуулалт"
        title="Бие даасан дэлгүүр ба MGL Store сүлжээ"
      >
        <ComparisonTable />
      </Section>

      <Section
        eyebrow="Дүгнэлт"
        title="Ганц дэлгүүр биш, хөдөлдөг сүлжээ"
        className="border-t border-[#dfe5d7] bg-[#10140f] text-white"
        dark
      >
        <div className="grid gap-3 md:grid-cols-2">
          {mglBusinessContent.conclusion.map((item) => (
            <div className="flex gap-3 rounded-md border border-white/10 bg-white/5 p-5" key={item}>
              <ArrowRight className="mt-1 size-5 shrink-0 text-[#ffad02]" />
              <p className="font-bold leading-7 text-white/86">{item}</p>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
