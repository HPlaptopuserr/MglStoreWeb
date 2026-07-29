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
