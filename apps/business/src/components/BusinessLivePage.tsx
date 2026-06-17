import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  PlaySquare,
  Store,
} from "lucide-react";

const modules = [
  { label: "Байгууллага", icon: Building2 },
  { label: "Ажлын зар", icon: BriefcaseBusiness },
  { label: "Сургалт", icon: GraduationCap },
  { label: "Контент", icon: PlaySquare },
];

export function BusinessLivePage() {
  return (
    <main className="min-h-screen bg-[#f8faf6] text-[#10140f]">
      <section className="relative isolate overflow-hidden border-b border-[#dfe5d7]">
        <Image
          src="/brand/mglstore-market-basket.png"
          alt="MGL Store marketplace"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[78%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,250,246,0.98)_0%,rgba(248,250,246,0.92)_42%,rgba(248,250,246,0.52)_100%)]" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <Link className="flex items-center gap-3" href="/">
              <span className="grid size-11 place-items-center overflow-hidden rounded-md border border-[#e5eadf] bg-white shadow-sm">
                <Image
                  src="/brand/mglstore-logo.png"
                  alt="MGL Store"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </span>
              <span>
                <span className="block text-lg font-black leading-tight">
                  MGL Business
                </span>
                <span className="block text-xs font-black uppercase tracking-[0.16em] text-[#6c7465]">
                  Store ecosystem
                </span>
              </span>
            </Link>

            <a
              className="inline-flex h-11 items-center gap-2 rounded-md bg-[#ffad02] px-4 text-sm font-black text-[#17130a] shadow-sm"
              href="https://mglstore.mn"
            >
              <Store size={17} />
              Store
            </a>
          </header>

          <div className="grid flex-1 content-center gap-10 py-14 lg:grid-cols-[0.96fr_1.04fr] lg:items-center">
            <div>
              <p className="mb-5 inline-flex rounded-md border border-[#dfe5d7] bg-white/86 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#17683b] shadow-sm">
                MGL Business live
              </p>
              <h1 className="max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-7xl">
                Бизнесээ харуул.
                <span className="block text-[#17683b]">Итгэлээ өсгө.</span>
                <span className="block">Борлуулалтаа холбо.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base font-bold leading-8 text-[#596451] sm:text-lg">
                Байгууллагын танилцуулга, ажлын зар, сургалт болон контентын
                урсгалыг MGL Store ecosystem-тэй нэгтгэнэ.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a className="inline-flex h-12 items-center gap-2 rounded-md bg-[#ffad02] px-5 text-sm font-black text-[#17130a]" href="#modules">
                  Эхлэх <ArrowRight size={18} />
                </a>
              </div>
            </div>

            <div id="modules" className="grid gap-3 sm:grid-cols-2">
              {modules.map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-md border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur"
                >
                  <span className="grid size-11 place-items-center rounded-md bg-[#eef8ed] text-[#17683b]">
                    <Icon size={22} />
                  </span>
                  <p className="mt-5 text-xl font-black">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
