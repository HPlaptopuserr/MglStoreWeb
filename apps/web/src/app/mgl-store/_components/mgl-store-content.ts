import {
  BadgeCheck,
  Coffee,
  CreditCard,
  LayoutGrid,
  PackageCheck,
  Repeat2,
  SearchCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  UsersRound,
  Warehouse,
} from "lucide-react";

export const franchiseSlideDeck = [
  {
    title: "Монгол эзэнтэй үндэсний сүлжээ дэлгүүр",
    src: "/mgl-store/franchise-slides/slide-01.webp",
  },
  {
    title: "Энгийн найман нэрээс стандарттай MGL Store Member дэлгүүр",
    src: "/mgl-store/franchise-slides/slide-02.webp",
  },
  {
    title: "51м² стандарт дэлгүүрийн бүтэц",
    src: "/mgl-store/franchise-slides/slide-05.webp",
  },
  {
    title: "Хэрэглэгчийн урсгал ба зайн стандарт",
    src: "/mgl-store/franchise-slides/slide-06.webp",
  },
  {
    title: "Касс / POS - хурдан үйлчилгээний төв",
    src: "/mgl-store/franchise-slides/slide-07.webp",
  },
  {
    title: "Кофе + суух жижиг булан",
    src: "/mgl-store/franchise-slides/slide-08.webp",
  },
  {
    title: "Лангуу, тавиур, бараа өрөлтийн стандарт",
    src: "/mgl-store/franchise-slides/slide-09.webp",
  },
  {
    title: "Гишүүнээр элссэнээр авах давуу тал",
    src: "/mgl-store/franchise-slides/slide-10.webp",
  },
];

export const presentationHighlights = [
  {
    title: "Дэлгүүрийн стандарт",
    description: "Жижиг, дунд бизнес эрхлэгчид нэг стандартаар шинэчлэгдэнэ.",
    icon: Store,
  },
  {
    title: "Нэгдсэн маркетинг",
    description: "MGL Store-ийн танигдах тэмдэг, промо, борлуулалтын сувгаар дэмжинэ.",
    icon: Sparkles,
  },
  {
    title: "Борлуулалтын шинэ суваг",
    description: "Гишүүн дэлгүүрүүд системээр дамжин илүү олон хэрэглэгчид хүрнэ.",
    icon: ShoppingBag,
  },
];

export const sixSStandards = [
  { title: "Ариун Цэврийн өрөө", icon: SearchCheck },
  { title: "Хаягжилт", icon: LayoutGrid },
  { title: "Coffee Zone", icon: Sparkles },
  { title: "Сургалт", icon: BadgeCheck },
  { title: "Стандарт", icon: Repeat2 },
  { title: "Маркетинг", icon: ShieldCheck },
];

export const standardSections = [
  {
    title: "51м² бүтэц",
    description: "Орц, касс, хөргөгч, арал тавиур, кофе булан, агуулах, ариун цэврийн өрөө.",
    icon: LayoutGrid,
  },
  {
    title: "Касс / POS",
    description: "POS дэлгэц, баркод уншигч, QR / картын төлбөр, кабель далд шийдэл.",
    icon: CreditCard,
  },
  {
    title: "Кофе булан",
    description: "Хэрэглэгч удаан саатаж, дундаж худалдан авалт өсөх нэмэлт орлогын хэсэг.",
    icon: Coffee,
  },
  {
    title: "Мерчандайзинг",
    description: "Нүдний түвшин, үнийн шошго, ангилал, урамшууллын байрлал цэгцтэй болно.",
    icon: PackageCheck,
  },
];

export const membershipAdvantageGroups = [
  {
    title: "Дэлгүүрийн эзэнд",
    icon: Store,
    items: [
      "Стандарт шинэчлэл",
      "Маркетингийн дэмжлэг",
      "Бараа татан авалтын боломж",
      "Борлуулалтын шинэ систем",
    ],
  },
  {
    title: "Үйлдвэрлэгчид",
    icon: Warehouse,
    items: [
      "Олон дэлгүүрт бүтээгдэхүүнээ байрлуулах",
      "Брэндээ таниулах",
      "Борлуулалтын суваг нэмэх",
    ],
  },
  {
    title: "Хэрэглэгчид",
    icon: UsersRound,
    items: ["Цэвэр дэлгүүр", "Тодорхой үнэ", "Нэг дороос олон сонголт"],
  },
];
