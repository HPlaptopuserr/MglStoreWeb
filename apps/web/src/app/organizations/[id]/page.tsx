import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { API } from "@/lib/api";
import {
  LOCAL_MOCK_CATALOG_ENABLED,
  localCatalogOrganizations,
  queryLocalCatalog,
} from "@/lib/local-product-catalog";
import BusinessProfileClient from "./BusinessProfileClient";
import { normalizeOrganizationMetrics } from "@/lib/organization-presentation";

const SITE_URL = "https://mglstore.mn";
const FALLBACK_SOCIAL_LOGO = "/social/mglstore-og.jpg";

export interface PageProps {
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
  soldCount?: number;
  stock?: number;
  supplyType?: "IN_STOCK" | "CHINA_PREORDER";
  preorderLeadTimeDays?: number | null;
  createdAt?: string;
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
  isVerified?: boolean;
  businessCategory?: string;
  type?: string;
  phone?: string;
  openingHours?: string[] | string;
  deliveryText?: string;
  deliveryPrice?: string;
  rating?: number;
  reviewCount?: number;
  soldCount?: number;
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

export interface OrganizationReel {
  id: string;
  title?: string | null;
  caption?: string | null;
  description?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  viewCount?: number;
  likeCount?: number;
  createdAt?: string;
  publishedAt?: string | null;
  product?: {
    id: string;
    name: string;
    price?: number | string | null;
    images?: { url?: string | null }[];
  } | null;
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
    soldCount: number;
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
    images?: string[];
    title: string;
    price: number;
    originalPrice?: number;
    category?: string;
    tag?: string;
    rating?: number;
    reviews?: number;
    stock?: number;
    soldCount?: number;
    supplyType?: "IN_STOCK" | "CHINA_PREORDER";
    preorderLeadTimeDays?: number | null;
    createdAt?: string;
  }[];
  investor?: {
    isInvestor: boolean;
    tier: string;
    level?: string | null;
    investmentAmount?: number | null;
  };
  servicePosts: ServicePost[];
  reels: OrganizationReel[];
}

function normalizeHours(value?: string[] | string): string[] {
  if (!value) return ["Цагийн хуваарь бүртгэлгүй"];
  if (Array.isArray(value)) {
    return value.length ? value : ["Цагийн хуваарь бүртгэлгүй"];
  }
  return [value];
}

function mapPartnerToDetailData(
  partner: BackendPartner,
): OrganizationDetailData {
  const category = partner.businessCategory || partner.type || "Бизнес";
  const metrics = normalizeOrganizationMetrics(partner);

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
    isOpen: metrics.isOpen,
    isVerified: metrics.isVerified,
    categories: [category],
    investor: partner.isInvestor
      ? {
          isInvestor: true,
          tier: partner.investorTier || "INVESTOR",
          level: partner.investorLevel,
          investmentAmount: partner.investmentAmount ?? null,
        }
      : undefined,
    rating: metrics.rating,
    reviewCount: metrics.reviewCount,
    shortDescription:
      partner.shortDescription ||
      "Чанартай үйлчилгээ, найдвартай албан ёсны байгууллага.",
    description:
      partner.description ||
      "Байгууллагын дэлгэрэнгүй танилцуулга удахгүй нэмэгдэх болно.",
    stats: {
      customers: metrics.customers,
      years: metrics.years,
      soldCount: metrics.soldCount,
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
          images: product.images,
          title: product.title || product.name || "Нэргүй бүтээгдэхүүн",
          price: product.price ?? 0,
          originalPrice: product.originalPrice,
          category: product.category,
          tag: product.tag,
          rating: product.rating ?? 0,
          reviews: product.reviews ?? 0,
          soldCount: product.soldCount ?? 0,
          stock: product.stock,
          supplyType: product.supplyType,
          preorderLeadTimeDays: product.preorderLeadTimeDays,
          createdAt: product.createdAt,
        }))
      : [],
    servicePosts: [],
    reels: [],
  };
}

