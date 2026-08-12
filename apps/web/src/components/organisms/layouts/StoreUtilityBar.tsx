import Link from "next/link";
import { ShoppingCart } from "lucide-react";

interface UtilityLink {
  href: string;
  label: string;
  hideOnSmallScreen?: boolean;
}

const utilityLinks: readonly UtilityLink[] = [
  { href: "/", label: "Нүүр" },
  { href: "/orders", label: "Захиалга" },
  { href: "/profile", label: "Миний бүртгэл", hideOnSmallScreen: true },
];

interface StoreUtilityBarProps {
  containerClassName?: string;
}

export function StoreUtilityBar({
  containerClassName = "container mx-auto px-3 sm:px-4",
}: StoreUtilityBarProps) {
  return (
    <div className="border-b border-slate-100 bg-white">
      <div
        className={`${containerClassName} flex h-8 items-center justify-between gap-4 text-[10px] font-bold text-slate-500 sm:text-[11px]`}
      >
        <div className="flex shrink-0 items-center gap-4">
          <Link
            href="/"
            className="transition-colors hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            MGL Store
          </Link>
          <span>Монгол</span>
        </div>

        <nav aria-label="Хэрэглэгчийн туслах цэс" className="flex items-center gap-3 sm:gap-5">
          {utilityLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${item.hideOnSmallScreen ? "hidden sm:inline" : ""} whitespace-nowrap transition-colors hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/checkout"
            className="inline-flex items-center gap-1 whitespace-nowrap transition-colors hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <ShoppingCart className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
            Сагс
          </Link>
        </nav>
      </div>
    </div>
  );
}
