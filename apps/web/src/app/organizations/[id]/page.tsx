import { notFound } from "next/navigation";
import { API } from "@/lib/api";
import BusinessProfileClient from "./BusinessProfileClient";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    oid?: string;
  }>;
}

interface BackendProduct {
  id: string;
  title?: string;
  name?: string;
  image?: string;
  images?: string[];
  price?: number;
  originalPrice?: number;
  category?: string;
  tag?: string;
  rating?: number;
  reviews?: number;
  stock?: number;
}

interface BackendPartner {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  bannerUrl?: string;
  address?: string;
  description?: string;
  shortDescription?: string;
  status?: string;
  businessCategory?: string;
  type?: string;
  phone?: string;
  openingHours?: string[] | string;
  deliveryText?: string;
  deliveryPrice?: string;
  rating?: number;
  reviewCount?: number;
  customers?: string;
  years?: number;
  products?: BackendProduct[];
  isInvestor?: boolean;
  investorTier?: string | null;
  investorLevel?: string | null;
  investmentAmount?: number | null;
}

export interface ServicePost {
  id: string;
  title: string;
  description?: string;
  priceText?: string;
  tags: string[];
  isActive: boolean;
  viewCount: number;
  images: { id: string; url: string }[];
  createdAt: string;
}

export interface OrganizationDetailData {
  id: string;
  name: string;
  slug: string;
  logo: string;
  coverImage: string;
  isOpen: boolean;
  isVerified: boolean;
  categories: string[];
  rating: number;
  reviewCount: number;
  shortDescription: string;
  description: string;
  stats: {
    customers: string;
    years: number;
  };
  info: {
    hours: string[];
    delivery?: {
      text: string;
      price?: string;
    };
    location: string;
    phone?: string;
  };
  products: {
    id: string;
    image: string;
    title: string;
    price: number;
    originalPrice?: number;
    category?: string;
    tag?: string;
    rating?: number;
    reviews?: number;
    stock?: number;
  }[];
  investor?: {
    isInvestor: boolean;
    tier: string;
    level?: string | null;
    investmentAmount?: number | null;
  };
  servicePosts: ServicePost[];
}

function normalizeHours(value?: string[] | string): string[] {
  if (!value) return ["Цагийн хуваарь бүртгэлгүй"];
  if (Array.isArray(value)) {
    return value.length ? value : ["Цагийн хуваарь бүртгэлгүй"];
  }
  return [value];
}

function mapPartnerToDetailData(
  partner: BackendPartner
): OrganizationDetailData {
  const category = partner.businessCategory || partner.type || "Бизнес";

  return {
    id: partner.id,
    name: partner.name,
    slug: partner.slug,
    logo:
      partner.logoUrl ||
      `https://picsum.photos/seed/logo-${partner.slug || partner.id}/400/400`,
    coverImage:
      partner.bannerUrl ||
      `https://picsum.photos/seed/banner-${partner.slug || partner.id}/1600/900`,
    isOpen: partner.status === "ACTIVE",
    isVerified: true,
    categories: [category],
    investor: partner.isInvestor
      ? {
          isInvestor: true,
          tier: partner.investorTier || "INVESTOR",
          level: partner.investorLevel,
          investmentAmount: partner.investmentAmount ?? null,
        }
      : undefined,
    rating: partner.rating ?? 5,
    reviewCount: partner.reviewCount ?? 0,
    shortDescription:
      partner.shortDescription ||
      "Чанартай үйлчилгээ, найдвартай албан ёсны байгууллага.",
    description:
      partner.description ||
      "Байгууллагын дэлгэрэнгүй танилцуулга удахгүй нэмэгдэх болно.",
    stats: {
      customers: partner.customers || "100+",
      years: partner.years ?? 1,
    },
    info: {
      hours: normalizeHours(partner.openingHours),
      delivery:
        partner.deliveryText || partner.deliveryPrice
          ? {
              text: partner.deliveryText || "Хүргэлтийн мэдээлэл тодорхойгүй",
              price: partner.deliveryPrice,
            }
          : undefined,
      location: partner.address || "Хаяг бүртгэлгүй",
      phone: partner.phone,
    },
    products: Array.isArray(partner.products)
      ? partner.products.map((product) => ({
          id: product.id,
          image:
            product.image ||
            product.images?.[0] ||
            `https://picsum.photos/seed/product-${product.id}/600/600`,
          title: product.title || product.name || "Нэргүй бүтээгдэхүүн",
          price: product.price ?? 0,
          originalPrice: product.originalPrice,
          category: product.category,
          tag: product.tag,
          rating: product.rating ?? 5,
          reviews: product.reviews ?? 0,
          stock: product.stock,
        }))
      : [],
    servicePosts: [],
  };
}

async function fetchOrganization(
  slugOrId: string,
  fallbackId?: string
): Promise<OrganizationDetailData | null> {
  try {
    // Use dedicated endpoint for single partner
    let res = await fetch(`${API}/partners/${encodeURIComponent(slugOrId)}`, {
      cache: "no-store",
    });

    if (!res.ok && res.status === 404 && fallbackId && fallbackId !== slugOrId) {
      res = await fetch(`${API}/partners/${encodeURIComponent(fallbackId)}`, {
        cache: "no-store",
      });
    }

    if (!res.ok) {
      if (res.status === 404) return null;
      console.error("Failed to fetch partner:", res.status);
      return null;
    }

    const partner: BackendPartner = await res.json();
    return mapPartnerToDetailData(partner);
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    return null;
  }
}

async function fetchServicePosts(organizationId: string): Promise<ServicePost[]> {
  try {
    const res = await fetch(
      `${API}/service-posts?organizationId=${encodeURIComponent(organizationId)}&activeOnly=true`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function OrganizationDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : undefined;
  const fallbackId = query?.oid?.trim();
  const organization = await fetchOrganization(id, fallbackId || undefined);

  if (!organization) {
    notFound();
  }

  const servicePosts = await fetchServicePosts(organization.id);
  organization.servicePosts = servicePosts;

  return <BusinessProfileClient data={organization} />;
}