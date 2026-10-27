export interface TrackingData {
  points: {
    id: string;
    userId: string;
    lat: number;
    lng: number;
    accuracy: number;
    capturedAt: string;
  }[];
  preferences: { userId: string; updatedAt: string }[];
  retentionDays: number;
}
export interface MailData {
  configured: boolean;
  campaigns: {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    deliveries: {
      state: string;
      email: string;
      sentAt: string | null;
      lastError: string | null;
    }[];
  }[];
}
