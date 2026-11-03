export interface StockCheckAdjustment {
  beforeStock: number;
  afterStock: number;
  beforePrice: number;
  afterPrice: number;
  unit: string;
}
export interface HistoryEntry {
  id: string;
  date: string;
  quantity: number;
  reason: string;
  note: string | null;
  userName: string | null;
  userId?: string | null;
  adjustment?: StockCheckAdjustment | null;
  warehouse: string | null;
  source: string | null;
  document: string | null;
  referenceType: string | null;
  cancelled: boolean;
}
export interface ProductHistory {
  registration: {
    createdAt: string;
    userName: string | null;
    menu: string | null;
  };
  summary: {
    arrivalCount: number;
    averageDays: number | null;
    totalReceived: number;
    unit: string | null;
  };
  entries: HistoryEntry[];
  nextCursor: string | null;
  hasCafeHistory: boolean;
}
