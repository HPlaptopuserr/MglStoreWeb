import {
  Apple,
  Beef,
  Milk,
  Croissant,
  Fish,
  Carrot,
  Coffee,
  IceCream,
  Utensils,
  LucideIcon,
  Handshake,
  Target,
  Zap,
  Users,
  Globe,
  ShieldCheck,
  BarChart3,
  Award,
  Briefcase,
} from "lucide-react";
import type { CompanyCard } from "@mgl/types";

export interface InfoCardData {
  icon: LucideIcon;
  title: string;
  description: string;
  image: string;
}

export interface PartnershipInfo {
  title: string;
  description: string;
  cta: {
    label: string;
    href: string;
  };
}

const baseBrands = [
  "APU",
  "MCS",
  "Annie's",
  "Kashi",
  "Bob's Red Mill",
  "Stonyfield",
  "Horizon",
];
export const brands = Array.from({ length: 30 }, (_, i) =>
  i < baseBrands.length
    ? baseBrands[i]
    : `${baseBrands[i % baseBrands.length]} ${i + 1}`,
);

const baseCategories = [
  { icon: Apple, label: "Fruits", color: "bg-red-50 text-red-500" },
  { icon: Carrot, label: "Vegetables", color: "bg-green-50 text-green-600" },
  { icon: Beef, label: "Meat", color: "bg-rose-50 text-rose-600" },
  { icon: Milk, label: "Dairy", color: "bg-blue-50 text-blue-500" },
  { icon: Croissant, label: "Bakery", color: "bg-amber-50 text-amber-600" },
  { icon: Fish, label: "Seafood", color: "bg-cyan-50 text-cyan-600" },
  { icon: Coffee, label: "Beverages", color: "bg-stone-50 text-stone-600" },
  { icon: IceCream, label: "Frozen", color: "bg-purple-50 text-purple-500" },
  { icon: Utensils, label: "Prepared", color: "bg-orange-50 text-orange-500" },
];

export const categories = Array.from({ length: 30 }, (_, i) => ({
  ...baseCategories[i % baseCategories.length],
  label:
    i < baseCategories.length
      ? baseCategories[i].label
      : `${baseCategories[i % baseCategories.length].label} ${i + 1}`,
}));

export const partnershipInfo: PartnershipInfo = {
  title: "Бизнес, хамтын ажиллагаа",
  description:
    "Мэргэжлийн баг, өргөн хүрээний хэрэглэгчийн баз, уян хатан лицензийн нөхцөлийг ашиглан таны бүтээгдэхүүнийг зах зээлд хурдан танилцуулна. Бид хамтдаа өсөлт бий болгохыг зорьдог.",
  cta: {
    label: "Дэлгэрэнгүй",
    href: "/company/partnership",
  },
};

const baseServices: InfoCardData[] = [
  {
    title: "Зах зээлийг тэл",
    description: "Улаанбаатар хотын иргэн бүртэй холбогдох...",
    image: "https://picsum.photos/seed/market/200/200",
    icon: Handshake,
  },
  {
    title: "Шоппер карт",
    description: "Мөнгөн урсгалыг нэмэгдүүлнэ.",
    image: "https://picsum.photos/seed/card/200/200",
    icon: Target,
  },
  {
    title: "Маркетинг дэмжлэг",
    description: "Хамтарсан маркетинг, тусгай урамшуулал.",
    image: "https://picsum.photos/seed/marketing/200/200",
    icon: Zap,
  },
  {
    title: "Хүргэлтийн үйлчилгээ",
    description: "Хурдан, найдвартай үйлчилгээ.",
    image: "https://picsum.photos/seed/delivery/200/200",
    icon: BarChart3,
  },
  {
    title: "Дүн шинжилгээ",
    description: "Борлуулалтын анализыг нарийвчилсан байдлаар харна.",
    image: "https://picsum.photos/seed/analytics/200/200",
    icon: Globe,
  },
  {
    title: "Удирдлагын платформ",
    description: "Дижитал шилжилт хийнэ.",
    image: "https://picsum.photos/seed/platform/200/200",
    icon: Users,
  },
  {
    title: "Аюулгүй байдал",
    description: "Мэдээллийн аюулгүй байдлын стандарт.",
    image: "https://picsum.photos/seed/security/200/200",
    icon: ShieldCheck,
  },
  {
    title: "Бизнес түншлэл",
    description: "B2B харилцааг өргөжүүлэх.",
    image: "https://picsum.photos/seed/business/200/200",
    icon: Briefcase,
  },
  {
    title: "Урамшууллын систем",
    description: "Хэрэглэгчийн үнэнч байдлыг нэмэгдүүлэх.",
    image: "https://picsum.photos/seed/rewards/200/200",
    icon: Award,
  },
];

