import {
  parseUnitContent,
  type BuildingUnitContent,
} from "./building-unit-content";
export {
  emptyUnitContent,
  parseUnitContent,
  regionBindingKey,
  type BuildingUnitContent,
} from "./building-unit-content";
import { parseBuildingFacade, type BuildingFacade } from "./building-facade";
export {
  parseBuildingFacade,
  type BuildingFacade,
  type BuildingFacadeRegion,
} from "./building-facade";
import { parseLibrary, type PlanLibrary } from "./building-plans";
export interface BuildingWebsiteContent {
  version: 1;
  heroTitle: string;
  heroSubtitle: string;
  eyebrow: string;
  aboutTitle: string;
  aboutText: string;
  heroImageUrl: string;
  phone: string;
  email: string;
  mapUrl: string;
  completionLabel: string;
  paymentTerms: string;
  gallery: Array<{ url: string; caption: string }>;
  amenities: Array<{ title: string; description: string }>;
  faqs: Array<{ question: string; answer: string }>;
}
export interface ProjectMasterplan {
  image: string;
  pins: Array<{ blockId: string; x: number; y: number }>;
}
export function parseProjectMasterplan(value: unknown): ProjectMasterplan {
  const p = record(value);
  const image = text(p.image, "Ерөнхий зураг", 3_000_000);
  if (!safeImage(image)) throw new Error("Ерөнхий зураг буруу байна.");
  const ids = new Set<string>();
  const pins = rows(p.pins, 200, (pin) => {
    const blockId = text(pin.blockId, "Блок", 100);
    if (!blockId || ids.has(blockId))
      throw new Error("Блокийн тэмдэглэгээ давхардсан байна.");
    ids.add(blockId);
    const { x, y } = pin;
    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      x > 100 ||
      y < 0 ||
      y > 100
    )
      throw new Error("Тэмдэглэгээний байрлал буруу байна.");
    return { blockId, x, y };
  });
  return { image, pins };
}
export interface InventoryTemplate {
  id: string;
  name: string;
  floorNumbers: number[];
  units: Array<{
    id: string;
    unitNo: string;
    typeLabel: string;
    rooms: string;
    areaM2: string;
  }>;
}
export function parseInventoryTemplates(value: unknown): InventoryTemplate[] {
  const assigned = new Set<number>();
  return rows(value, 20, (item) => {
    if (!Array.isArray(item.floorNumbers) || item.floorNumbers.length > 100)
      throw new Error("Давхрын оноолт буруу байна.");
    const floorNumbers = item.floorNumbers.map((n: unknown) => {
      if (
        typeof n !== "number" ||
        !Number.isInteger(n) ||
        n < -10 ||
        n > 200 ||
        assigned.has(n)
      )
        throw new Error("Давхрын оноолт давхардсан эсвэл буруу байна.");
      assigned.add(n);
      return n;
    });
    const units = rows(item.units, 50, (unit) => {
      const rooms = text(unit.rooms, "Өрөө", 3),
        areaM2 = text(unit.areaM2, "Талбай", 20);
      if (
        !Number.isInteger(Number(rooms)) ||
        Number(rooms) < 1 ||
        Number(rooms) > 20 ||
        !Number.isFinite(Number(areaM2)) ||
        Number(areaM2) <= 0 ||
        Number(areaM2) > 10000
      )
        throw new Error("Өрөө, талбай буруу байна.");
      return {
        id: text(unit.id, "ID", 100),
        unitNo: text(unit.unitNo, "Тоот", 30),
        typeLabel: text(unit.typeLabel, "Төрөл", 100),
        rooms,
        areaM2,
      };
    });
    return {
      id: text(item.id, "ID", 100),
      name: text(item.name, "Загвар", 100),
      floorNumbers,
      units,
    };
  });
}
export interface BuildingWebsiteRecord {
  unitBindings?: Record<string, string>;
  unitContent?: Record<string, BuildingUnitContent>;
  pricePerM2?: number;
  inventoryTemplatesByBlock?: Record<string, InventoryTemplate[]>;
  masterplan?: ProjectMasterplan;
  content: BuildingWebsiteContent;
  plansByBlock: Record<string, PlanLibrary>;
  facadesByBlock?: Record<string, BuildingFacade>;
}
export const emptyWebsiteContent = (): BuildingWebsiteContent => ({
  version: 1,
  heroTitle: "",
  heroSubtitle: "",
  eyebrow: "",
  aboutTitle: "",
  aboutText: "",
  heroImageUrl: "",
  phone: "",
  email: "",
  mapUrl: "",
  completionLabel: "",
  paymentTerms: "",
  gallery: [],
  amenities: [],
  faqs: [],
});
export function safeImage(value: string): boolean {
  if (!value) return true;
  if (value.startsWith("data:"))
    return (
      value.length <= 3_000_000 &&
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
    );
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      value.length <= 2000
    );
  } catch {
    return false;
  }
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Мэдээллийн бүтэц буруу байна.");
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || value.length > max)
    throw new Error(`${label}: ${max} хүртэл тэмдэгт оруулна уу.`);
  return value.trim();
}
function rows<T>(
  value: unknown,
  max: number,
  parse: (item: Record<string, unknown>) => T,
): T[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error(`Жагсаалт ${max} хүртэл мөртэй байна.`);
  return value.map((item) => parse(record(item)));
}
export function parseWebsiteContent(value: unknown): BuildingWebsiteContent {
  const p = record(value);
  if (p.version !== 1) throw new Error("Мэдээллийн хувилбар буруу байна.");
  const heroImageUrl = text(p.heroImageUrl, "Нүүр зураг", 3_000_000);
  if (!safeImage(heroImageUrl))
    throw new Error("Зургийн холбоос эсвэл файл буруу байна.");
  const email = text(p.email, "И-мэйл", 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("И-мэйл буруу байна.");
  const phone = text(p.phone, "Утас", 50);
  if (phone && !/^[+\d\s()-]+$/.test(phone))
    throw new Error("Утасны дугаар буруу байна.");
  const mapUrl = text(p.mapUrl, "Газрын зургийн холбоос", 2000);
  if (mapUrl) {
    try {
      const u = new URL(mapUrl);
      if (u.protocol !== "https:" || u.username || u.password)
        throw new Error();
    } catch {
      throw new Error("Газрын зургийн HTTPS холбоос оруулна уу.");
    }
  }
  return {
    version: 1,
    heroTitle: text(p.heroTitle, "Нүүр гарчиг", 200),
    heroSubtitle: text(p.heroSubtitle, "Дэд гарчиг", 600),
    eyebrow: text(p.eyebrow, "Товч нэр", 100),
    aboutTitle: text(p.aboutTitle, "Танилцуулгын гарчиг", 200),
    aboutText: text(p.aboutText, "Танилцуулга", 10000),
    heroImageUrl,
    phone,
    email,
    mapUrl,
    completionLabel: text(p.completionLabel, "Ашиглалтад орох хугацаа", 100),
    paymentTerms: text(p.paymentTerms, "Төлбөрийн нөхцөл", 5000),
    gallery: rows(p.gallery, 12, (item) => {
      const url = text(item.url, "Зургийн холбоос", 3_000_000);
      if (!url || !safeImage(url))
        throw new Error("Галерейн зураг буруу байна.");
      return { url, caption: text(item.caption, "Зургийн тайлбар", 200) };
    }),
    amenities: rows(p.amenities, 20, (item) => ({
      title: text(item.title, "Давуу талын нэр", 120),
      description: text(item.description, "Давуу талын тайлбар", 1000),
    })),
    faqs: rows(p.faqs, 20, (item) => ({
      question: text(item.question, "Асуулт", 300),
      answer: text(item.answer, "Хариулт", 3000),
    })),
  };
}
export function readWebsiteRecord(documents: unknown): BuildingWebsiteRecord {
  const empty = { content: emptyWebsiteContent(), plansByBlock: {} };
  if (!documents || typeof documents !== "object" || !("website" in documents))
    return empty;
  const value = record(documents.website);
  const plansByBlock: Record<string, PlanLibrary> = {};
  if (value.plansByBlock && typeof value.plansByBlock === "object")
    for (const [id, library] of Object.entries(value.plansByBlock)) {
      if (/^[a-zA-Z0-9-]{1,100}$/.test(id))
        plansByBlock[id] = parseLibrary(library);
    }
  const facadesByBlock: Record<string, BuildingFacade> = {};
  if (value.facadesByBlock && typeof value.facadesByBlock === "object")
    for (const [id, facade] of Object.entries(value.facadesByBlock)) {
      if (/^[a-zA-Z0-9-]{1,100}$/.test(id))
        facadesByBlock[id] = parseBuildingFacade(facade);
    }
  const unitBindings: Record<string, string> = {};
  for (const [key, id] of Object.entries(record(value.unitBindings ?? {}))) {
    if (
      /^[a-zA-Z0-9-]+:[a-zA-Z0-9-]+:[a-zA-Z0-9-]+$/.test(key) &&
      typeof id === "string" &&
      /^[a-zA-Z0-9-]+$/.test(id)
    )
      unitBindings[key] = id;
  }
  const unitContent = Object.fromEntries(
    Object.entries(record(value.unitContent ?? {})).map(([id, content]) => [
      id,
      parseUnitContent(content),
    ]),
  );
  return {
    unitBindings,
    unitContent,
    inventoryTemplatesByBlock: value.inventoryTemplatesByBlock
      ? Object.fromEntries(
          Object.entries(record(value.inventoryTemplatesByBlock)).map(
            ([id, templates]) => [id, parseInventoryTemplates(templates)],
          ),
        )
      : {},
    ...(typeof value.pricePerM2 === "number" &&
    Number.isFinite(value.pricePerM2) &&
    value.pricePerM2 >= 0
      ? { pricePerM2: value.pricePerM2 }
      : {}),
    content: parseWebsiteContent(value.content),
    plansByBlock,
    facadesByBlock,
    ...(value.masterplan
      ? { masterplan: parseProjectMasterplan(value.masterplan) }
      : {}),
  };
}
export interface WebsiteInventoryUnit {
  planSlot?: number;
  id: string;
  unitNo: string;
  typeLabel: string | null;
  rooms: number | null;
  areaM2: string | null;
  priceTotal: string | null;
  pricePerM2: string | null;
  planImageUrl: string | null;
  status: string;
  published: boolean;
}
export interface WebsiteProject {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  district: string | null;
  address: string | null;
  coverImageUrl: string | null;
  status: string;
  verification: string;
  constructionStatus: string;
  updatedAt: string;
  website: BuildingWebsiteRecord;
  blocks: Array<{
    id: string;
    name: string;
    minPaymentPercent: string;
    maxPaymentPercent: string;
    floors: Array<{
      id: string;
      number: number;
      units: WebsiteInventoryUnit[];
    }>;
  }>;
}
