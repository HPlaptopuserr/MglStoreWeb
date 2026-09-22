import { API, wmsFetch } from "@/lib/api";
import type {
  InventoryFilters,
  InventoryItem,
  InventoryResponse,
} from "./inventory.types";

interface InventoryPageOptions extends InventoryFilters {
  page: number;
  limit: number;
  signal?: AbortSignal;
}

export async function fetchInventoryPage({
  warehouseId,
  search,
  status,
  page,
  limit,
  signal,
}: InventoryPageOptions): Promise<InventoryResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status,
  });
  if (search.trim()) params.set("search", search.trim());
  const response = await wmsFetch(
    `${API}/warehouses/${encodeURIComponent(warehouseId)}/inventory?${params}`,
    {
      cache: "no-store",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
        : undefined,
    },
  );
  if (!response.ok) {
    throw new Error(
      "Нөөцийн мэдээлэл татахад алдаа гарлаа. Дахин оролдоно уу.",
    );
  }
  const data = (await response.json()) as InventoryResponse;
  if (
    !Array.isArray(data.inventory) ||
    !Number.isInteger(data.pagination?.total) ||
    !Number.isInteger(data.pagination?.totalPages) ||
    data.pagination.total < 0 ||
    data.pagination.totalPages < 1
  ) {
    throw new Error("Нөөцийн мэдээлэл бүрэн ирсэнгүй. Дахин оролдоно уу.");
  }
  return data;
}

export async function fetchInventoryForExport(
  filters: InventoryFilters,
  signal: AbortSignal,
): Promise<InventoryItem[]> {
  const items: InventoryItem[] = [];
  const ids = new Set<string>();
  let totalPages = 1;
  let total = 0;
  const changedMessage =
    "Нөөцийн жагсаалт өөрчлөгдсөн тул бүрэн татаж чадсангүй. Дахин оролдоно уу.";

  // The catalog API caps each page at 100; export every matching page.
  for (let page = 1; page <= totalPages; page += 1) {
    signal.throwIfAborted();
    const data = await fetchInventoryPage({
      ...filters,
      page,
      limit: 100,
      signal,
    });
    if (page === 1) {
      totalPages = data.pagination.totalPages;
      total = data.pagination.total;
    }
    if (
      data.pagination.total !== total ||
      data.pagination.totalPages !== totalPages ||
      (data.inventory.length === 0 && total > 0)
    ) {
      throw new Error(changedMessage);
    }
    for (const item of data.inventory) {
      if (ids.has(item.id)) throw new Error(changedMessage);
      ids.add(item.id);
      items.push(item);
    }
  }
  if (items.length !== total) throw new Error(changedMessage);
  return items;
}
