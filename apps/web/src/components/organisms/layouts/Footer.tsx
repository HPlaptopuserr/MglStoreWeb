"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Store,
  ShieldCheck,
  Truck,
  HeartHandshake,
  QrCode,
  MessageCircle,
  Headphones,
  Contact,
  FileQuestion,
} from "lucide-react";

const quickLinks = [
  { icon: QrCode, label: "APP татах", href: "#" },
  { icon: MessageCircle, label: "Санал хүсэлт", href: "#" },
  { icon: Headphones, label: "Admin-тай холбогдох", href: "#" },
  { icon: Contact, label: "Хамтарч ажиллах", href: "/company/partnership" },
  { icon: FileQuestion, label: "Нийтлэг асуулт", href: "#" },
];

export const Footer = () => {
  return (
    <footer className="w-full font-sans">
      {/* ── Trust Badges ── */}
      <div className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-8">
            {[
              {
                icon: Truck,
                title: "Хурдан хүргэлт",
                desc: "Улаанбаатар хотод",
                color: "text-blue-600 bg-blue-50",
              },
              {
                icon: ShieldCheck,
                title: "Баталгаат бараа",
                desc: "100% ийн баталгаа",
                color: "text-green-600 bg-green-50",
              },
              {
                icon: HeartHandshake,
                title: "Түншлэл",
                desc: "300+ бизнес нэгдсэн",
                color: "text-amber-600 bg-amber-50",
              },
              {
                icon: Store,
                title: "Нэг дэлгүүр",
                desc: "Бүх зүйл нэг дороос",
                color: "text-purple-600 bg-purple-50",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 sm:gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${item.color}`}
                >
                  <item.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 sm:text-base">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500 sm:text-sm">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Newsletter CTA ── */}
{/*       <div className="bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
            <div className="max-w-lg">
              <h3 className="text-xl font-bold text-white sm:text-2xl">
                Шинэ мэдээлэлийг цаг тухай бүрт авах ?
              </h3>
              <p className="mt-1.5 text-sm text-gray-400 sm:text-base">
                Хямдрал, шинэ дэлгүүрүүд, онцгой санал — и-мэйлээр хүлээн
                аваарай.
              </p>
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex w-full max-w-md items-center gap-2"
            >
              <div className="relative flex-1">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  placeholder="И-мэйл хаяг"
                  className="w-full rounded-xl border border-gray-700 bg-gray-800 py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <button
                type="submit"
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-600 active:bg-amber-700"
              >
                Бүртгүүлэх
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
 */}
      {/* ── Main Footer Links ── */}
      <div className="bg-gray-950 px-4 pt-12 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            {/* Brand column */}
            <div className="col-span-2 sm:col-span-2 md:col-span-4 lg:col-span-1 lg:pr-8">
              <Link href="/" className="inline-flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt="MGL Store"
                  width={44}
                  height={32}
                  className="brightness-0 invert"
                />
                <span className="text-lg font-bold text-white">MGL Store</span>
              </Link>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                Монголын худалдааны бизнесүүдийг нэг дор холбосон нэгдсэн
                платформ.
              </p>

              {/* Social icons */}
              <div className="mt-5 flex items-center gap-2">
                {[
                  { icon: Facebook, href: "#", label: "Facebook" },
                  { icon: Instagram, href: "#", label: "Instagram" },
                  { icon: Twitter, href: "#", label: "Twitter" },
                  { icon: Youtube, href: "#", label: "YouTube" },
                ].map((social) => (
                  <Link
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800 text-gray-400 transition-colors hover:bg-amber-500 hover:text-white"
                  >
                    <social.icon className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">
                Шуурхай холбоос
              </h4>
              <ul className="space-y-2.5">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-gray-500 transition-colors group-hover:bg-amber-500/15 group-hover:text-amber-400">
                        <link.icon className="h-3.5 w-3.5" />
                      </span>
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Дэлгүүр хэсэх */}
            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">
                Дэлгүүр хэсэх
              </h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Бүх бүтээгдэхүүн", href: "/products" },
                  { label: "Дэлгүүрүүд", href: "/organizations" },
                  { label: "Ангилалууд", href: "/products" },
                  { label: "Хямдрал", href: "#" },
                  { label: "Шинэ бараа", href: "#" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Компани */}
            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">
                Компани
              </h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Бидний тухай", href: "#" },
                  { label: "Хамтран ажиллах", href: "/company/partnership" },
                  { label: "Ажлын байр", href: "/company/careers" },
                  { label: "Мэдээ", href: "#" },
                  { label: "Блог", href: "#" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Тусламж & Холбоо барих */}
            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">
                Тусламж
              </h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Тусламжийн төв", href: "#" },
                  { label: "Хүргэлтийн мэдээлэл", href: "#" },
                  { label: "Буцаалтын бодлого", href: "#" },
                  { label: "Түгээмэл асуулт", href: "#" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-2.5">
                <a
                  href="tel:+97677001234"
                  className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
                >
                  <Phone className="h-3.5 w-3.5" />
                  8086 2003
                </a>
                <a
                  href="mailto:bigservice1316@gmail.com"
                  className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
                >
                  <Mail className="h-3.5 w-3.5" />
                  bigservice1316@gmail.com
                </a>
                <div className="flex items-start gap-2 text-sm text-gray-500">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Улаанбаатар, Монгол</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom Bar ── */}
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-6 sm:flex-row">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} MGL Store. Бүх эрх хуулиар
              хамгаалагдсан.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500 sm:gap-6">
              <Link href="#" className="transition-colors hover:text-gray-300">
                Нууцлалын бодлого
              </Link>
              <Link href="#" className="transition-colors hover:text-gray-300">
                Үйлчилгээний нөхцөл
              </Link>
              <Link href="#" className="transition-colors hover:text-gray-300">
                Cookie тохиргоо
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
