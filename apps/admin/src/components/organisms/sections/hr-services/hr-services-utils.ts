import type { ServiceCategory, ServiceItem } from "@/lib/sections/types";

export const createHrId = () => Math.random().toString(36).slice(2, 10);

export const createHrHeading = (): ServiceCategory => ({
  id: createHrId(),
  title: "Шинэ гол гарчиг",
  description: "",
  icon: "Users",
  introTitle: "",
  introDescription: "",
  bodyTitle: "",
  bodyText: "",
  images: [],
  people: [],
  partners: [],
  subCategories: [
    {
      id: createHrId(),
      title: "Файлууд",
      description: "",
      items: [],
    },
  ],
});

export const createHrMaterial = (): ServiceItem => ({
  id: createHrId(),
  name: "Шинэ файл / материал",
  description: "",
  price: 0,
  priceLabel: "",
  imageUrl: "",
  fileUrl: "",
  fileName: "",
  hasForm: false,
  formSlug: "",
  formTitle: "",
  features: [],
});

export const getHrMaterials = (heading: ServiceCategory) =>
  heading.subCategories.flatMap((subCategory) => subCategory.items);

export const withHrMaterials = (
  heading: ServiceCategory,
  updater: (items: ServiceItem[]) => ServiceItem[],
): ServiceCategory => {
  const firstSubCategory = heading.subCategories[0] ?? {
    id: createHrId(),
    title: "Файлууд",
    description: "",
    items: [],
  };

  return {
    ...heading,
    subCategories: [
      {
        ...firstSubCategory,
        title: firstSubCategory.title || "Файлууд",
        items: updater(getHrMaterials(heading)),
      },
    ],
  };
};
