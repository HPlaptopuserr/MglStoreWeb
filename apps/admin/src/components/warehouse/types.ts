export interface WarehouseOrganization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface ResponsibleEmployee {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  operatorId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  assignedAt: string;
  setupCompletedAt: string | null;
  setupExpiresAt: string;
}

export interface WarehouseCategorySummary {
  categoryName: string;
  productCount: number;
  totalQuantity: number;
}

export interface WarehouseSummary {
  totalProducts: number;
  totalQuantity: number;
  normalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  categoryCount: number;
  capacityUsed: number;
}

export interface WarehouseDetail {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  phone: string | null;
  capacity: number;
  isActive: boolean;
  createdAt: string;
  organizations: WarehouseOrganization[];
  createdBy: {
    id: string;
    email: string;
    profile: { fullName: string } | null;
  } | null;
  responsibleEmployees: ResponsibleEmployee[];
  summary: WarehouseSummary;
  categories: WarehouseCategorySummary[];
}
