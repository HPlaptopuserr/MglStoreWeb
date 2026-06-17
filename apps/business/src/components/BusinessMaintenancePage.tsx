import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Clock3,
  GraduationCap,
  Mail,
  Megaphone,
  ShieldCheck,
  Store,
  Wrench,
} from "lucide-react";

const modules = [
  {
    label: "Байгууллагын танилцуулга",
    icon: Building2,
  },
  {
    label: "Ажлын зар",
    icon: BadgeCheck,
  },
  {
    label: "Сургалт",
    icon: GraduationCap,
  },
  {
    label: "Контент ба reel",
    icon: Megaphone,
  },
];

export function BusinessMaintenancePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8faf6] text-[#10140f]">
      <Image
        src="/brand/mglstore-market-basket.png"
        alt="MGL Store marketplace"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[78%_center]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,250,246,0.98)_0%,rgba(248,250,246,0.94)_42%,rgba(248,250,246,0.72)_70%,rgba(248,250,246,0.42)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.34)_0%,rgba(248,250,246,0.92)_100%)]" />

      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
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

        <div className="grid flex-1 content-center gap-10 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-[#dfe5d7] bg-white/86 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#17683b] shadow-sm">
              <ShieldCheck size={16} />
              Design review in progress
            </div>

            <h1 className="text-4xl font-black leading-[1.02] tracking-[-0.02em] text-[#10140f] sm:text-6xl lg:text-7xl">
              MGL Business
              <span className="block text-[#17683b]">засвартай байна.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base font-bold leading-8 text-[#596451] sm:text-lg">
              Нэгдсэн танилцуулга, байгууллагын profile, ажлын зар, сургалт,
              контентын хэсгийн UI/UX дизайн баталгаажих хүртэл энэ хуудсыг
              түр хугацаанд хаасан байна.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="inline-flex h-12 items-center gap-2 rounded-md bg-[#ffad02] px-5 text-sm font-black text-[#17130a] shadow-sm shadow-[#b87900]/20 transition hover:bg-[#e69b00]"
                href="https://mglstore.mn"
              >
                <ArrowLeft size={18} />
                Store руу буцах
              </a>
              <a
                className="inline-flex h-12 items-center gap-2 rounded-md border border-[#ccd6c4] bg-white/88 px-5 text-sm font-black text-[#1b2118] shadow-sm transition hover:border-[#17683b]"
                href="mailto:info@mglstore.mn"
              >
                <Mail size={18} />
                Холбогдох
              </a>
            </div>
          </div>

          <aside className="w-full rounded-md border border-white/70 bg-white/88 p-5 shadow-[0_30px_90px_rgba(20,32,18,0.18)] backdrop-blur">
            <div className="flex items-start justify-between gap-4 border-b border-[#e4e8dd] pb-5">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[#b87900]">
                  Platform status
                </p>
                <h2 className="mt-2 text-2xl font-black">Дизайн баталгаажуулалт</h2>
              </div>
              <span className="grid size-12 place-items-center rounded-md bg-[#eef8ed] text-[#17683b]">
                <Wrench size={24} />
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-md border border-[#dfe5d7] bg-[#f8faf6] p-4">
                <div className="flex items-center gap-3">
                  <Clock3 size={19} className="text-[#17683b]" />
                  <p className="text-sm font-black">Түр хугацаанд засвартай</p>
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#66705d]">
                  Final дизайн батлагдмагц admin panel-ээс шууд нээх боломжтой.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {modules.map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex min-h-16 items-center gap-3 rounded-md border border-[#dfe5d7] bg-white px-3"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#fff6df] text-[#b87900]">
                      <Icon size={18} />
                    </span>
                    <span className="text-sm font-black leading-tight">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