function getLocalOrganizationDetail(
  organizationId: string,
): OrganizationDetailData | null {
  if (!LOCAL_MOCK_CATALOG_ENABLED) return null;
  const organization = localCatalogOrganizations.find(
    (item) => item.id === organizationId,
  );
  if (!organization) return null;

  const result = queryLocalCatalog({
    organizationId,
    sort: "newest",
    limit: 100,
    offset: 0,
  });
  const categories = [
    ...new Set(result.products.map((product) => product.businessCategory.name)),
  ];

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.id,
    logo: `https://picsum.photos/seed/logo-${organization.id}/400/400`,
    coverImage: `https://picsum.photos/seed/banner-${organization.id}/1600/500`,
    isOpen: true,
    isVerified: true,
    categories,
    rating: 0,
    reviewCount: 0,
    shortDescription: `${organization.name} online shop`,
    description: `${organization.name} байгууллагын local хөгжүүлэлтийн дэлгүүр.`,
    stats: { customers: "0", years: 1, soldCount: 0 },
    info: {
      hours: ["Даваа–Ням 09:00–22:00"],
      location: "Улаанбаатар",
    },
    products: result.products.map((product) => ({
      id: product.id,
      image: product.images[0]?.url || "",
      images: product.images.map((image) => image.url),
      title: product.name,
      price: product.price,
      category: product.businessCategory.name,
      rating: 0,
      reviews: 0,
      soldCount: 0,
      stock: product.stock,
      supplyType: product.supplyType,
      preorderLeadTimeDays: product.preorderLeadTimeDays,
      createdAt: product.createdAt,
    })),
    servicePosts: [],
    reels: [],
  };
}

const fetchOrganization = cache(async function fetchOrganization(
  slugOrId: string,
  fallbackId?: string,
): Promise<OrganizationDetailData | null> {
  const localOrganization = getLocalOrganizationDetail(slugOrId);
  if (localOrganization) return localOrganization;

  try {
    // Use dedicated endpoint for single partner
    let res = await fetch(`${API}/partners/${encodeURIComponent(slugOrId)}`, {
      cache: "no-store",
    });

    if (
      !res.ok &&
      res.status === 404 &&
      fallbackId &&
      fallbackId !== slugOrId
    ) {
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
});

function socialImageUrl(image?: string) {
  if (!image) return FALLBACK_SOCIAL_LOGO;
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("/")) return image;
  return FALLBACK_SOCIAL_LOGO;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const query = searchParams ? await searchParams : undefined;
  const organization = await fetchOrganization(
    id,
    query?.oid?.trim() || undefined,
  );

  if (!organization) {
    return {
      title: "Байгууллага олдсонгүй | MGL Store",
      openGraph: {
        images: [FALLBACK_SOCIAL_LOGO],
      },
      twitter: {
        card: "summary_large_image",
        images: [FALLBACK_SOCIAL_LOGO],
      },
    };
  }

  const title = `${organization.name} | MGL Store`;
  const description =
    organization.shortDescription ||
    organization.description ||
    "MGL Store платформ дахь байгууллагын хуудас.";
  const image = socialImageUrl(organization.logo);
  const canonicalHandle = organization.slug || id;
  const url = `${SITE_URL}/organizations/${encodeURIComponent(canonicalHandle)}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      siteName: "MGL Store",
      title,
      description,
      url,
      images: [
        {
          url: image,
          alt: `${organization.name} logo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

async function renderOrganizationDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : undefined;
  const fallbackId = query?.oid?.trim();
  const organization = await fetchOrganization(id, fallbackId || undefined);

  if (!organization) {
    notFound();
  }

  // Keep old bookmarks and ID-based links working, while ensuring people see
  // and share the readable public address instead of an internal UUID.
  if (organization.slug && id !== organization.slug) {
    permanentRedirect(
      `/organizations/${encodeURIComponent(organization.slug)}`,
    );
  }

  return <BusinessProfileClient data={organization} />;
}

export default async function OrganizationDetailPage(props: PageProps) {
  return renderOrganizationDetailPage(props);
}
