import { ProductInventoryConflictError } from "../services/vendor-inventory-warehouse.service";
import { WarehouseProductOwnershipError } from "../services/warehouse-product-ownership";

/** Expose only deliberate ownership conflicts, never arbitrary database errors. */
export function inventoryConflictResponse(error: unknown): {
  status: 409;
  message: string;
} | null {
  if (
    error instanceof ProductInventoryConflictError ||
    error instanceof WarehouseProductOwnershipError
  ) {
    return { status: 409, message: error.message };
  }
  return null;
}
