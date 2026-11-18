import {
  createClubSection,
  type ClubWebsite,
} from "../domain/mgl-club-website";
import type { MglClubMember } from "../domain/mgl-club";

/** Owner-provided published default; importing it never records a payment. */
export const innovaCompany: MglClubMember = {
  id: "demo-company-innova",
  businessName: "Иннова ХХК",
  logoUrl: "/mgl-club/website-demo/innova-logo.png",
  name: "Иннова ХХК",
  role: "Захиалга, дэлгэрэнгүй мэдээлэл",
  sector: "Үйлдвэрлэл",
  city: "Улаанбаатар",
  description:
    "Иннова ХХК нь 20 жилийн туршлага, бүтээгдэхүүний чанар, харилцагчдынхаа итгэлд тулгуурлан эко хөнгөн бетон блок үйлдвэрлэн нийлүүлдэг. Бид бат бөх, хөнгөн жинтэй, дулаан болон дуу тусгаарлалт сайтай, галд тэсвэртэй бүтээгдэхүүнийг санал болгодог.",
  offers: "Эко хөнгөн бетон блок үйлдвэрлэл, Хөнгөн бетон блок нийлүүлэлт",
  needs: "",
  foundedYear: "",
  teamSize: "",
  address: "Баянгол дүүрэг, 29-р хороо, үйлдвэрийн баруун бүс",
  workingHours: "",
  serviceArea: "",
  phone: "80100101",
  website: "https://www.facebook.com/profile.php?id=61591279665085",
};
export const localCompanies: MglClubMember[] = [innovaCompany];

