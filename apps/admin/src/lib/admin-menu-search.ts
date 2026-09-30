export interface MenuSearchEntry {
  label: string;
  href: string;
  group: string;
  keywords: string;
}
interface MenuSource {
  label: string;
  href: string;
}
interface SectionSource {
  key: string;
  label: string;
  requires?: string;
  requiresAny?: string[];
}
const aliases: Record<string, string> = {
  "/dashboard": "dashboard home хяналт нүүр",
  "/statistics": "statistics report тайлан үзүүлэлт борлуулалт",
  "/partners": "vendor supplier түнш байгууллага нийлүүлэгч дэлгүүр",
  "/hr": "staff employee ажилтан хүний нөөц",
  "/requests": "request бүртгэл хүсэлт зөвшөөрөл",
  "/warehouses": "warehouse inventory агуулах бараа нөөц",
  "/app-control": "app application апп удирдлага тохиргоо",
  "/master-products": "product catalog бараа каталог сан",
  "/categories": "category ангилал категори",
  "/settings": "settings тохиргоо",
  "/sections": "section контент нэмэлт хэсэг",
};
const shortcuts = [
  {
    parent: "/statistics",
    label: "MGL Store-ууд",
    href: "/statistics/stores?days=all",
    keywords:
      "дэлгүүр дэлгүүрүүд store map газрын зураг байршил ХТ excel бүртгэл",
  },
  {
    parent: "/app-control",
    label: "Үнийн багцууд",
    href: "/app-control/plans",
    keywords: "plan subscription үнэ багц эрх",
  },
  {
    parent: "/warehouses",
    label: "Агуулахын операторууд",
    href: "/warehouses/operators",
    keywords: "operator оператор ажилтан",
  },
  {
    parent: "/partners",
    label: "Картын терминалын хүсэлт",
    href: "/partners/card-terminal-requests",
    keywords: "card terminal карт терминал пос",
  },
  {
    parent: "/requests",
    label: "Бараа татах хүсэлт",
    href: "/requests/stock-requests",
    keywords: "stock request бараа таталт",
    permission: "MANAGE_STOCK",
  },
  {
    parent: "/association",
    label: "Гишүүнчлэлийн төлбөр",
    href: "/association/payments",
    keywords: "membership payment гишүүн төлбөр",
  },
  {
    parent: "/association",
    label: "Гишүүнчлэлийн тохиргоо",
    href: "/association/settings",
    keywords: "membership settings гишүүнчлэл тохиргоо",
  },
];

export function buildAdminMenuIndex(
  visibleMenus: readonly MenuSource[],
  sections: readonly SectionSource[],
  hasPermission: (permission: string) => boolean,
): MenuSearchEntry[] {
  const parents = new Map(visibleMenus.map((item) => [item.href, item.label]));
  const entries = visibleMenus.map((item) => ({
    ...item,
    group: "Үндсэн цэс",
    keywords: aliases[item.href] ?? "",
  }));
  for (const item of shortcuts) {
    const group = parents.get(item.parent);
    if (group && (!item.permission || hasPermission(item.permission))) {
      entries.push({
        label: item.label,
        href: item.href,
        group,
        keywords: item.keywords,
      });
    }
  }
  if (parents.has("/sections")) {
    for (const section of sections) {
      if (section.requires && !hasPermission(section.requires)) continue;
      if (section.requiresAny && !section.requiresAny.some(hasPermission))
        continue;
      entries.push({
        label: section.label,
        href: `/sections/${section.key}`,
        group: parents.get("/sections")!,
        keywords:
          section.key.replaceAll("-", " ") +
          (section.key === "vendor-features" ? " пос касс дэлгүүр боломж" : ""),
      });
    }
  }
  return Array.from(
    new Map(entries.map((entry) => [entry.href, entry])).values(),
  );
}

const normalize = (text: string) =>
  text.normalize("NFKC").toLocaleLowerCase("mn-MN").trim().replace(/\s+/g, " ");
export function searchAdminMenu(
  entries: readonly MenuSearchEntry[],
  query: string,
): MenuSearchEntry[] {
  const text = normalize(query);
  if (!text) return [...entries];
  const terms = text.split(" ");
  return entries
    .filter((entry) => {
      const haystack = normalize(
        `${entry.label} ${entry.group} ${entry.keywords} ${entry.href}`,
      );
      return terms.every((term) => haystack.includes(term));
    })
    .sort((a, b) => {
      const rank = (entry: MenuSearchEntry) =>
        normalize(entry.label) === text
          ? 0
          : normalize(entry.label).startsWith(text)
            ? 1
            : 2;
      return rank(a) - rank(b);
    });
}
