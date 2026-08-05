export function canAdminAdvanceStockRequest(
  dispatch: { id: string } | null | undefined,
) {
  return !dispatch;
}

export const warehouseDispatchRequiredMessage =
  "Энэ захиалга агуулах руу шилжсэн. Цаашдын явцыг Warehouse системээс удирдана";

export function effectiveWarehouseDispatchStatus(
  dispatchStatus: string,
  requestStatus: string,
) {
  return requestStatus === "COMPLETED" ? "DELIVERED" : dispatchStatus;
}
