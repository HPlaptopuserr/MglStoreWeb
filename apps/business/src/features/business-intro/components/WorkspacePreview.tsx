import {
  ArrowUpRight,
  Check,
  Clock3,
  Package,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";

const modules = [
  {
    icon: Users,
    title: "Миний баг",
    text: "Ажилтан · Эрх",
    href: "/attendance/employees",
  },
  {
    icon: Clock3,
    title: "Цаг бүртгэл",
    text: "Ирц · Хуваарь",
    href: "/attendance",
  },
  {
    icon: Package,
    title: "Бараа таталт",
    text: "Каталог · Хүсэлт",
    href: "#service-inventory",
  },
  {
    icon: Truck,
    title: "Хүргэлт",
    text: "Маршрут · Явц",
    href: "#service-delivery",
  },
] as const;

export function WorkspacePreview() {
  return (
    <div className="workspace-preview" aria-label="Ажлын орчны жишиг дүрслэл">
      <div className="preview-top">
        <span className="preview-mark">M</span>
        <span>
          MGL Business<small>Таны ажлын орчин</small>
        </span>
        <span className="preview-label">Жишиг харагдац</span>
      </div>
      <div className="preview-heading">
        <span>Өнөөдрийн ажлаа эхэлье.</span>
        <p>Нэг баг. Нэгдсэн ажлын урсгал.</p>
      </div>
      <div className="preview-grid">
        {modules.map(({ icon: Icon, title, text, href }) => (
          <Link href={href} key={title}>
            <Icon size={22} aria-hidden="true" />
            <strong>{title}</strong>
            <small>{text}</small>
            <ArrowUpRight
              className="module-arrow"
              size={15}
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
      <div className="preview-bottom">
        <Check size={15} aria-hidden="true" />
        <span>Өөрийн эрхэд тохирсон үйлчилгээнүүд</span>
      </div>
    </div>
  );
}
