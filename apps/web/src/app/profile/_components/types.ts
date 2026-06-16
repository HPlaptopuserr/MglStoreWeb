import type { AuthAddress, AuthUser } from "@/lib/auth-context";

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
  invoiceId?: string | null;
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

export type ProfileOrderPayment = {
  id: string;
  method: string;
  status: string;
  amount: number;
  providerRef?: string | null;
  paidAt?: string | null;
  refundedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
};

export type ProfileOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  total: number;
  subtotal: number;
  deliveryFee?: number;
  discountAmount?: number;
  deliveryCode?: string | null;
  shippingAddress?: string | null;
  organizationName?: string | null;
  createdAt: string;
  items: ProfileOrderItem[];
  payments?: ProfileOrderPayment[];
};

export type ProfileFormState = {
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  addressId: string;
  fullAddress: string;
  city: string;
  district: string;
  khoroo: string;
  entrance: string;
  apartment: string;
  lat: string;
  lng: string;
  addressIsDefault: boolean;
  acceptTerms: boolean;
  marketingConsent: boolean;
};

export type ProfileSavePayload = ProfileFormState;

export function createEmptyAddressPatch(): Pick<
  ProfileFormState,
  | "addressId"
  | "fullAddress"
  | "city"
  | "district"
  | "khoroo"
  | "entrance"
  | "apartment"
  | "lat"
  | "lng"
  | "addressIsDefault"
> {
  return {
    addressId: "",
    fullAddress: "",
    city: "Улаанбаатар",
    district: "",
    khoroo: "",
    entrance: "",
    apartment: "",
    lat: "",
    lng: "",
    addressIsDefault: false,
  };
}

export function createAddressPatch(
  address?: AuthAddress | null,
): ReturnType<typeof createEmptyAddressPatch> {
  if (!address) return createEmptyAddressPatch();

  return {
    addressId: address.id || "",
    fullAddress: address.fullAddress || "",
    city: address.city || "Улаанбаатар",
    district: address.district || "",
    khoroo: address.khoroo || "",
    entrance: address.entrance || "",
    apartment: address.apartment || "",
    lat: address.lat?.toString() || "",
    lng: address.lng?.toString() || "",
    addressIsDefault: Boolean(address.isDefault),
  };
}

export function createProfileFormState(user: AuthUser): ProfileFormState {
  const address = user.defaultAddress || user.addresses?.[0] || null;

  return {
    fullName: user.fullName || "",
    email: user.email || "",
    phone: user.phone || "",
    avatarUrl: user.avatarUrl || "",
    ...createAddressPatch(address),
    acceptTerms: Boolean(user.termsAcceptedAt),
    marketingConsent: Boolean(user.marketingConsent),
  };
}
