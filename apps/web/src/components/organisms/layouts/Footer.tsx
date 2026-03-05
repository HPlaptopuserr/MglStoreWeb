"use client";

import Link from "next/link";
import {
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Twitter,
  ArrowRight,
} from "lucide-react";

export const Footer = () => {
  return (
    <footer className="w-full font-sans">
      {/* Top CTA Banner - Adidas Style */}
      {/*       <div className="bg-[#FF6600] text-white py-8 px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center md:text-left uppercase">
            MGL Club-д нэгдээд 15% хөнгөлөлт эдлээрэй
          </h2>
          <button className="bg-white text-black px-6 py-3 font-bold text-sm uppercase tracking-wider hover:bg-gray-100 transition-colors flex items-center gap-2 group shrink-0">
            Үнэгүй бүртгүүлэх
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div> */}

      {/* Main Footer Content - Light Theme */}
      <div className="bg-gray-50 text-gray-900 pt-16 pb-8 px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-16">
          {/* Column 1 */}
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-lg uppercase tracking-wider mb-2">
              Бүтээгдэхүүн
            </h3>
            <ul className="flex flex-col gap-2 text-sm text-gray-600">
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Гутал
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Хувцас
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Аксессуар
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Бэлгийн карт
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Шинэ загвар
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Хямдрал
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-lg uppercase tracking-wider mb-2">
              Спорт
            </h3>
            <ul className="flex flex-col gap-2 text-sm text-gray-600">
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Хөл бөмбөг
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Гүйлт
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Сагсан бөмбөг
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Фитнесс
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Теннис
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Аялал
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-lg uppercase tracking-wider mb-2">
              Үйлчилгээ
            </h3>
            <ul className="flex flex-col gap-2 text-sm text-gray-600">
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Adicolor
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Ultraboost
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  NMD
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Forum
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Superstar
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Running
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4 */}
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-lg uppercase tracking-wider mb-2">
              Тусламж
            </h3>
            <ul className="flex flex-col gap-2 text-sm text-gray-600">
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Тусламжийн төв
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Буцаалт
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Хүргэлт
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Захиалга хянах
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Хэмжээний хүснэгт
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Төлбөрийн нөхцөл
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5 */}
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-lg uppercase tracking-wider mb-2">
              Компани
            </h3>
            <ul className="flex flex-col gap-2 text-sm text-gray-600">
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Бидний тухай
                </Link>
              </li>
              <li>
                <Link
                  href="/company/partnership"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Хамтран ажиллах
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Ажлын байр
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  Мэдээ
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-[#FF6600] hover:underline transition-colors"
                >
                  MGL store
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 6 - Socials */}
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-lg uppercase tracking-wider mb-2">
              Биднийг дагаарай
            </h3>
            <div className="flex flex-col gap-3">
              <Link
                href="#"
                className="flex items-center gap-3 text-gray-600 hover:text-[#FF6600] transition-colors group"
              >
                <Facebook className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Facebook</span>
              </Link>
              <Link
                href="#"
                className="flex items-center gap-3 text-gray-600 hover:text-[#FF6600] transition-colors group"
              >
                <Instagram className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Instagram</span>
              </Link>
              <Link
                href="#"
                className="flex items-center gap-3 text-gray-600 hover:text-[#FF6600] transition-colors group"
              >
                <Twitter className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Twitter</span>
              </Link>
              <Link
                href="#"
                className="flex items-center gap-3 text-gray-600 hover:text-[#FF6600] transition-colors group"
              >
                <Youtube className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm">YouTube</span>
              </Link>
              <Link
                href="#"
                className="flex items-center gap-3 text-gray-600 hover:text-[#FF6600] transition-colors group"
              >
                <Linkedin className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm">LinkedIn</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Legal Section - Toyota Style Layout */}
        <div className="mx-auto max-w-7xl border-t border-gray-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <Link href="/" className="flex items-end gap-1">
              <span className="text-2xl font-bold tracking-tight text-[#FF6600]">
                MGL store
              </span>
              <span className="text-[8px] mb-1 text-gray-500 font-medium">
                баяр
                <br />
                нэмье
              </span>
            </Link>
            <div className="text-xs text-gray-500">
              © 2026 MGL STORE. Бүх эрх хуулиар хамгаалагдсан.
            </div>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-xs text-gray-500">
            <Link href="#" className="hover:text-[#FF6600] transition-colors">
              Нууцлалын бодлого
            </Link>
            <span className="hidden md:inline text-gray-300">|</span>
            <Link href="#" className="hover:text-[#FF6600] transition-colors">
              Үйлчилгээний нөхцөл
            </Link>
            <span className="hidden md:inline text-gray-300">|</span>
            <Link href="#" className="hover:text-[#FF6600] transition-colors">
              Сайтын бүтэц
            </Link>
            <span className="hidden md:inline text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <Link
                href="#"
                className="hover:text-[#FF6600] transition-colors font-bold"
              >
                Холбоо барих
              </Link>
              <Link
                href="#"
                className="hover:text-[#FF6600] transition-colors font-bold"
              >
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
