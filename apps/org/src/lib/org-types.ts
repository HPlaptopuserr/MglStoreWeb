export type SelfServiceMode = "RESTAURANT" | "CAFE";

export type OrgFeatureState = {
  supplyProducts: boolean;
  preorderProducts: boolean;
  servicePosts: boolean;
  selfService: boolean;
  selfServiceMode: SelfServiceMode;
};

export type DashboardStats = {
  products?: { total: number; active: number; inactive: number };
  servicePosts?: { total: number; active: number; totalViews: number };
  stockRequests?: {
    total: number;
    pending: number;
    approved: number;
    completed: number;
  };
  serviceRequests?: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  warehouses?: number;
  pendingPayments?: { count: number; totalAmount: number };
};
