import {
  createClubSection,
  defaultClubWebsite,
  type ClubWebsite,
  type MglClubMember,
} from "@mgl/types";
export const companyWebsiteTemplates = [
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
): ClubWebsite {
  const base = defaultClubWebsite(member);
  const home = base.sections[0];
  const about = base.sections.find((section) => section.type === "split")!;
  const services = base.sections.find(
    (section) => section.type === "services",
  )!;
  const contact = base.sections.find((section) => section.type === "contact")!;
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
