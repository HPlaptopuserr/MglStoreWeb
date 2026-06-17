import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  PlaySquare,
  Plus,
  Search,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://mgl-api.onrender.com";

const primaryNav = [
  { label: "Байгууллагууд", href: "#organizations" },
  { label: "Ажлын зар", href: "#jobs" },
  { label: "Сургалт", href: "#training" },
  { label: "Контент", href: "#content" },
];

const modules = [
  {
    title: "Байгууллагын танилцуулга",
    description: "Profile, салбар, холбоо барих мэдээлэл, баталгаажсан тэмдэг.",
    icon: Building2,
  },
  {
    title: "Ажлын зар",
    description: "Нээлттэй ажлын байр, анкет, шалгаруулалтын төлөв.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Сургалт",
    description: "Эвент, сургалт, бүртгэл, төлбөртэй контентын урсгал.",
    icon: GraduationCap,
  },
  {
    title: "Reel ба мэдээ",
    description: "Богино видео, зарлал, байгууллагын албан пост.",
    icon: PlaySquare,
  },
];

const stats = [
  { label: "Байгууллага", value: "183" },
  { label: "Бараа", value: "159" },
  { label: "Захиалга", value: "20" },
  { label: "Нэгдсэн account", value: "1" },
];

const quickActions = [
  { label: "Байгууллага нэмэх", icon: Plus },
  { label: "Ажлын зар оруулах", icon: BriefcaseBusiness },
  { label: "Сургалт үүсгэх", icon: CalendarDays },
  { label: "Store руу шилжих", icon: Store },
];

