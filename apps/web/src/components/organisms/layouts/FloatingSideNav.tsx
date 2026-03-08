import React from "react";
import {
  QrCode,
  MessageCircle,
  Headphones,
  Contact,
  FileQuestion,
} from "lucide-react";
import Link from "next/link";

const navItems = [
  { icon: QrCode, label: "APP\nтатах", href: "#" },
  { icon: MessageCircle, label: "Санал\nхүсэлт", href: "#" },
  { icon: Headphones, label: "Admin-тай\nхолбогдох", href: "#" },
  { icon: Contact, label: "Хамтарч\nажиллах", href: "#" },
  { icon: FileQuestion, label: "Нийтлэг\nасуулт", href: "#" },
];

export const FloatingSideNav = () => {
  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-4 bg-white rounded-l-3xl py-6 px-3 shadow-[-4px_0_24px_rgba(0,0,0,0.08)] border border-slate-100 border-r-0">
      {navItems.map((item, idx) => (
        <Link
          key={idx}
          href={item.href}
          className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-amber-500 transition-colors group"
        >
          <item.icon
            strokeWidth={1.5}
            className="w-7 h-7 text-slate-800 group-hover:text-amber-500 transition-colors"
          />
          <span className="text-[10px] font-bold text-center leading-tight whitespace-pre-line group-hover:text-amber-500 transition-colors">
            {item.label}
          </span>
        </Link>
      ))}
    </div>
  );
};
