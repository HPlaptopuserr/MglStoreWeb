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
} from "lucide-react";

export const brands = [
  "Organic Valley",
  "Nature's Path",
  "Annie's",
  "Kashi",
  "Bob's Red Mill",
  "Stonyfield",
  "Horizon",
];

export const categories = [
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

export interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  image: string;
  tag?: string;
  category: string;
  rating?: number;
  reviews?: number;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo: string;
  banner: string;
  description: string;
  distance: string;
  deliveryTime: string;
  minOrder?: number;
  address: string;
  openingHours: string;
  isOpen: boolean;
  categories: string[];
  products: Product[];
  rating: number;
}

export interface InfoCardData {
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

export const partnershipInfo: PartnershipInfo = {
  title: "Бизнес, хамтын ажиллагаа",
  description:
    "Мэргэжлийн баг, өргөн хүрээний хэрэглэгчийн баз, уян хатан лицензийн нөхцөлийг ашиглан таны бүтээгдэхүүнийг зах зээлд хурдан танилцуулна. Бид хамтдаа өсөлт бий болгохыг зорьдог.",
  cta: {
    label: "Дэлгэрэнгүй",
    href: "/company/partnership",
  },
};

export const partnershipServices: InfoCardData[] = [
  {
    title: "Зах зээлийг тэл",
    description:
      "Улаанбаатар хотын иргэн бүртэй холбогдох, бүтээгдэхүүнээ олон мянган хүнд санал болгох боломжтой.",
    image: "https://picsum.photos/seed/market/200/200",
  },
  {
    title: "Шонпер карт",
    description:
      "Бид захиалгаа бүрийн төлбөрийг дор бүр нь хядар тул таны бизнесийн хөрвөх чадварыг сайжруулж, мөнгөн урсгалыг нэмэгдүүлнэ.",
    image: "https://picsum.photos/seed/card/200/200",
  },
  {
    title: "Маркетинг дэмжлэг",
    description:
      "Борлуулалтыг нэмэгдүүлэхийн тулд хамтарсан маркетинг, тусгай урамшуулал, зорилтот сурталчилгаа зэргийг ашиглах боломжтой. Манай баг таны бүтээгдэхүүнийг хэрэглэгчдэд илүү ойртуулна.",
    image: "https://picsum.photos/seed/marketing/200/200",
  },
  {
    title: "Найдвартай хүргэлтийн үйлчилгээ",
    description:
      "Бид хүргэлтийн бүүхий л үe шатaр хариуцаж, хэрэглэгчдэд хурдан, найдвартай үйлчилгээг үзүүлнэ. Ингэснээр та зөвхөн бизнесийнхээ өсөлтөд төвлөрч болно.",
    image: "https://picsum.photos/seed/delivery/200/200",
  },
  {
    title: "Борлуулалтын дүн шинжилгээ",
    description:
      "Зах зээлийг чих хангахад, борлуулалтын анализыг нарийвчилсан цагийн горимд хүлээн авч, бизнесийнхээ стратегийг оновчтой болгоно.",
    image: "https://picsum.photos/seed/analytics/200/200",
  },
  {
    title: "Захиалга удирдлагын платформ",
    description:
      "Ta хүссэн үедээ бүтээгдэхүүн нэмэх, хэсэлж хангах, захиалга удирдах боломжтой түүний FreshPack-тай хамт дижитал шилжилт хийнэ.",
    image: "https://picsum.photos/seed/platform/200/200",
  },
  {
    title: "Захиалга удирдлагын платйыбйыбформ",
    description:
      "Ta хүссэн үедээ бүтээгдэхүүн нэмэх, хэсэлж хангах, захиалга удирдах боломжтой түүний FreshPack-тай хамт дижитал шилжилт хийнэ.",
    image: "https://picsum.photos/seed/platform/200/200",
  },
  {
    title: "Захиалга удирдлагын платфорёячячёям",
    description:
      "Ta хүссэн үедээ бүтээгдэхүүн нэмэх, хэсэлж хангах, захиалга удирдах боломжтой түүний FreshPack-тай хамт дижитал шилжилт хийнэ.",
    image: "https://picsum.photos/seed/platform/200/200",
  },
  {
    title: "Захиалга удирдлагын платфойыбыбрм",
    description:
      "Ta хүссэн үедээ бүтээгдэхүүн нэмэх, хэсэлж хангах, захиалга удирдах боломжтой түүний FreshPack-тай хамт дижитал шилжилт хийнэ.",
    image: "https://picsum.photos/seed/platform/200/200",
  },
];

export const companies: Company[] = [
  {
    id: "1",
    name: "Coca-Cola Official Store",
    slug: "coca-cola",
    logo: "https://picsum.photos/seed/coke-logo/100/100",
    banner: "https://picsum.photos/seed/coke-banner/1200/400",
    description:
      "The official store for Coca-Cola products. Refresh yourself with our wide range of beverages.",
    distance: "3.27 Km",
    deliveryTime: "10:00 - 18:00",
    address: "Zaisan Street, Orgil Shilttgeen, Pik Pak Warehouse",
    openingHours: "10:00 - 18:00",
    isOpen: true,
    rating: 4.8,
    categories: ["Soft Drinks", "Water", "Juice", "Energy Drinks"],
    products: [
      {
        id: "p1",
        title: "Coca-Cola PET 300ml",
        price: 16350,
        image: "https://picsum.photos/seed/coke1/300/300",
        category: "Soft Drinks",
        tag: "Bundle",
        rating: 4.8,
        reviews: 320,
      },
      {
        id: "p2",
        title: "Fanta Orange PET 300ml",
        price: 16350,
        image: "https://picsum.photos/seed/fanta/300/300",
        category: "Soft Drinks",
        tag: "Bundle",
        rating: 4.5,
        reviews: 215,
      },
      {
        id: "p3",
        title: "MM Nectar Apple PET 1L",
        price: 30660,
        image: "https://picsum.photos/seed/juice1/300/300",
        category: "Juice",
        tag: "6 pack",
        rating: 4.9,
        reviews: 180,
      },
      {
        id: "p4",
        title: "Bonaqua Water 500ml",
        price: 12000,
        image: "https://picsum.photos/seed/water/300/300",
        category: "Water",
        tag: "12 pack",
        rating: 4.7,
        reviews: 450,
      },
      {
        id: "p5",
        title: "Sprite 2L",
        price: 4500,
        image: "https://picsum.photos/seed/sprite/300/300",
        category: "Soft Drinks",
        rating: 4.6,
        reviews: 156,
      },
    ],
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
    categories: ["Beef", "Lamb", "Gift Sets", "Processed Meat"],
    products: [
      {
        id: "pm1",
        title: "Special Dinner Box",
        price: 264000,
        image: "https://picsum.photos/seed/meatbox/300/300",
        category: "Gift Sets",
        tag: "Premium",
        rating: 5,
        reviews: 84,
      },
      {
        id: "pm2",
        title: "Beef Thigh 10kg",
        price: 325200,
        image: "https://picsum.photos/seed/beef/300/300",
        category: "Beef",
        tag: "Bulk",
        rating: 4.8,
        reviews: 56,
      },
      {
        id: "pm3",
        title: "King's Set 6kg",
        price: 197300,
        image: "https://picsum.photos/seed/kingset/300/300",
        category: "Gift Sets",
        rating: 4.9,
        reviews: 112,
      },
      {
        id: "pm4",
        title: "Short Ribs (5cm)",
        price: 27500,
        image: "https://picsum.photos/seed/ribs/300/300",
        category: "Beef",
        rating: 4.7,
        reviews: 93,
      },
    ],
  },
];
