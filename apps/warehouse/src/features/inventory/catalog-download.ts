import { API, wmsFetch } from "@/lib/api";
import type { InventoryFilters } from "./inventory.types";

export async function requestCatalogDownload(
  filters: InventoryFilters,
  inStockOnly: boolean,
  signal: AbortSignal,
): Promise<string> {
  const response = await wmsFetch(
    `${API}/warehouses/${encodeURIComponent(filters.warehouseId)}/inventory/catalog-download`,
    {
      method: "POST",
      body: JSON.stringify({
        search: filters.search,
        status: filters.status,
        inStockOnly,
      }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
    },
  );
  const data: unknown = await response.json();
  if (!response.ok)
    throw new Error(
      data &&
        typeof data === "object" &&
        "message" in data &&
        typeof data.message === "string"
        ? data.message
        : "Каталогийн таталтыг эхлүүлж чадсангүй. Дахин оролдоно уу.",
    );
  if (
    !data ||
    typeof data !== "object" ||
    !("ticket" in data) ||
    typeof data.ticket !== "string"
  )
    throw new Error("Таталтын мэдээлэл бүрэн ирсэнгүй. Дахин оролдоно уу.");
  return data.ticket;
}

export function startNativeCatalogDownload(
  warehouseId: string,
  ticket: string,
): void {
  const frame = document.createElement("iframe");
  frame.name = `catalog-${crypto.randomUUID()}`;
  frame.hidden = true;
  frame.title = "Каталогийн файл татах";
  const form = document.createElement("form");
  form.method = "POST";
  form.action = `${API}/warehouses/${encodeURIComponent(warehouseId)}/inventory/catalog.pdf`;
  form.target = frame.name;
  form.hidden = true;
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "ticket";
  input.value = ticket;
  form.appendChild(input);
  document.body.append(frame, form);
  try {
    form.submit();
  } finally {
    form.remove();
  }
  // Keep the native response target alive while Chrome starts the attachment.
  window.setTimeout(() => frame.remove(), 30 * 60_000);
}
