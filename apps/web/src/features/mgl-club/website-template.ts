import {
  defaultClubWebsite,
  type MglClubMember,
  type ClubWebsite,
} from "@mgl/types";
import { innovaCompany, innovaWebsite } from "./local-companies";
export function demoClubWebsite(member: MglClubMember): ClubWebsite {
  if (member.id === innovaCompany.id) return innovaWebsite;
  const site = defaultClubWebsite(member);
  site.sections[0] = {
    ...site.sections[0],
    title: "Чанартай бүтээгдэхүүн.\nИтгэлтэй хамтын ажиллагаа.",
    eyebrow: `${member.businessName} · БИЗНЕСИЙН ШИНЭ БОЛОМЖ`,
    text: "Бид өдөр бүр үнэ цэн бүтээж, харилцагч бүрийн амжилтын нэг хэсэг болохыг зорьдог.",
    imageUrl: "/mgl-club/website-demo/produce.png",
    imageAlt: "Байгууллагын танилцуулгын жишээ зураг",
  };
  site.sections[1] = {
    ...site.sections[1],
    title: "Хамтын хүчээр\nилүү ихийг бүтээнэ.",
    text: "Бид харилцагчдынхаа хэрэгцээнд нийцсэн бүтээгдэхүүн, үйлчилгээг хүргэж, урт хугацааны хамтын ажиллагааг эрхэмлэдэг.\n\nТанай байгууллагын түүх, зорилго, үнэт зүйлсийг энэ хэсэгт өөрийн зурагтай хамт танилцуулна.",
    imageUrl: "/mgl-club/website-demo/produce.png",
    imageAlt: "Бидний тухай хэсгийн жишээ зураг",
  };
  return site;
}
export const demoSiteKey = (id: string, kind: "draft" | "published") =>
  `mgl-club-website-${kind}${id === "demo-company-innova" ? "-assets-v2" : ""}:${id}`;

/** Collapse older local previews to the five-section layout, retaining custom titles and media. */
export function withLocalWebsiteMedia(
  member: MglClubMember,
  site: ClubWebsite,
): ClubWebsite {
  if (member.id !== innovaCompany.id) return site;
  const legacy = site.sections.some((section) =>
    [
      "factory",
      "advantages",
      "materials",
      "applications",
      "experience",
    ].includes(section.id),
  );
  if (!legacy) return site;
  return {
    ...site,
    sections: innovaWebsite.sections.map((defaults) => {
      const saved = site.sections.find((section) => section.id === defaults.id);
      if (!saved) return defaults;
      const imageUrl =
        !saved.imageUrl ||
        saved.imageUrl === "/mgl-club/website-demo/innova-logo.png"
          ? defaults.imageUrl
          : saved.imageUrl;
      return {
        ...defaults,
        ...saved,
        imageUrl,
        imageAlt:
          imageUrl === defaults.imageUrl ? defaults.imageAlt : saved.imageAlt,
        items: defaults.items,
        text:
          defaults.id === "about" || defaults.id === "home"
            ? saved.text
            : defaults.text,
        tone: defaults.tone,
        layout: defaults.id === "about" ? defaults.layout : saved.layout,
        title:
          saved.id === "about" &&
          saved.title === "20 жилийн туршлага.\nХарилцагчийн итгэл."
            ? defaults.title
            : saved.title,
      };
    }),
  };
}
