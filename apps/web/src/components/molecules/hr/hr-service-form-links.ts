import type { ServiceItem } from "@/app/our-services/types";

const KNOWN_HR_FORM_LINKS = [
  {
    fileName: "neg_huudastai_orchnii_sudalgaanii_mayagt.pdf",
    slug: "neg-huudastai-orchnii-sudalgaa",
    title: "Нэг хуудастай орчны судалгааны маягт",
  },
];

export function getKnownHrFormLink(item: ServiceItem) {
  const fileText = `${item.fileName || ""} ${item.fileUrl || ""}`.toLowerCase();
  const matched = KNOWN_HR_FORM_LINKS.find((link) =>
    fileText.includes(link.fileName),
  );

  if (!matched) return null;

  return {
    slug: item.formSlug || matched.slug,
    title: item.formTitle || matched.title,
  };
}