export const innovaWebsite: ClubWebsite = {
  theme: { primaryColor: "#005baa", backgroundColor: "#ffffff" },
  sections: [
    {
      ...createClubSection("hero", "home"),
      heroImageMode: "background",
      imageUrl: "/mgl-club/website-demo/innova-product-hero.png",
      imageAlt: "Иннова хөнгөн бетон блокны бүтээгдэхүүний дүрслэл",
      eyebrow: "ИННОВА ХХК · ЭКО ХӨНГӨН БЕТОН БЛОКНЫ ҮЙЛДВЭР",
      title: "Бат бөх бүтээн байгуулалт\nзөв материалаас эхэлнэ.",
      text: "Чанартай бүтээгдэхүүн — Бат бөх бүтээн байгуулалт.\n20 жилийн туршлагаар хөнгөн бетон блок үйлдвэрлэн нийлүүлнэ.",
    },
    {
      ...createClubSection("split", "about"),
      eyebrow: "БИДНИЙ ТУХАЙ",
      title: "20 жилийн туршлага.\nЧанартай бүтээн байгуулалт.",
      layout: "image-left",
      text: innovaCompany.description,
      imageUrl: "/mgl-club/website-demo/innova-engineer.png",
      imageAlt: "Үйлдвэрийн ажлын орчин дахь инженер",
      items: [
        {
          title: "Бат бөх",
          text: "Бат бөх бүтээн байгуулалтад зориулсан хөнгөн бетон блок.",
          imageUrl: "",
          imageAlt: "",
        },
        {
          title: "Хөнгөн жинтэй",
          text: "Хөнгөн бетон блок үйлдвэрлэн нийлүүлнэ.",
          imageUrl: "",
          imageAlt: "",
        },
        {
          title: "Дулаан, дуу тусгаарлалт",
          text: "Дулаан болон дуу тусгаарлалт сайтай бүтээгдэхүүн.",
          imageUrl: "",
          imageAlt: "",
        },
        {
          title: "Галд тэсвэртэй",
          text: "Галд тэсвэртэй хөнгөн бетон блок.",
          imageUrl: "",
          imageAlt: "",
        },
        {
          title: "Хурдан өрөгдөнө",
          text: "Хөнгөн жинтэй, ачаалал багатай бүтээгдэхүүн.",
          imageUrl: "",
          imageAlt: "",
        },
        {
          title: "Дулаан алдагдал бага",
          text: "Эрчим хүчний хэмнэлттэй, удаан хугацааны баталгаатай.",
          imageUrl: "",
          imageAlt: "",
        },
      ],
    },
    {
      ...createClubSection("gallery", "production"),
      eyebrow: "ҮЙЛДВЭРЛЭЛИЙН ҮЙЛ ЯВЦ",
      title: "Түүхий эдээс бэлэн бүтээгдэхүүн хүртэл",
      text: "Цэвэр элс, шохойн үндсэн түүхий эдээр, хаягдал үнс болон үйлдвэрийн дайвар бүтээгдэхүүний хольцгүй хөнгөн бетон блок үйлдвэрлэнэ.",
      items: [
        {
          title: "Үйлдвэр, агуулах",
          text: "Үйлдвэрийн барилга, ачилтын талбай.",
          imageUrl: "/mgl-club/website-demo/innova-warehouse.png",
          imageAlt: "Үйлдвэр, агуулахын гадна талын харагдац",
        },
        {
          title: "Блок зүсэх дамжлага",
          text: "Хөнгөн бетон блок боловсруулах тоног төхөөрөмж.",
          imageUrl: "/mgl-club/website-demo/innova-cutting.png",
          imageAlt: "Блок зүсэх тоног төхөөрөмж болон бэлдэц",
        },
        {
          title: "Үйлдвэрлэлийн тоног төхөөрөмж",
          text: "Үйлдвэрийн дамжлагын ойрын харагдац.",
          imageUrl: "/mgl-club/website-demo/innova-production.png",
          imageAlt: "Хөнгөн бетон блок боловсруулах үйлдвэрийн дамжлага",
        },
        {
          title: "Боловсруулалтын хэсэг",
          text: "Блок боловсруулах тоног төхөөрөмжийн деталь.",
          imageUrl: "/mgl-club/website-demo/innova-equipment.png",
          imageAlt:
            "Үйлдвэрлэлийн тоног төхөөрөмжийн цилиндр, хоолой болон блок",
        },
      ],
    },
    {
      ...createClubSection("gallery", "certificates"),
      eyebrow: "БАРИМТ БИЧГИЙН ЦОМОГ",
      title: "Чанарын баримт бичиг",
      text: "Байгууллагаас ирүүлсэн гэрчилгээний өндөр нягтралтай эх зургууд. Зураг дээр дарж томруулан уншина уу.",
      items: [
        {
          title: "Тохирлын гэрчилгээ",
          text: "№ 55/25 · Зураг дээрх олгосон огноо: 2025.12.26.",
          imageUrl: "/mgl-club/website-demo/innova-conformity-document.png",
          imageAlt: "Тохирлын гэрчилгээ бүхий ирүүлсэн эх зураг",
        },
        {
          title: "Органик бүтээгдэхүүний гэрчилгээ",
          text: "2023 оны 12-р сарын 20-ны гэрчилгээ бүхий ирүүлсэн эх зураг.",
          imageUrl: "/mgl-club/website-demo/innova-organic-document.png",
          imageAlt: "Органик бүтээгдэхүүний гэрчилгээ бүхий ирүүлсэн эх зураг",
        },
      ],
    },
    {
      ...createClubSection("contact", "contact"),
      tone: "light",
      eyebrow: "ЗАХИАЛГА, ДЭЛГЭРЭНГҮЙ МЭДЭЭЛЭЛ",
      title: "Бүтээн байгуулалтаа\nхамтдаа эхлүүлье.",
      text: "Утас: 8010-0101, 9400-0042\n\nАмины орон сууц, орон сууц, үйлдвэр, агуулах болон үйлчилгээний төвийн бүтээн байгуулалтад зориулан нийлүүлнэ.\n\nЗахиалгын дэлгэрэнгүй мэдээллийг утсаар болон Facebook хуудсаар лавлаарай.",
    },
  ],
};
