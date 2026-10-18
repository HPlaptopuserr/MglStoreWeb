export interface BuildingOrganization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}
export interface BuildingProjectSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  district: string | null;
  address: string | null;
  coverImageUrl: string | null;
  constructionStatus: string;
  organization: BuildingOrganization;
}
export interface BuildingAdminProject extends BuildingProjectSummary {
  organizationId: string;
  status: string;
  verification: string;
  _count: { blocks: number };
  blocks: Array<{ id: string; name: string; _count: { floors: number } }>;
}
export interface BuildingProjectDetail extends BuildingProjectSummary {
  blocks: Array<{
    id: string;
    name: string;
    minPaymentPercent: string;
    maxPaymentPercent: string;
    floors: Array<{
      id: string;
      number: number;
      units: Array<{
        id: string;
        unitNo: string;
        rooms: number | null;
        areaM2: string | null;
        priceTotal: string | null;
        status: string;
      }>;
    }>;
  }>;
}
export interface BuildingInventorySummary {
  projects: number;
  blocks: number;
  total: number;
  sold: number;
  unsold: number;
  available: number;
  reserved: number;
  contractPending: number;
  hold: number;
  cancelled: number;
}
export interface BuildingInventoryUnit {
  id: string;
  unitNo: string;
  typeLabel: string | null;
  rooms: number | null;
  areaM2: string | null;
  priceTotal: string | null;
  pricePerM2: string | null;
  planImageUrl: string | null;
  status: string;
  published: boolean;
  floor: {
    number: number;
    block: {
      name: string;
      minPaymentPercent: string;
      maxPaymentPercent: string;
      paymentTiers: Array<{
        id: string;
        label: string | null;
        minPercent: string;
        maxPercent: string;
        pricePerM2: string;
      }>;
      project: {
        title: string;
        address: string | null;
        district: string | null;
        completesAt: string | null;
        status: string;
        verification: string;
      };
    };
  };
}
export interface BuildingInventoryResponse {
  summary: BuildingInventorySummary;
  units: BuildingInventoryUnit[];
  total: number;
  page: number;
  pageSize: number;
}
