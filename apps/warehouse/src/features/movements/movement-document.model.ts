export type MovementDocument = {
  id: string;
  number: string;
  relatedNumber: string | null;
  direction: "IN" | "OUT";
  documentType: "GOODS_RECEIPT" | "STOCK_DISPATCH" | "MANUAL_DISPATCH";
  partyName: string;
  partyAddress: string | null;
  partyPhone: string | null;
  partyOwnerName: string | null;
  warehouseName: string;
  warehouseAddress: string | null;
  warehousePhone: string | null;
  supplierRegisterNumber: string | null;
  invoiceNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  vehicleNumber: string | null;
  operatorName: string | null;
  status: string;
  occurredAt: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    product: {
      id: string;
      name: string;
      sku: string | null;
      barcode: string | null;
      unit: string | null;
    };
  }>;
};
