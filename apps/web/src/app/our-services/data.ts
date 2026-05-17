import { ServiceCategory } from "./types";

export const MGL_SERVICES_DATA: ServiceCategory[] = [
  {
    id: "legal",
    title: "Хуулийн үйлчилгээ",
    description: "Мэргэжлийн хуульчдын баг таны бизнест учирч болох эрсдэлээс урьдчилан сэргийлж, хууль зүйн туслалцаа үзүүлнэ.",
    icon: "Scale", // Lucide icon name
    subCategories: [
      {
        id: "legal-consultation",
        title: "Хувийн хуульч (Хуульч)",
        description: "Монгол Улсын Үндсэн Хуульд зааснаар иргэн өөрийгөө өмгөөлөх, хууль зүйн туслалцаа авах эрхтэй.",
        items: [
          {
            id: "legal-consult-1",
            name: "Анхан шатны зөвлөгөө",
            price: 60000,
            priceLabel: "30,000₮ - 60,000₮",
          },
          {
            id: "legal-consult-2",
            name: "Илүү нарийвчилсан зөвлөгөө",
            price: 100000,
            priceLabel: "70,000₮ - 100,000₮",
          },
          {
            id: "legal-consult-3",
            name: "Цагийн хөлсөөр (1 цаг)",
            price: 100000,
            priceLabel: "50,000₮ - 100,000₮",
          },
          {
            id: "legal-consult-4",
            name: "Кейс дээр ажиллах",
            price: 100000,
            priceLabel: "60,000₮ - 100,000₮",
          },
        ],
      },
      {
        id: "legal-sme",
        title: "ЖДБ-үүд ихэвчлэн авдаг үйлчилгээ",
        items: [
          {
            id: "legal-sme-1",
            name: "Гэрээ хянах (боловсруулах)",
            price: 150000,
          },
          {
            id: "legal-sme-2",
            name: "Хууль зүйн асуултад хариулах",
            price: 50000,
          },
          {
            id: "legal-sme-3",
            name: "Эрсдэлээс урьдчилан сэргийлэх зөвлөгөө",
            price: 80000,
          },
          {
            id: "legal-sme-4",
            name: "Шаардлагатай бичиг баримт бэлтгэх",
            price: 120000,
          },
        ],
      },
      {
        id: "legal-packages",
        title: "Багц болон 1 сараар авах задаргаа",
        items: [
          {
            id: "legal-pack-smart",
            name: "SMART БАГЦ (1 сар)",
            price: 300000,
            features: [
              "5 хүртэлх зөвлөгөө",
              "2 гэрээ хянах",
              "Chat болон online-оор зөвлөгөө авах",
            ],
          },
          {
            id: "legal-pack-growth",
            name: "GROWTH БАГЦ (1 сар)",
            price: 500000,
            features: [
              "Хязгааргүй асуулт асуух",
              "5 гэрээ шалгах (хянах)",
              "Бичгээр дүгнэлт гаргах",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "marketing",
    title: "Маркетингийн үйлчилгээ",
    description: "Таны брэндийн үнэ цэнийг өсгөж, борлуулалтыг дэмжих цогц маркетингийн үйлчилгээ.",
    icon: "Megaphone",
    subCategories: [
      {
        id: "marketing-digital",
        title: "Дижитал маркетинг",
        items: [
          {
            id: "marketing-1",
            name: "Сошиал медиа хөтлөлт (1 сар)",
            price: 500000,
            features: ["Фэйсбүүк, Инстаграм хуудас хөтлөх", "Сард 12 постын дизайн", "Төлөвлөгөө гаргах"],
          },
          {
            id: "marketing-2",
            name: "Контент бэлтгэл (Зураг, видео)",
            price: 300000,
            features: ["Мэргэжлийн зураг авалт", "Богино хэмжээний видео", "Эвлүүлэг"],
          },
          {
            id: "marketing-3",
            name: "Маркетингийн зөвлөгөө (1 цаг)",
            price: 100000,
          },
        ],
      },
    ],
  },
  {
    id: "hr",
    title: "Хүний нөөцийн үйлчилгээ",
    description: "Байгууллагын хамгийн чухал хөрөнгө болох хүний нөөцийн бүрдүүлэлт, сургалт хөгжлийн үйлчилгээ.",
    icon: "Users",
    subCategories: [
      {
        id: "hr-recruitment",
        title: "Бүрдүүлэлт ба сонгон шалгаруулалт",
        items: [
          {
            id: "hr-1",
            name: "Ажлын байрны тодорхойлолт гаргах",
            price: 50000,
          },
          {
            id: "hr-2",
            name: "Ажилтан сонгон шалгаруулах (1 хүн)",
            price: 200000,
            features: ["Зар байршуулах", "Анкет шалгах", "Эхний шатны ярилцлага"],
          },
          {
            id: "hr-3",
            name: "Хүний нөөцийн бодлого боловсруулах",
            price: 400000,
          },
        ],
      },
    ],
  },
];
