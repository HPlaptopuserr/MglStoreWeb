import type { AuthUser } from "@/lib/auth-context";

export type ProfileTab =
  | "library"
  | "orders"
  | "profile"
  | "address"
  | "security";

export type AccountPurchase = {
  id: string;
  sourceType: "PROJECT" | "FRANCHISE" | "SERVICE";
  title: string;
  fileUrl?: string | null;
  fileName?: string | null;
  amount: number;
  purchasedAt: string;
};

export type AccountContract = {
  id: string;
  templateId?: string | null;
  title: string;
  org: string;
  register?: string | null;
  status: string;
  isPaid: boolean;
  feePlan?: string | null;
  feePlanLabel?: string | null;
  signedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  pdfUrl?: string | null;
  printUrl: string;
};

export type MPointHistory = {
  id: string;
  description: string;
  amount: string;
  rawAmount: number;
  balanceAfter?: number | null;
  date: string;
};

export type ProfileOrderItem = {
  name: string;
  qty: number;
  price: number;
  subtotal: number;
};

export type ProfileOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  subtotal: number;
  deliveryCode?: string | null;
  shippingAddress?: string | null;
  organizationName?: string | null;
  createdAt: string;
  items: ProfileOrderItem[];
};

export type ProfileFormState = {
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  addressLabel: string;
  fullAddress: string;
  city: string;
  district: string;
  khoroo: string;
  entrance: string;
  apartment: string;
  acceptTerms: boolean;
  marketingConsent: boolean;
};

export type ProfileSavePayload = ProfileFormState;

export function createProfileFormState(user: AuthUser): ProfileFormState {
  return {
    fullName: user.fullName || "",
    email: user.email || "",
    phone: user.phone || "",
    avatarUrl: user.avatarUrl || "",
    addressLabel: user.defaultAddress?.label || "Гэр",
    fullAddress: user.defaultAddress?.fullAddress || "",
    city: user.defaultAddress?.city || "",
    district: user.defaultAddress?.district || "",
    khoroo: user.defaultAddress?.khoroo || "",
    entrance: user.defaultAddress?.entrance || "",
    apartment: user.defaultAddress?.apartment || "",
    acceptTerms: Boolean(user.termsAcceptedAt),
    marketingConsent: Boolean(user.marketingConsent),
  };
}