export default function BusinessHomePage() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(247,248,244,0.92)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" href="/">
            <span className="grid size-10 place-items-center rounded-md bg-[var(--accent)] text-white">
              <Building2 size={21} strokeWidth={2.4} />
            </span>
            <span>
              <span className="block text-base font-black leading-tight">
                MGL Business
              </span>
              <span className="block text-xs font-semibold text-[var(--muted)]">
                MGL Store ecosystem
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {primaryNav.map((item) => (
              <a
                key={item.href}
                className="rounded-md px-3 py-2 text-sm font-bold text-[#3d4538] transition hover:bg-white hover:text-[var(--accent-strong)]"
                href={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              className="hidden rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-extrabold text-[#283024] shadow-sm transition hover:border-[var(--accent)] sm:inline-flex"
              href="https://mglstore.mn"
            >
              Store
            </a>
            <a
              className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-extrabold text-white shadow-sm transition hover:bg-[var(--accent-strong)]"
              href="/login"
            >
              <LayoutDashboard size={16} />
              Нэвтрэх
            </a>
          </div>
        </div>
      </header>

      <section className="border-b border-[var(--line)] bg-[#eef3e8]">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-10">
          <div className="flex min-h-[520px] flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-md border border-[#cfd9c5] bg-white px-3 py-2 text-sm font-extrabold text-[var(--accent-strong)]">
              <ShieldCheck size={17} />
              Нэг account, нэг backend, хоёр web
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.06] tracking-normal text-[#151711] sm:text-5xl lg:text-6xl">
              Монгол бизнесүүдийн танилцуулга, ажил, сургалт нэг дор.
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-[#596451] sm:text-lg">
              MGL Business нь MGL Store-ийн хэрэглэгч, байгууллага, төлбөр,
              контентын суурьтай холбогдож ажиллах бизнес платформын frontend.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[var(--accent-strong)]"
                href="#organizations"
              >
                Эхлэх
                <ArrowRight size={18} />
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-md border border-[#cfd9c5] bg-white px-5 py-3 text-sm font-black text-[#283024] shadow-sm transition hover:border-[var(--accent)]"
                href={`${API_URL}/health`}
              >
                API status
              </a>
            </div>

            <div className="mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-md border border-[#d8e0cf] bg-white px-4 py-4"
                >
                  <p className="text-2xl font-black text-[#151711]">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-full overflow-hidden rounded-md border border-[#ced9c6] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
                <div>
                  <p className="text-sm font-black">Business workspace</p>
                  <p className="text-xs font-semibold text-[var(--muted)]">
                    Organization owner dashboard preview
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-[#eef6ec] px-3 py-2 text-xs font-black text-[var(--accent-strong)]">
                  Live
                </div>
              </div>

              <div className="p-5">
                <label className="flex h-11 items-center gap-3 rounded-md border border-[var(--line)] bg-[#f8faf6] px-3">
                  <Search size={17} className="text-[var(--muted)]" />
                  <span className="text-sm font-semibold text-[var(--muted)]">
                    Байгууллага, ажил, сургалт хайх
                  </span>
                </label>

                <div className="mt-5 grid gap-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.label}
                        className="flex h-14 items-center justify-between rounded-md border border-[var(--line)] bg-white px-4 text-left transition hover:border-[var(--accent)] hover:bg-[#f7faf3]"
                        type="button"
                      >
                        <span className="flex items-center gap-3 text-sm font-black">
                          <Icon size={18} className="text-[var(--accent)]" />
                          {action.label}
                        </span>
                        <ArrowRight size={17} className="text-[var(--muted)]" />
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-md bg-[#17251b] p-5 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black">MGL Store холбоос</p>
                      <p className="mt-2 text-sm font-medium leading-6 text-white/70">
                        Нэг байгууллага store дээр бараа зарж, business дээр
                        танилцуулга, ажил, сургалт нийтэлнэ.
                      </p>
                    </div>
                    <Store size={24} className="shrink-0 text-[#e5c269]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="organizations"
        className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent)]">
              Platform modules
            </p>
            <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-normal text-[#151711]">
              Business frontend-ийн эхний бүтэц
            </h2>
          </div>
          <a
            className="inline-flex w-fit items-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 py-3 text-sm font-black text-[#283024] shadow-sm transition hover:border-[var(--accent)]"
            href="/dashboard"
          >
            <LayoutDashboard size={17} />
            Dashboard
          </a>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <article
                key={module.title}
                className="rounded-md border border-[var(--line)] bg-white p-5 shadow-sm"
              >
                <div className="grid size-11 place-items-center rounded-md bg-[#eef6ec] text-[var(--accent)]">
                  <Icon size={22} />
                </div>
                <h3 className="mt-5 text-lg font-black">{module.title}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted)]">
                  {module.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        id="jobs"
        className="border-y border-[var(--line)] bg-white px-4 py-12 sm:px-6 lg:px-8"
      >
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="grid size-12 place-items-center rounded-md bg-[#eef6ec] text-[var(--accent)]">
              <Users size={24} />
            </div>
            <h2 className="mt-5 text-3xl font-black">Нэг байгууллага, олон урсгал</h2>
            <p className="mt-4 text-sm font-medium leading-7 text-[var(--muted)]">
              Store seller, business owner, employer, trainer гэсэн эрхүүдийг
              нэг user account дээр role/capability байдлаар удирдах боломжтой.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {["Store", "Business", "Jobs"].map((label) => (
              <div
                key={label}
                className="rounded-md border border-[var(--line)] bg-[#f8faf6] p-5"
              >
                <p className="text-sm font-black text-[var(--muted)]">{label}</p>
                <p className="mt-4 text-2xl font-black text-[#151711]">
                  Shared
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
                  Auth, API, database
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="training"
        className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8"
      >
        <div className="rounded-md border border-[var(--line)] bg-white p-6 shadow-sm">
          <Megaphone className="text-[var(--accent)]" size={26} />
          <h2 className="mt-4 text-2xl font-black">Контент ба reel</h2>
          <p className="mt-3 text-sm font-medium leading-7 text-[var(--muted)]">
            `Post`, `ServicePost` суурийг ашиглаад дараагийн шатанд video/media
            model-оор reel урсгалыг цэгцэлнэ.
          </p>
        </div>
        <div
          id="content"
          className="rounded-md border border-[var(--line)] bg-[#17251b] p-6 text-white shadow-sm"
        >
          <GraduationCap className="text-[#e5c269]" size={28} />
          <h2 className="mt-4 text-2xl font-black">Сургалт ба эвент</h2>
          <p className="mt-3 text-sm font-medium leading-7 text-white/70">
            Training/Course model нэмэгдэх хүртэл frontend module тусдаа app
            boundary дотроо бэлэн байна.
          </p>
        </div>
      </section>
    </main>
  );
}
