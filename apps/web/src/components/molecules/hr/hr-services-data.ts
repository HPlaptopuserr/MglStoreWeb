import {
  BriefcaseBusiness,
  FileText,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { MGL_SERVICES_DATA } from "@/app/our-services/data";
import type {
  ServiceCategory,
  ServiceImage,
  ServiceItem,
  ServicePerson,
  ServicePartner,
} from "@/app/our-services/types";
import type { HrMenuService } from "./HrServiceMenuCard";
import { getKnownHrFormLink } from "./hr-service-form-links";

const normalizePartners = (partners: ServicePartner[] | undefined) =>
  Array.isArray(partners)
    ? partners
        .filter((partner) => partner && typeof partner.name === "string")
        .map((partner, index) => ({
          id: partner.id || `${partner.name}-${index}`,
          name: partner.name,
          description: partner.description || "",
          logoUrl: partner.logoUrl || "",
          slug: partner.slug || "",
          website: partner.website || "",
        }))
    : [];

const normalizeImages = (images: ServiceImage[] | undefined) =>
  Array.isArray(images)
    ? images
        .filter(
          (image) => image && typeof image.url === "string" && image.url.trim(),
        )
        .map((image, index) => ({
          id: image.id || `${image.url}-${index}`,
          url: image.url,
          caption: image.caption || "",
        }))
    : [];

const normalizePeople = (people: ServicePerson[] | undefined) =>
  Array.isArray(people)
    ? people
        .filter((person) => person && typeof person.name === "string")
        .map((person, index) => ({
          id: person.id || `${person.name}-${index}`,
          userId: person.userId || "",
          name: person.name,
          role: person.role || "",
          bio: person.bio || "",
          detail: person.detail || "",
          email: person.email || "",
          phone: person.phone || "",
          avatarUrl: person.avatarUrl || "",
          imageUrl: person.imageUrl || "",
        }))
    : [];

export type HrServiceGroup = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  introTitle?: string;
  introDescription?: string;
  bodyTitle?: string;
  bodyText?: string;
  images: ServiceImage[];
  people: ServicePerson[];
  partners: ServicePartner[];
  services: HrMenuService[];
};

const hrIconByText: { test: RegExp; icon: LucideIcon }[] = [
  { test: /гэрээ|журам|бичиг|маягт|тушаал/i, icon: FileText },
  { test: /сонгон|бүрдүүл|ажилтан|ярилцлага/i, icon: Users },
  { test: /аудит|эрсдэл|зөвл/i, icon: ShieldCheck },
];

export const fallbackHrCategory =
  MGL_SERVICES_DATA.find((category) => category.id === "hr") ??
  MGL_SERVICES_DATA[MGL_SERVICES_DATA.length - 1];

export function getPriceLabel(item: ServiceItem) {
  if (item.priceLabel?.trim()) return item.priceLabel.trim();
  if (Number.isFinite(item.price) && item.price > 0) {
    return `₮${item.price.toLocaleString()}`;
  }
  return "Үнийн санал";
}

export function normalizeHrServices(payload: unknown): ServiceCategory[] {
  if (!Array.isArray(payload)) return [];

  return payload.filter((category): category is ServiceCategory => {
    if (typeof category !== "object" || category === null) return false;
    const item = category as Partial<ServiceCategory>;
    return (
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.description === "string" &&
      Array.isArray(item.subCategories)
    );
  });
}

export function parseHrServicesSetting(
  rawServices: unknown,
): ServiceCategory[] {
  if (typeof rawServices !== "string") return [];
  try {
    return normalizeHrServices(JSON.parse(rawServices));
  } catch {
    return [];
  }
}

type ToHrGroupsOptions = {
  includeEmpty?: boolean;
};

export function toHrGroups(
  categories: ServiceCategory[],
  options: ToHrGroupsOptions = {},
): HrServiceGroup[] {
  return categories
    .map((category, index) => {
      const textForIcon = `${category.id} ${category.title} ${category.description}`;
      const Icon =
        hrIconByText.find(({ test }) => test.test(textForIcon))?.icon ??
        (index % 2 === 0 ? Users : BriefcaseBusiness);
      const services = category.subCategories
        .flatMap((subCategory) => subCategory.items)
        .map((item) => {
          const knownForm = getKnownHrFormLink(item);
          const formSlug = item.formSlug || knownForm?.slug || "";
          const formTitle = item.formTitle || knownForm?.title || "";

          return {
            id: item.id,
            title: item.name,
            description:
              item.description ||
              item.features?.slice(0, 2).join(", ") ||
              category.description,
            priceLabel: getPriceLabel(item),
            imageUrl: item.imageUrl || "",
            href: item.fileUrl || `/hr/${category.id}`,
            fileUrl: item.fileUrl,
            fileName: item.fileName,
            hasForm: Boolean((item.hasForm && item.formSlug) || knownForm),
            formSlug,
            formTitle,
            details: Array.isArray(item.features) ? item.features : [],
            partners: [],
          };
        });

      return {
        id: category.id,
        label: category.title,
        description: category.description,
        icon: Icon,
        introTitle: category.introTitle || "",
        introDescription: category.introDescription || "",
        bodyTitle: category.bodyTitle || "",
        bodyText: category.bodyText || "",
        images: normalizeImages(category.images),
        people: normalizePeople(category.people),
        partners: normalizePartners(category.partners),
        services,
      };
    })
    .filter((group) => options.includeEmpty || group.services.length > 0);
}
