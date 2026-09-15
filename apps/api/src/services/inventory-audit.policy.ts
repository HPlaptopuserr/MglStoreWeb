export type InventoryAuditIssue =
  | "NEGATIVE_STOCK"
  | "OVER_RESERVED"
  | "MISSING_SKU"
  | "MISSING_BARCODE"
  | "MISSING_LOCATION"
  | "INACTIVE_PRODUCT"
  | "EXPIRED"
  | "EXPIRING_SOON";

export function inventoryAuditIssues(input: {
  physicalStock: number;
  reservedStock: number;
  sku: string | null;
  barcode: string | null;
  location: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  expiryDate: Date | null;
  now: Date;
}): InventoryAuditIssue[] {
  const issues: InventoryAuditIssue[] = [];
  if (input.physicalStock < 0) issues.push("NEGATIVE_STOCK");
  if (input.reservedStock > input.physicalStock) issues.push("OVER_RESERVED");
  if (!input.sku?.trim()) issues.push("MISSING_SKU");
  if (!input.barcode?.trim()) issues.push("MISSING_BARCODE");
  if (!input.location?.trim()) issues.push("MISSING_LOCATION");
  if (!input.isActive || input.deletedAt) issues.push("INACTIVE_PRODUCT");
  if (input.expiryDate) {
    const expiryTime = input.expiryDate.getTime();
    const now = input.now.getTime();
    const expiringThreshold = now + 30 * 24 * 60 * 60 * 1000;
    if (expiryTime < now) issues.push("EXPIRED");
    else if (expiryTime <= expiringThreshold) issues.push("EXPIRING_SOON");
  }
  return issues;
}

export function isCriticalInventoryAuditIssue(issue: InventoryAuditIssue) {
  return ["NEGATIVE_STOCK", "OVER_RESERVED", "EXPIRED"].includes(issue);
}
