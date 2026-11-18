import {
  createClubSection,
  defaultClubWebsite,
  type ClubWebsite,
  type MglClubMember,
} from "@mgl/types";
export const companyWebsiteTemplates = [
  {
    id: "corporate",
    title: "Innova загвар",
    description:
      "Нүүр зураг, бидний тухай, үйлдвэрлэл, гэрчилгээ, холбоо барих — Innova-тай ижил бүтэц.",
  },
  {
    id: "company",
    title: "Байгууллагын танилцуулга",
    description: "Нүүр зураг, бидний тухай, үйлчилгээ, холбоо барих.",
  },
  {
    id: "products",
    title: "Бүтээгдэхүүн, үйлдвэрлэл",
    description: "Бүтээгдэхүүн, үйлдвэрийн зураг болон гэрчилгээг онцолно.",
  },
  {
    id: "services",
    title: "Үйлчилгээний байгууллага",
    description:
      "Үйлчилгээ тус бүрийн зураг, тайлбар болон ажлын жишээг харуулна.",
  },
] as const;
export type CompanyWebsiteTemplateId =
  (typeof companyWebsiteTemplates)[number]["id"];
export function makeCompanyWebsiteTemplate(
  id: CompanyWebsiteTemplateId,
  member: MglClubMember,
  current?: ClubWebsite,
): ClubWebsite {
  const base = defaultClubWebsite(member);
  const home = base.sections[0];
  const about = base.sections.find((section) => section.type === "split")!;
  const services = base.sections.find(
    (section) => section.type === "services",
  )!;
  const contact = base.sections.find((section) => section.type === "contact")!;
  if (id === "corporate") {
    const preset: ClubWebsite = {
      theme: { primaryColor: "#005baa", backgroundColor: "#ffffff" },
      sections: [
        home,
        { ...about, eyebrow: "БИДНИЙ ТУХАЙ", layout: "image-left" },
        {
          ...createClubSection("gallery", "production"),
          eyebrow: "БҮТЭЭГДЭХҮҮН, ҮЙЛДВЭРЛЭЛ",
          title: "Манай бүтээгдэхүүн, үйлдвэрлэл",
          items: services.items,
        },
        {
          ...createClubSection("gallery", "certificates"),
          eyebrow: "БАРИМТ БИЧГИЙН ЦОМОГ",
          title: "Чанарын баримт бичиг",
        },
        { ...contact, tone: "light" },
      ],
    };
    if (!current) return preset;
    const used = new Set<string>();
    const sections = preset.sections.map((section) => {
      const existing = current.sections.find((candidate) => {
        if (used.has(candidate.id)) return false;
        if (section.id === "production")
          return (
            candidate.type === "services" ||
            (candidate.type === "gallery" && candidate.id !== "certificates")
          );
        if (section.id === "certificates")
          return candidate.id === "certificates";
        return candidate.type === section.type;
      });
      if (!existing) return section;
      used.add(existing.id);
      return {
        ...existing,
        id: section.id,
        type: section.type,
        layout: section.layout,
        tone: section.tone,
      };
    });
    // Keep additional products, galleries and sections when applying the layout.
    const reserved = new Set(sections.map((section) => section.id));
    const extras = current.sections
      .filter((section) => !used.has(section.id))
      .map((section) => {
        let sectionId = section.id;
        let suffix = 1;
        while (reserved.has(sectionId))
          sectionId = `extra-${section.id.slice(0, 60)}-${suffix++}`;
        reserved.add(sectionId);
        return sectionId === section.id
          ? section
          : { ...section, id: sectionId };
      });
    const contactSection = sections.pop()!;
    return { ...preset, sections: [...sections, ...extras, contactSection] };
  }
  if (id === "company") return { sections: [home, about, services, contact] };
  const gallery = {
    ...createClubSection("gallery", "gallery"),
    title:
      id === "products"
        ? "Үйлдвэрлэл, бүтээгдэхүүний зураг"
        : "Бидний хийсэн ажлууд",
    items: [],
  };
  return {
    sections: [
      home,
      about,
      {
        ...services,
        title: id === "products" ? "Манай бүтээгдэхүүн" : "Манай үйлчилгээ",
      },
      gallery,
      contact,
    ],
  };
}
