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
  organization: {
    id: string;
    name: string;
  };
}
