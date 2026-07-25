import { API, wmsFetch } from "@/lib/api";
import type {
  CreateWarehouseCategoryInput,
  WarehouseCategory,
} from "./category.types";
import { normalizeWarehouseCategories } from "./category.utils";

function readApiMessage(payload: unknown, fallback: string): string {
  return typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string"
    ? payload.message
    : fallback;
}

export async function fetchWarehouseCategories(): Promise<WarehouseCategory[]> {
  const response = await wmsFetch(`${API}/business-categories`);
  const payload: unknown = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(
      readApiMessage(payload, "Ангиллын мэдээлэл ачаалагдсангүй"),
    );
  }
  return normalizeWarehouseCategories(payload);
}

export async function createWarehouseCategory(
  input: CreateWarehouseCategoryInput,
): Promise<WarehouseCategory> {
  const response = await wmsFetch(`${API}/warehouses/categories`, {
    method: "POST",
    body: JSON.stringify({
      name: input.name.trim(),
      parentId: input.level === 0 ? null : input.parentId,
    }),
  });
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readApiMessage(payload, "Ангилал үүсгэхэд алдаа гарлаа"));
  }

  const created = normalizeWarehouseCategories([payload])[0];
  if (!created) throw new Error("Үүсгэсэн ангиллын мэдээлэл буруу байна");
  return created;
}