export const partnershipServices: InfoCardData[] = Array.from(
  { length: 30 },
  (_, i) => {
    const base = baseServices[i % baseServices.length];
    return {
      ...base,
      title: i < baseServices.length ? base.title : `${base.title} ${i + 1}`,
      image: `https://picsum.photos/seed/service-${i}/200/200`,
    };
  },
);

const baseCompanies: CompanyCard[] = [
  {
    id: "1",
    name: "Coca-Cola Official Store",
    slug: "coca-cola",
    logo: "https://picsum.photos/seed/coke-logo/100/100",
    banner: "https://picsum.photos/seed/coke-banner/1200/400",
    description: "The official store for Coca-Cola products.",
    distance: "3.27 Km",
    deliveryTime: "10:00 - 18:00",
    address: "Zaisan Street, Orgil Shilttgeen, Pik Pak Warehouse",
    openingHours: "10:00 - 18:00",
    isOpen: true,
    rating: 4.8,
    category: "Beverages",
    categories: ["Soft Drinks", "Water", "Juice", "Energy Drinks"],
    products: Array.from({ length: 30 }, (_, pi) => ({
      id: `p1-${pi}`,
      title: `Coca-Cola Variant ${pi + 1}`,
      price: 16350 + pi * 100,
      originalPrice: 18500 + pi * 100,
      image: `https://picsum.photos/seed/coke${pi}/300/300`,
      category: "Soft Drinks",
      tag: pi % 3 === 0 ? "Bundle" : undefined,
      rating: 4.8,
      reviews: 320 + pi,
      stock: 54 - pi,
    })),
  },
  {
    id: "2",
    name: "Primeat",
    slug: "primeat",
    logo: "https://picsum.photos/seed/primeat-logo/100/100",
    banner: "https://picsum.photos/seed/meat-banner/1200/400",
    description:
      "Premium quality meat products sourced directly from Mongolian herders.",
    distance: "2.87 Km",
    deliveryTime: "09:00 - 20:00",
    address: "Khan-Uul District, 15th Khoroo, Primeat Factory",
    openingHours: "09:00 - 20:00",
    isOpen: false,
    rating: 4.9,
    category: "Meat",
    categories: ["Beef", "Lamb", "Gift Sets", "Processed Meat"],
    products: Array.from({ length: 30 }, (_, pi) => ({
      id: `pm1-${pi}`,
      title: `Special Dinner Box ${pi + 1}`,
      price: 264000 + pi * 1000,
      originalPrice: 289000 + pi * 1000,
      image: `https://picsum.photos/seed/meatbox${pi}/300/300`,
      category: "Gift Sets",
      tag: "Premium",
      rating: 5,
      reviews: 84 + pi,
      stock: 12 + pi,
    })),
  },
];

export const companies: CompanyCard[] = Array.from({ length: 30 }, (_, i) => {
  const base = baseCompanies[i % baseCompanies.length];
  return {
    ...base,
    id: `comp-${i + 1}`,
    name: i < baseCompanies.length ? base.name : `${base.name} Branch ${i + 1}`,
    slug: `${base.slug}-${i + 1}`,
    logo: `https://picsum.photos/seed/logo-${i}/100/100`,
    banner: `https://picsum.photos/seed/banner-${i}/1200/400`,
    products: base.products.map((p) => ({ ...p, id: `${p.id}-c${i}` })),
  };
});
