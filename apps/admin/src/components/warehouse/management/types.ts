export interface WarehouseOrganization {
  id: string;
  name: string;
  slug: string;
}
export interface ManagedWarehouse {
  id: string;
  name: string;
  type?: "CENTRAL" | "VENDOR_INTERNAL";
  address: string;
  city: string;
  district: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  organizations: WarehouseOrganization[];
  createdBy: { id: string; name: string };
}
export interface WarehouseFormValues {
  name: string;
  address: string;
  city: string;
  district: string;
  phone: string;
}
export const emptyWarehouseForm: WarehouseFormValues = {
  name: "",
  address: "",
  city: "",
  district: "",
  phone: "",
};

export interface PartnerApiItem {
  id: string;
  name: string;
  slug: string;
}
export interface PartnerApiEnvelope {
  data?: PartnerApiItem[];
  partners?: PartnerApiItem[];
}
