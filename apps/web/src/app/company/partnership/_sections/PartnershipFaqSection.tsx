"use client";
import { useState } from "react";
import { FAQItem } from "../../../../components/FAQItem";
import { FAQIllustration } from "../../../../components/PartnershipFAQ";

const FAQ_DATA = [
  {
    id: 1,
    title: "Маркетингийн боломжууд юу вэ?",
    answer:
      "Бид хамтрагч байгууллагуудад сошиал сурталчилгаа, баннер байршуулах, хамтарсан кампанит ажил зэрэг маркетингийн боломжуудыг санал болгодог.",
    images: [
      "https://picsum.photos/seed/marketing1/200/200",
      "https://picsum.photos/seed/marketing2/200/200",
      "https://picsum.photos/seed/marketing3/200/200",
    ],
  },
  {
    id: 2,
    title: "Захиалга яаж хянах вэ?",
    answer:
      "Та манай мерчант аппликейшн ашиглан захиалгын төлөвийг цаг алдалгүй хянах боломжтой. Захиалга ирэх, бэлтгэгдэх, хүргэгдэх зэрэг бүх үе шатыг харах боломжтой.",
    images: [],
  },
  {
    id: 3,
    title: "Тооцоо хэрхэн нийлж вэ?",
    answer:
      "Тооцоог сар бүрийн тогтсон өдрүүдэд автоматаар нийлж, таны бүртгэлтэй данс руу шилжүүлнэ. Тайланг системээс татаж авах боломжтой.",
    images: [],
  },
  {
    id: 4,
    title: "Нэмэлт шаардлагууд бий юу?",
    answer:
      "Байгууллагын албан ёсны бичиг баримт бүрэн байх, бүтээгдэхүүний чанар стандартыг хангасан байх шаардлагатай.",
    images: [],
  },
];

export default function FAQSection() {
  const [openId, setOpenId] = useState<number | null>(1);

  return (
    <section className="w-full py-20 px-4 md:px-6 lg:px-8 bg-white">
      <div className="mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-start">
          <FAQIllustration />
          <div className="space-y-2">
            {FAQ_DATA.map((q) => (
              <FAQItem
                key={q.id}
                {...q}
                isOpen={openId === q.id}
                onToggle={(id) => setOpenId(openId === id ? null : id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
