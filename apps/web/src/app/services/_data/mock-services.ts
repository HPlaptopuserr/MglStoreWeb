import type { ServicePost } from "@/app/services/_components/ServiceCard";

const MOCK_SERVICES: ServicePost[] = [
  {
    id: "mock-service-hr-audit",
    title: "Хүний нөөцийн үнэгүй оношилгоо",
    description:
      "Байгууллагын хүний нөөцийн одоогийн процесс, алдаа, сайжруулах боломжийг богино хугацаанд тодорхойлно.",
    priceText: "Үнэгүй",
    tags: ["HR", "Audit"],
    images: [
      {
        id: "mock-service-hr-audit-img",
        url: "https://picsum.photos/seed/mgl-service-hr-audit/600/600",
      },
    ],
    organization: {
      id: "mock-org-mgl",
      name: "MGL Store Service",
      slug: "mgl-store-service",
      logoUrl: null,
    },
    createdAt: "2026-05-04T00:00:00.000Z",
  },
  {
    id: "mock-service-recruitment",
    title: "Ажилтан сонгон шалгаруулалт",
    description:
      "Ажлын зар, анкет шүүлт, ярилцлагын зохион байгуулалт, shortlist бэлтгэх үйлчилгээ.",
    priceText: "",
    tags: ["Recruitment", "HR"],
    images: [
      {
        id: "mock-service-recruitment-img",
        url: "https://picsum.photos/seed/mgl-service-recruitment/600/600",
      },
    ],
    organization: {
      id: "mock-org-mgl",
      name: "MGL Store Service",
      slug: "mgl-store-service",
      logoUrl: null,
    },
    createdAt: "2026-05-04T00:00:00.000Z",
  },
  {
    id: "mock-service-accounting",
    title: "Санхүү, татварын зөвлөгөө",
    description:
      "Тайлан, бүртгэл, татварын эрсдэлийн зөвлөгөө болон санхүүгийн процесс цэгцлэх үйлчилгээ.",
    priceText: "",
    tags: ["Санхүү", "Татвар"],
    images: [
      {
        id: "mock-service-accounting-img",
        url: "https://picsum.photos/seed/mgl-service-accounting/600/600",
      },
    ],
    organization: {
      id: "mock-org-finance",
      name: "Steppe Finance",
      slug: "steppe-finance",
      logoUrl: null,
    },
    createdAt: "2026-05-04T00:00:00.000Z",
  },
  {
    id: "mock-service-legal",
    title: "Гэрээ, эрх зүйн зөвлөгөө",
    description:
      "Байгууллагын гэрээ, дүрэм журам, хөдөлмөрийн харилцааны баримт бичиг боловсруулах үйлчилгээ.",
    priceText: "",
    tags: ["Legal", "Гэрээ"],
    images: [
      {
        id: "mock-service-legal-img",
        url: "https://picsum.photos/seed/mgl-service-legal/600/600",
      },
    ],
    organization: {
      id: "mock-org-legal",
      name: "Business Legal",
      slug: "business-legal",
      logoUrl: null,
    },
    createdAt: "2026-05-04T00:00:00.000Z",
  },
];

export const mockServices: ServicePost[] = Array.from(
  { length: 16 },
  (_, index) => {
    const service = MOCK_SERVICES[index % MOCK_SERVICES.length];

    return {
      ...service,
      id: `${service.id}-${index + 1}`,
      title:
        index < MOCK_SERVICES.length
          ? service.title
          : `${service.title} ${index + 1}`,
      images: service.images.map((image) => ({
        ...image,
        id: `${image.id}-${index + 1}`,
        url: `https://picsum.photos/seed/mgl-service-${index + 1}/600/600`,
      })),
    };
  },
);
