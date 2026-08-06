import { API, wmsFetch } from "@/lib/api";
import type { RequestDecision, StockRequest } from "./stock-request.model";

const LOAD_ERROR = "Бараа татах хүсэлт авахад алдаа гарлаа";

async function parseResponse<T>(
  response: Response,
  fallback: string,
): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || fallback);
  return body as T;
}

export async function fetchWarehouseStockRequests(warehouseId: string) {
  const response = await wmsFetch(
    `${API}/stock-requests?warehouseId=${encodeURIComponent(warehouseId)}`,
  );
  const body = await parseResponse<unknown>(response, LOAD_ERROR);
  if (!Array.isArray(body)) throw new Error(LOAD_ERROR);
  return body as StockRequest[];
}

interface DecideStockRequestInput {
  request: StockRequest;
  action: RequestDecision;
  note: string;
  quantities: Record<string, number>;
}

export async function decideStockRequest(input: DecideStockRequestInput) {
  const { request, action, note, quantities } = input;
  const response = await wmsFetch(
    `${API}/stock-requests/${request.id}/${action === "approve" ? "approve" : "reject"}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        reviewNote: note.trim() || null,
        ...(action === "approve"
          ? {
              items: request.items.map((item) => ({
                productId: item.productId,
                approvedQuantity: quantities[item.id] ?? item.quantity,
              })),
            }
          : {}),
      }),
    },
  );
  await parseResponse<unknown>(response, "Шийдвэр хадгалагдсангүй");
}
