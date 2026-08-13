export interface DispatchDestination {
  address: string;
  recipientName: string;
  recipientPhone: string;
  lat: number | null;
  lng: number | null;
}

export interface DispatchAddressSuggestion {
  address: string;
  recipientName: string | null;
  recipientPhone: string | null;
  lat: number | null;
  lng: number | null;
  lastUsedAt: string;
}

export interface DispatchStore {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  contactName: string | null;
  contactPhone: string | null;
  locationSource: "ADMIN_BRANCH" | "SALES_VISIT";
  organization: {
    id: string;
    name: string;
  };
}
