"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clapperboard,
  Eye,
  Film,
  Globe2,
  Heart,
  ImageIcon,
  Loader2,
  MapPin,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  PlusCircle,
  Send,
  ShieldCheck,
  Share2,
  SlidersHorizontal,
  Star,
  Store,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { API } from "@/lib/api";
import { useAuth, type AuthOrganization } from "@/lib/auth-context";
import {
  MAX_PRODUCT_IMAGES,
  uploadProductImages,
} from "@/lib/product-image-upload";
import { normalizeOrganizationMetrics } from "@/lib/organization-presentation";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import type { BusinessCategory } from "@/types/category";
import { ORG_PORTAL_URL, VENDOR_PORTAL_URL } from "@/lib/portal-links";
import { QuickProductSupplyFields } from "./QuickProductSupplyFields";
import type {
  QuickProductFormState,
  QuickProductTextField,
} from "./quick-product.types";

const ORG_URL = ORG_PORTAL_URL;
const VENDOR_URL = VENDOR_PORTAL_URL;

type ManagedOrgDetails = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  businessCategory?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  openingHours?: string | null;
  status?: string | null;
  isVerified?: boolean;
  rating?: number;
  reviewCount?: number;
  customerCount?: string | null;
  customers?: string | null;
  operatingYears?: number;
  years?: number;
};

type ManagedProduct = {
  id: string;
  name: string;
  description?: string | null;
  price?: number | string | null;
  stock?: number | null;
  images?: Array<{ url?: string | null }>;
  createdAt?: string | Date;
};

type ManagedServicePost = {
  id: string;
  title: string;
  description?: string | null;
  priceText?: string | null;
  tags?: string[];
  images?: Array<{ url?: string | null }>;
  isActive?: boolean;
  createdAt?: string | Date;
};

type ManagedFeedPost = {
  id: string;
  content: string;
  type?: string | null;
  imageUrls?: string[];
  createdAt?: string | Date;
};

type ManagedReel = {
  id: string;
  title?: string | null;
  caption?: string | null;
  description?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  tags?: string[];
  reviewStatus?: string;
  status?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  createdAt?: string | Date;
};

type ManagedContentState = {
  products: ManagedProduct[];
  services: ManagedServicePost[];
  posts: ManagedFeedPost[];
  reels: ManagedReel[];
};

type ContentTab =
  | "home"
  | "about"
  | "products"
  | "reels"
  | "posts"
  | "ads"
  | "more";

type ManagedTimelineItem =
  | {
      id: string;
      kind: "product";
      title: string;
      description?: string | null;
      image?: string | null;
      images: string[];
      meta: string;
      stats?: string;
      edit: {
        description: string;
        price: string;
        stock: string;
        title: string;
      };
      href: string;
      createdAt?: string | Date;
    }
  | {
      id: string;
      kind: "service";
      title: string;
      description?: string | null;
      image?: string | null;
      images: string[];
      meta: string;
      stats?: string;
      edit: {
        description: string;
        priceText: string;
        title: string;
      };
      href: string;
      createdAt?: string | Date;
    }
  | {
      id: string;
      kind: "post";
      title: string;
      description?: string | null;
      image?: string | null;
      images: string[];
      meta: string;
      stats?: string;
      edit: {
        content: string;
        type: string;
      };
      createdAt?: string | Date;
    }
  | {
      id: string;
      kind: "reel";
      title: string;
      description?: string | null;
      image?: string | null;
      images: string[];
      videoUrl: string;
      meta: string;
      stats?: string;
      metrics: {
        comments: number;
        likes: number;
        shares: number;
        views: number;
      };
      edit: {
        description: string;
        title: string;
      };
      createdAt?: string | Date;
    };

type TimelineEditForm = {
  content: string;
  description: string;
  price: string;
  priceText: string;
  images: string[];
  stock: string;
  title: string;
  type: string;
};

type ReelFormState = {
  linkMode: "store" | "product";
  productId: string;
  title: string;
  caption: string;
  tags: string;
  video: File | null;
};

type CreateMode = "post" | "product" | "reel";
type DatePreset = "all" | "today" | "7d" | "30d" | "custom";

type OrgProfileFormState = {
  name: string;
  phone: string;
  email: string;
  address: string;
  shortDescription: string;
  description: string;
  openingHours: string;
  operatingYears: string;
};

const roleLabel: Record<string, string> = {
  OWNER: "Эзэмшигч",
  ADMIN: "Админ",
  STAFF: "Ажилтан",
  VIEWER: "Ажиглагч",
};

const contentTabs: Array<{ id: ContentTab; label: string }> = [
  { id: "home", label: "Нүүр" },
  { id: "about", label: "Тухай" },
  { id: "products", label: "Бүтээгдэхүүн" },
  { id: "reels", label: "Reel" },
  { id: "ads", label: "Зар" },
  { id: "more", label: "Илүү" },
];
const SHOW_POST_SECTION: boolean = false;
const PROFILE_CONTENT_PAGE_SIZE = 10;

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function orgPublicHref(org: AuthOrganization | ManagedOrgDetails) {
  return "slug" in org && org.slug
    ? `/organizations/${encodeURIComponent(org.slug)}`
    : `/organizations/${encodeURIComponent(org.id)}`;
}

async function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Profile link хуулах боломжгүй байна");
}

function PublicProfileActions({
  href,
  organizationName,
  compact = false,
}: {
  href: string;
  organizationName: string;
  compact?: boolean;
}) {
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");

  const shareProfile = async () => {
    const url = new URL(href, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({
          title: organizationName,
          text: `${organizationName} байгууллагын мэдээллийг үзээрэй.`,
          url,
        });
        return;
      }
      await copyToClipboard(url);
      setShareStatus("copied");
      window.setTimeout(() => setShareStatus("idle"), 2400);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await copyToClipboard(url);
        setShareStatus("copied");
        window.setTimeout(() => setShareStatus("idle"), 2400);
      } catch {
        setShareStatus("idle");
      }
    }
  };

  const actionClass = compact
    ? "inline-flex h-9 items-center gap-1.5 rounded-full bg-white/92 px-3 text-xs font-black text-slate-900 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
    : "inline-flex h-10 items-center gap-2 rounded-full bg-white/90 px-4 text-sm font-black text-slate-800 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50";

  return (
    <div className="flex items-center gap-2">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={actionClass}
        aria-label={`${organizationName} байгууллагыг хэрэглэгчийн нүдээр харах`}
      >
        <Eye size={compact ? 14 : 16} />
        {compact ? "Харах" : "Хэрэглэгчийн нүдээр"}
        {!compact && <ArrowUpRight size={15} />}
      </a>
      <button
        type="button"
        onClick={shareProfile}
        className={actionClass}
        aria-label={`${organizationName} байгууллагын profile хуваалцах`}
      >
        {shareStatus === "copied" ? (
          <CheckCircle2 size={compact ? 14 : 16} />
        ) : (
          <Share2 size={compact ? 14 : 16} />
        )}
        <span>{shareStatus === "copied" ? "Хуулагдлаа" : "Share"}</span>
      </button>
      <span className="sr-only" aria-live="polite">
        {shareStatus === "copied" ? "Profile link хуулагдлаа" : ""}
      </span>
    </div>
  );
}

function fallbackCover(id: string) {
  return `https://picsum.photos/seed/org-cover-${id}/1600/700`;
}

function fallbackLogo(id: string) {
  return `https://picsum.photos/seed/org-logo-${id}/400/400`;
}

function compactImageUrls(images?: Array<{ url?: string | null }> | null) {
  return (images || [])
    .map((image) => image.url)
    .filter((url): url is string => Boolean(url));
}

function getMediaUrl(url: string) {
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API.replace(/\/api$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

function compactCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value || 0);
}

function mergeUniqueById<T extends { id: string }>(current: T[], next: T[]) {
  const seen = new Set(current.map((item) => item.id));
  const merged = [...current];
  for (const item of next) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

function productListForReels(products: ManagedProduct[]) {
  return products.map((product) => ({
    id: product.id,
    label: product.name,
    meta: [
      typeof product.price === "number" || typeof product.price === "string"
        ? formatPrice(product.price)
        : "",
      typeof product.stock === "number" ? `${product.stock} нөөц` : "",
    ]
      .filter(Boolean)
      .join(" · "),
  }));
}

export function ManagedOrganizationProfile({
  activeOrganizationId,
  onBackToPersonal,
  onSelectOrganization,
  organizations,
}: {
  activeOrganizationId: string;
  onBackToPersonal: () => void;
  onSelectOrganization: (organizationId: string) => void;
  organizations: AuthOrganization[];
}) {
  const { authFetch } = useAuth();
  const selectedOrg = useMemo(
    () =>
      organizations.find((org) => org.id === activeOrganizationId) ||
      organizations[0],
    [activeOrganizationId, organizations],
  );
  const [details, setDetails] = useState<ManagedOrgDetails | null>(null);
  const [content, setContent] = useState<ManagedContentState>({
    products: [],
    services: [],
    posts: [],
    reels: [],
  });
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [postText, setPostText] = useState("");
  const [postType, setPostType] = useState("GENERAL");
  const [postImages, setPostImages] = useState<string[]>([]);
  const [postContact, setPostContact] = useState("");
  const [postLocation, setPostLocation] = useState("");
  const [postPromo, setPostPromo] = useState("");
  const [activeContentTab, setActiveContentTab] = useState<ContentTab>("home");
  const [focusedReelId, setFocusedReelId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<CreateMode>("product");
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState("");
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [imageActionMenu, setImageActionMenu] = useState<
    "logoUrl" | "bannerUrl" | null
  >(null);
  const [imageUploading, setImageUploading] = useState<
    "logoUrl" | "bannerUrl" | null
  >(null);
  const [imageMessage, setImageMessage] = useState("");
  const [imagePreview, setImagePreview] = useState<{
    title: string;
    url: string;
  } | null>(null);
  const [editingTimelineItem, setEditingTimelineItem] =
    useState<ManagedTimelineItem | null>(null);
  const [timelineActionMessage, setTimelineActionMessage] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [contentHasMore, setContentHasMore] = useState(true);
  const [contentLoadingMore, setContentLoadingMore] = useState(false);
  const profileTopRef = useRef<HTMLElement | null>(null);
  const contentLoadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedOrg) return;

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const key = selectedOrg.slug || selectedOrg.id;
        const res = await fetch(`${API}/partners/${encodeURIComponent(key)}`);
        const data = await res.json().catch(() => null);
        if (!active) return;
        setDetails(
          res.ok && data
            ? {
                ...data,
                customerCount: data.customerCount ?? data.customers ?? "0",
                operatingYears: data.operatingYears ?? data.years ?? 1,
              }
            : null,
        );
      } catch {
        if (active) setDetails(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [selectedOrg]);

  const loadOrgContentPage = useCallback(
    async ({
      append,
      postOffset,
      productOffset,
      reelOffset,
      serviceOffset,
    }: {
      append: boolean;
      postOffset: number;
      productOffset: number;
      reelOffset: number;
      serviceOffset: number;
    }) => {
      if (!selectedOrg) return;

      if (append) {
        setContentLoadingMore(true);
      } else {
        setContentLoading(true);
        setContentHasMore(true);
      }

      try {
        const orgId = encodeURIComponent(selectedOrg.id);
        const pageSize = PROFILE_CONTENT_PAGE_SIZE;
        const [productsRes, servicesRes, reelsRes, postsRes] =
          await Promise.all([
            authFetch(
              `${API}/products?organizationId=${orgId}&includeInactive=true&limit=${pageSize}&offset=${productOffset}`,
            ),
            authFetch(
              `${API}/service-posts?organizationId=${orgId}&limit=${pageSize}&offset=${serviceOffset}`,
            ),
            authFetch(
              `${API}/reels?organizationId=${orgId}&limit=${pageSize}&offset=${reelOffset}`,
            ),
            SHOW_POST_SECTION
              ? authFetch(
                  `${API}/posts?organizationId=${orgId}&limit=${pageSize}&offset=${postOffset}`,
                )
              : Promise.resolve(null),
          ]);

        const [productsData, servicesData, reelsData, postsData] =
          await Promise.all([
            productsRes.ok ? productsRes.json().catch(() => []) : [],
            servicesRes.ok ? servicesRes.json().catch(() => []) : [],
            reelsRes.ok
              ? reelsRes.json().catch(() => ({ items: [] }))
              : { items: [] },
            postsRes?.ok ? postsRes.json().catch(() => []) : [],
          ]);

        const nextProducts = Array.isArray(productsData) ? productsData : [];
        const nextServices = Array.isArray(servicesData) ? servicesData : [];
        const nextReels = Array.isArray(reelsData?.items)
          ? reelsData.items
          : [];
        const nextPosts = Array.isArray(postsData) ? postsData : [];

        setContent((current) => ({
          products: append
            ? mergeUniqueById(current.products, nextProducts)
            : nextProducts,
          services: append
            ? mergeUniqueById(current.services, nextServices)
            : nextServices,
          reels: append ? mergeUniqueById(current.reels, nextReels) : nextReels,
          posts: append ? mergeUniqueById(current.posts, nextPosts) : nextPosts,
        }));
        setContentHasMore(
          nextProducts.length === pageSize ||
            nextServices.length === pageSize ||
            nextReels.length === pageSize ||
            nextPosts.length === pageSize,
        );
      } catch {
        if (!append) {
          setContent({ products: [], services: [], posts: [], reels: [] });
        }
        setContentHasMore(false);
      } finally {
        if (append) {
          setContentLoadingMore(false);
        } else {
          setContentLoading(false);
        }
      }
    },
    [authFetch, selectedOrg],
  );

  const loadOrgContent = useCallback(async () => {
    await loadOrgContentPage({
      append: false,
      postOffset: 0,
      productOffset: 0,
      reelOffset: 0,
      serviceOffset: 0,
    });
  }, [loadOrgContentPage]);

  const loadMoreOrgContent = useCallback(async () => {
    if (
      !selectedOrg ||
      contentLoading ||
      contentLoadingMore ||
      !contentHasMore
    ) {
      return;
    }

    await loadOrgContentPage({
      append: true,
      postOffset: content.posts.length,
      productOffset: content.products.length,
      reelOffset: content.reels.length,
      serviceOffset: content.services.length,
    });
  }, [
    content.posts.length,
    content.products.length,
    content.reels.length,
    content.services.length,
    contentHasMore,
    contentLoading,
    contentLoadingMore,
    loadOrgContentPage,
    selectedOrg,
  ]);

  useEffect(() => {
    void loadOrgContent();
  }, [loadOrgContent]);

  useEffect(() => {
    const target = contentLoadMoreRef.current;
    if (!target || contentLoading || contentLoadingMore || !contentHasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMoreOrgContent();
        }
      },
      { rootMargin: "640px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [contentHasMore, contentLoading, contentLoadingMore, loadMoreOrgContent]);

  useEffect(() => {
    const updateScrollTopVisibility = () => {
      setShowScrollTop(window.scrollY > 720);
    };

    updateScrollTopVisibility();
    window.addEventListener("scroll", updateScrollTopVisibility, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", updateScrollTopVisibility);
    };
  }, []);

  const scrollToProfileTop = () => {
    profileTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (!selectedOrg) return null;

  const org = details;
  const name = org?.name || selectedOrg.name;
  const logo =
    org?.logoUrl || selectedOrg.logoUrl || fallbackLogo(selectedOrg.id);
  const cover = org?.bannerUrl || fallbackCover(selectedOrg.id);
  const metrics = normalizeOrganizationMetrics({
    ...org,
    isVerified: org?.isVerified ?? selectedOrg.isVerified,
    status: org?.status || selectedOrg.status,
  });
  const isOpen = metrics.isOpen;
  const isVerified = metrics.isVerified;
  const category = org?.businessCategory || selectedOrg.type || "SUPPLIER";
  const shortDescription =
    org?.shortDescription ||
    org?.description ||
    "Чанартай үйлчилгээ, найдвартай албан ёсны байгууллага.";
  const profileInitialForm: OrgProfileFormState = {
    name,
    phone: org?.phone || "",
    email: org?.email || "",
    address: org?.address || "",
    shortDescription: org?.shortDescription || "",
    description: org?.description || "",
    openingHours: org?.openingHours || "",
    operatingYears: String(metrics.years),
  };

  const updateProfileImage = async (
    field: "logoUrl" | "bannerUrl",
    files: FileList | null,
  ) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageMessage("Зөвхөн зураг файл оруулна уу.");
      return;
    }

    setImageUploading(field);
    setImageMessage("");
    try {
      const body = new FormData();
      body.append("image", file);
      const uploadRes = await authFetch(`${API}/partners/upload-image`, {
        method: "POST",
        body,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadData?.url) {
        setImageMessage(
          uploadData?.message || "Зураг upload хийхэд алдаа гарлаа.",
        );
        return;
      }

      const saveRes = await authFetch(
        `${API}/partners/${selectedOrg.id}/profile`,
        {
          method: "PATCH",
          body: JSON.stringify({ [field]: uploadData.url }),
        },
      );
      const saveData = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) {
        setImageMessage(saveData?.message || "Зураг хадгалахад алдаа гарлаа.");
        return;
      }

      setDetails((current) => ({
        ...(current || {
          id: selectedOrg.id,
          name: selectedOrg.name,
          slug: selectedOrg.slug || selectedOrg.id,
        }),
        ...saveData,
      }));
      setImageActionMenu(null);
      setImageMessage("Зураг шинэчлэгдлээ.");
    } catch {
      setImageMessage("Зураг солиход сүлжээний алдаа гарлаа.");
    } finally {
      setImageUploading(null);
    }
  };

  const publishPost = async () => {
    const content = [
      postText.trim(),
      postContact.trim() ? `Холбоо барих: ${postContact.trim()}` : "",
      postLocation.trim() ? `Байршил: ${postLocation.trim()}` : "",
      postPromo.trim() ? `Урамшуулал: ${postPromo.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const finalContent = content || (postImages.length ? "Зурагтай пост" : "");
    if (!finalContent || posting) return;

    setPosting(true);
    setMessage("");
    try {
      const tags = [
        postContact.trim() ? "contact" : "",
        postLocation.trim() ? "location" : "",
        postPromo.trim() ? "promotion" : "",
      ].filter(Boolean);
      const res = await authFetch(`${API}/posts`, {
        method: "POST",
        body: JSON.stringify({
          organizationId: selectedOrg.id,
          content: finalContent,
          imageUrls: postImages,
          tags,
          type: postPromo.trim() ? "PROMOTION" : postType,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.message || "Пост нийтлэхэд алдаа гарлаа");
        return;
      }
      setPostText("");
      setPostImages([]);
      setPostContact("");
      setPostLocation("");
      setPostPromo("");
      setMessage("Пост байгууллагын page дээр нийтлэгдлээ.");
      await loadOrgContent();
    } catch {
      setMessage("Пост нийтлэхэд сүлжээний алдаа гарлаа");
    } finally {
      setPosting(false);
    }
  };

  const updateTimelineItem = async (
    item: ManagedTimelineItem,
    form: TimelineEditForm,
  ) => {
    const endpoint =
      item.kind === "product"
        ? `${API}/products/${item.id}`
        : item.kind === "service"
          ? `${API}/service-posts/${item.id}`
          : item.kind === "reel"
            ? `${API}/reels/${item.id}`
            : `${API}/posts/${item.id}`;
    const payload =
      item.kind === "product"
        ? {
            name: form.title.trim(),
            description: form.description.trim() || null,
            images: form.images,
            price: Number(form.price || 0),
            stock: Number(form.stock || 0),
          }
        : item.kind === "service"
          ? {
              title: form.title.trim(),
              description: form.description.trim() || null,
              images: form.images,
              priceText: form.priceText.trim() || null,
            }
          : item.kind === "reel"
            ? {
                title: form.title.trim() || null,
                caption: form.description.trim() || null,
              }
            : {
                content: form.content.trim(),
                type: form.type,
              };

    const res = await authFetch(endpoint, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || "Мэдээлэл засахад алдаа гарлаа");
    }

    setEditingTimelineItem(null);
    setTimelineActionMessage("Мэдээлэл шинэчлэгдлээ.");
    await loadOrgContent();
  };

  const deleteTimelineItem = async (item: ManagedTimelineItem) => {
    if (!confirm(`"${item.title}" мэдээллийг устгах уу?`)) return;

    const endpoint =
      item.kind === "product"
        ? `${API}/products/${item.id}`
        : item.kind === "service"
          ? `${API}/service-posts/${item.id}`
          : item.kind === "reel"
            ? `${API}/reels/${item.id}`
            : `${API}/posts/${item.id}`;

    try {
      const res = await authFetch(endpoint, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Мэдээлэл устгахад алдаа гарлаа");
      }
      setTimelineActionMessage("Мэдээлэл устгагдлаа.");
      await loadOrgContent();
    } catch (error) {
      setTimelineActionMessage(
        error instanceof Error
          ? error.message
          : "Мэдээлэл устгахад алдаа гарлаа",
      );
    }
  };

  return (
    <section ref={profileTopRef} className="space-y-5">
      <div className="rounded-[24px] border border-white bg-white p-3 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-4">
        <button
          type="button"
          onClick={onBackToPersonal}
          className="inline-flex h-10 items-center gap-2 rounded-full px-2 pr-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
            <ArrowLeft size={17} />
          </span>
          Personal account
        </button>

        <label className="relative mt-3 block">
          <span className="sr-only">Account солих</span>
          <span className="flex min-h-[58px] items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-3 pr-11 transition focus-within:border-emerald-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
              {getInitials(name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black text-slate-950">
                {name}
              </span>
              <span className="mt-0.5 block truncate text-xs font-bold text-slate-500">
                {roleLabel[selectedOrg.role] || selectedOrg.role}
              </span>
            </span>
          </span>
          <select
            value={selectedOrg.id}
            onChange={(event) => {
              onSelectOrganization(event.target.value);
              setMessage("");
            }}
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-[20px] opacity-0"
          >
            {organizations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {roleLabel[item.role] || item.role}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </label>
      </div>

      <MobileOrganizationHero
        category={category}
        cover={cover}
        imageActionMenu={imageActionMenu}
        imageUploading={imageUploading}
        isOpen={isOpen}
        isVerified={isVerified}
        logo={logo}
        name={name}
        onEditProfile={() => setProfileEditorOpen(true)}
        onPreviewImage={(title, url) => {
          setImagePreview({ title, url });
          setImageActionMenu(null);
        }}
        onToggleImageMenu={setImageActionMenu}
        onUploadImage={updateProfileImage}
        publicHref={orgPublicHref(org || selectedOrg)}
        rating={metrics.rating}
        reviewCount={metrics.reviewCount}
        role={roleLabel[selectedOrg.role] || selectedOrg.role}
        shortDescription={shortDescription}
      />

      <div className="hidden overflow-visible rounded-2xl border border-slate-100 bg-white shadow-sm sm:block">
        <div className="relative h-24 overflow-hidden rounded-t-2xl bg-slate-200">
          <button
            type="button"
            onClick={() =>
              setImageActionMenu((current) =>
                current === "bannerUrl" ? null : "bannerUrl",
              )
            }
            className="block h-full w-full text-left"
            aria-label="Cover зурагны сонголт"
          >
            <img
              src={cover}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </button>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/55 via-slate-950/20 to-transparent" />
          <ImageActionMenu
            field="bannerUrl"
            isOpen={imageActionMenu === "bannerUrl"}
            label="Cover зураг"
            onToggle={() =>
              setImageActionMenu((current) =>
                current === "bannerUrl" ? null : "bannerUrl",
              )
            }
            onPreview={() => {
              setImagePreview({ title: "Cover зураг", url: cover });
              setImageActionMenu(null);
            }}
            onUpload={updateProfileImage}
            uploading={imageUploading === "bannerUrl"}
            variant="cover"
          />
          <div className="absolute right-4 top-4">
            <PublicProfileActions
              href={orgPublicHref(org || selectedOrg)}
              organizationName={name}
            />
          </div>
        </div>

        <div className="relative -mt-8 mx-4 mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-lg shadow-slate-200/60">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4 text-left">
              <div className="relative h-20 w-20 shrink-0 rounded-2xl bg-slate-100 shadow-md ring-4 ring-white">
                <button
                  type="button"
                  onClick={() =>
                    setImageActionMenu((current) =>
                      current === "logoUrl" ? null : "logoUrl",
                    )
                  }
                  className="group h-full w-full overflow-hidden rounded-2xl"
                  aria-label="Profile зурагны сонголт"
                >
                  <img
                    src={logo}
                    alt=""
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute inset-x-0 bottom-0 flex h-9 items-center justify-center bg-slate-950/60 text-[11px] font-black text-white opacity-0 transition group-hover:opacity-100">
                    Зураг
                  </span>
                </button>
                {isOpen && (
                  <span className="absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
                )}
                <ImageActionMenu
                  field="logoUrl"
                  isOpen={imageActionMenu === "logoUrl"}
                  label="Profile зураг"
                  onToggle={() =>
                    setImageActionMenu((current) =>
                      current === "logoUrl" ? null : "logoUrl",
                    )
                  }
                  onPreview={() => {
                    setImagePreview({ title: "Profile зураг", url: logo });
                    setImageActionMenu(null);
                  }}
                  onUpload={updateProfileImage}
                  uploading={imageUploading === "logoUrl"}
                  variant="avatar"
                />
              </div>

              <div
                className={`min-w-0 transition-[padding] ${
                  imageActionMenu === "logoUrl" ? "pt-28 sm:pt-0" : "pt-0"
                }`}
              >
                <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  {isOpen && (
                    <Badge tone="emerald">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      Нээлттэй
                    </Badge>
                  )}
                  {isVerified && (
                    <Badge tone="blue">
                      <ShieldCheck size={13} />
                      Баталгаат
                    </Badge>
                  )}
                  <Badge tone="slate">{category}</Badge>
                  <Badge tone="amber">
                    {roleLabel[selectedOrg.role] || selectedOrg.role}
                  </Badge>
                </div>

                <h1 className="mt-2 line-clamp-2 break-words text-2xl font-black tracking-tight text-slate-950 sm:truncate">
                  {name}
                </h1>

                <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-sm font-bold sm:justify-start">
                  <span className="inline-flex items-center gap-1 text-slate-900">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {metrics.rating.toFixed(1)} ({metrics.reviewCount})
                  </span>
                  {isOpen && (
                    <span className="text-emerald-600">Яг одоо идэвхтэй</span>
                  )}
                  {loading && (
                    <span className="text-slate-400">Ачааллаж байна...</span>
                  )}
                </div>

                <p className="mt-2 max-w-3xl line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
                  {shortDescription}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 lg:w-[440px]">
              <QuickStat
                icon={ShieldCheck}
                label="Албан ёсны"
                value={isVerified ? "Баталгаат" : "Хүлээгдэж буй"}
              />
              <QuickStat
                icon={Users}
                label="Харилцагч"
                value={metrics.customers}
              />
              <QuickStat
                icon={CalendarDays}
                label="Туршлага"
                value={`${metrics.years} жил`}
              />
            </div>
          </div>
        </div>
      </div>

      {imageMessage && (
        <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
          {imageMessage}
        </div>
      )}

      {imagePreview && (
        <ImagePreviewModal
          title={imagePreview.title}
          url={imagePreview.url}
          onClose={() => setImagePreview(null)}
        />
      )}

      <div className="rounded-[22px] border border-white bg-white p-2 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:px-3">
        <div className="grid grid-cols-3 gap-1 sm:flex sm:overflow-x-auto sm:scrollbar-hide">
          {contentTabs.map((item) => {
            const active = activeContentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveContentTab(item.id)}
                className={`h-10 min-w-0 rounded-2xl px-2 text-[13px] font-black leading-none transition sm:h-11 sm:shrink-0 sm:px-4 sm:text-sm ${
                  active
                    ? "bg-orange-50 text-orange-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="block truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-5 lg:self-start">
          <WidgetCard
            action={
              <button
                type="button"
                onClick={() => setProfileEditorOpen(true)}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-orange-50 px-3 text-xs font-black text-orange-600 transition hover:bg-orange-100"
              >
                <Pencil size={14} />
                Засах
              </button>
            }
            title="Байгууллагын мэдээлэл"
          >
            <div className="space-y-3 text-sm font-bold text-slate-600">
              <p className="text-[15px] leading-7 text-slate-600 sm:text-sm sm:leading-6">
                {shortDescription}
              </p>
              {(org?.phone || org?.email || org?.address) && (
                <div className="space-y-1 rounded-2xl bg-slate-50 px-3 py-3 text-xs font-bold leading-5 text-slate-500">
                  {org?.phone && <p>Утас: {org.phone}</p>}
                  {org?.email && (
                    <p className="break-all">И-мэйл: {org.email}</p>
                  )}
                  {org?.address && (
                    <p className="break-words">Хаяг: {org.address}</p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <InfoPill label="Төрөл" value={category} />
                <InfoPill
                  label="Төлөв"
                  value={isOpen ? "Нээлттэй" : "Идэвхгүй"}
                />
                <InfoPill
                  label="Эрх"
                  value={roleLabel[selectedOrg.role] || selectedOrg.role}
                />
                <InfoPill
                  label="Үнэлгээ"
                  value={`${metrics.rating.toFixed(1)} / 5`}
                />
              </div>
            </div>
          </WidgetCard>

          <WidgetCard className="hidden lg:block" title="Хурдан холбоос">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
              <WidgetLink
                href={orgPublicHref(org || selectedOrg)}
                icon={Store}
                label="Нийтийн хуудас харах"
                text="Хэрэглэгчид харагдах нүүр"
              />
              <WidgetLink
                href={`${ORG_URL.replace(/\/$/, "")}/dashboard`}
                icon={ShieldCheck}
                label="Org dashboard"
                text="Байгууллагын удирдлага"
              />
              <WidgetLink
                href={`${VENDOR_URL.replace(/\/$/, "")}/service-posts`}
                icon={Megaphone}
                label="Зар удирдах"
                text="Санал, урамшуулал"
              />
            </div>
          </WidgetCard>

          <WidgetCard title="Товч үзүүлэлт">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
              <MiniMetric
                icon={Users}
                label="Харилцагч"
                value={metrics.customers}
              />
              <MiniMetric
                icon={CalendarDays}
                label="Туршлага"
                value={`${metrics.years} жил`}
              />
              <MiniMetric
                icon={ShieldCheck}
                label="Баталгаажилт"
                value={isVerified ? "Баталгаат" : "Хүлээгдэж буй"}
              />
            </div>
          </WidgetCard>
        </aside>

        <div className="mx-auto w-full max-w-[820px] space-y-4">
          <OrganizationCreateHub
            authFetch={authFetch}
            createMode={createMode}
            message={message}
            name={name}
            onModeChange={setCreateMode}
            onPostTextChange={setPostText}
            onPostTypeChange={setPostType}
            onPublishPost={publishPost}
            onContentChanged={loadOrgContent}
            onPostContactChange={setPostContact}
            onPostImagesChange={setPostImages}
            onPostLocationChange={setPostLocation}
            onPostPromoChange={setPostPromo}
            postContact={postContact}
            postImages={postImages}
            postLocation={postLocation}
            postPromo={postPromo}
            postText={postText}
            postType={postType}
            posting={posting}
            products={content.products}
            selectedOrganizationId={selectedOrg.id}
          />

          <OrganizationContentFeed
            activeTab={activeContentTab}
            focusedReelId={focusedReelId}
            hasMore={contentHasMore}
            loading={contentLoading}
            loadingMore={contentLoadingMore}
            loadMoreRef={contentLoadMoreRef}
            organization={{
              address: org?.address || "",
              category,
              email: org?.email || "",
              logo,
              name,
              phone: org?.phone || "",
              shortDescription,
              status: isOpen ? "Нээлттэй" : "Идэвхгүй",
            }}
            onDelete={deleteTimelineItem}
            onEdit={setEditingTimelineItem}
            posts={content.posts}
            products={content.products}
            reels={content.reels}
            onOpenReel={(reelId) => {
              setFocusedReelId(reelId);
              setActiveContentTab("reels");
            }}
            statusMessage={timelineActionMessage}
            services={content.services}
          />

          <aside className="grid gap-3 md:grid-cols-3">
            <PortalLink
              href={`${VENDOR_URL.replace(/\/$/, "")}/products`}
              icon={Boxes}
              label="Бүтээгдэхүүн оруулах"
            />
            <PortalLink
              href={`${VENDOR_URL.replace(/\/$/, "")}/service-posts`}
              icon={Megaphone}
              label="Зар удирдах"
            />
            <PortalLink
              href={`${ORG_URL.replace(/\/$/, "")}/dashboard`}
              icon={Store}
              label="Org dashboard"
            />
          </aside>
        </div>
      </div>

      {profileEditorOpen && (
        <OrganizationProfileEditor
          authFetch={authFetch}
          initialForm={profileInitialForm}
          organizationId={selectedOrg.id}
          onClose={() => setProfileEditorOpen(false)}
          onSaved={(updated) => {
            setDetails((current) => ({
              ...(current || {
                id: selectedOrg.id,
                name: selectedOrg.name,
                slug: selectedOrg.slug || selectedOrg.id,
              }),
              ...updated,
            }));
            setProfileEditorOpen(false);
          }}
        />
      )}

      {editingTimelineItem && (
        <TimelineEditModal
          authFetch={authFetch}
          item={editingTimelineItem}
          onClose={() => setEditingTimelineItem(null)}
          onSave={updateTimelineItem}
        />
      )}

      <button
        type="button"
        onClick={scrollToProfileTop}
        className={`fixed bottom-24 right-4 z-[120] flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-white shadow-2xl shadow-slate-950/25 ring-1 ring-white/20 transition duration-200 sm:bottom-8 sm:right-6 ${
          showScrollTop
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
        aria-label="Дээш очих"
      >
        <ArrowUp size={22} />
      </button>
    </section>
  );
}

function OrganizationContentFeed({
  activeTab,
  focusedReelId,
  hasMore,
  loading,
  loadingMore,
  loadMoreRef,
  onDelete,
  onEdit,
  onOpenReel,
  organization,
  posts,
  products,
  reels,
  statusMessage,
  services,
}: {
  activeTab: ContentTab;
  focusedReelId: string | null;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  onDelete: (item: ManagedTimelineItem) => void;
  onEdit: (item: ManagedTimelineItem) => void;
  onOpenReel: (reelId: string) => void;
  organization: {
    address: string;
    category: string;
    email: string;
    logo: string;
    name: string;
    phone: string;
    shortDescription: string;
    status: string;
  };
  posts: ManagedFeedPost[];
  products: ManagedProduct[];
  reels: ManagedReel[];
  statusMessage: string;
  services: ManagedServicePost[];
}) {
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  useLockBodyScroll(filterOpen);
  const timeline = useMemo(() => {
    const items: ManagedTimelineItem[] = [
      ...products.map((product) => ({
        id: product.id,
        kind: "product" as const,
        title: product.name,
        description: product.description || `${product.stock ?? 0} нөөцтэй`,
        image: product.images?.[0]?.url || null,
        images: compactImageUrls(product.images),
        meta: formatPrice(product.price),
        stats: `${product.stock ?? 0} нөөц`,
        edit: {
          description: product.description || "",
          price: String(product.price ?? ""),
          stock: String(product.stock ?? 0),
          title: product.name,
        },
        href: `/products/${encodeURIComponent(product.id)}`,
        createdAt: product.createdAt,
      })),
      ...services.map((service) => ({
        id: service.id,
        kind: "service" as const,
        title: service.title,
        description:
          service.description ||
          service.tags?.slice(0, 3).join(", ") ||
          "Тайлбаргүй",
        image: service.images?.[0]?.url || null,
        images: compactImageUrls(service.images),
        meta:
          service.priceText ||
          (service.isActive === false ? "Идэвхгүй" : "Идэвхтэй"),
        stats: service.tags?.slice(0, 3).join(" · ") || undefined,
        edit: {
          description: service.description || "",
          priceText: service.priceText || "",
          title: service.title,
        },
        href: `/services/${encodeURIComponent(service.id)}`,
        createdAt: service.createdAt,
      })),
      ...reels.map((reel) => ({
        id: reel.id,
        kind: "reel" as const,
        title: reel.title || "Reel",
        description:
          reel.caption ||
          reel.description ||
          reel.tags?.slice(0, 4).join(", ") ||
          null,
        image: reel.thumbnailUrl || null,
        images: reel.thumbnailUrl ? [reel.thumbnailUrl] : [],
        videoUrl: reel.videoUrl,
        meta: reel.reviewStatus === "APPROVED" ? "Reel" : "Хүлээгдэж буй",
        stats: reel.durationSeconds
          ? `${Math.round(reel.durationSeconds)} сек`
          : "Reel",
        metrics: {
          comments: reel.commentCount || 0,
          likes: reel.likeCount || 0,
          shares: reel.shareCount || 0,
          views: reel.viewCount || 0,
        },
        edit: {
          description: reel.caption || reel.description || "",
          title: reel.title || "",
        },
        createdAt: reel.createdAt,
      })),
      ...(SHOW_POST_SECTION
        ? posts.map((post) => ({
            id: post.id,
            kind: "post" as const,
            title: post.type || "Пост",
            description: post.content,
            image: post.imageUrls?.[0] || null,
            images: post.imageUrls || [],
            meta: post.type || "Пост",
            stats: undefined,
            edit: {
              content: post.content,
              type: post.type || "GENERAL",
            },
            createdAt: post.createdAt,
          }))
        : []),
    ];

    return items.sort(
      (a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt),
    );
  }, [posts, products, reels, services]);

  const typeFilteredTimeline = timeline.filter((item) => {
    if (activeTab === "products") return item.kind === "product";
    if (activeTab === "reels") return item.kind === "reel";
    if (activeTab === "posts") return SHOW_POST_SECTION && item.kind === "post";
    if (activeTab === "ads") return item.kind === "service";
    if (activeTab === "about") return false;
    return true;
  });

  const dateRange = useMemo(() => {
    if (datePreset === "all") return { from: null, to: null };
    const now = new Date();
    const end = endOfDay(dateTo ? new Date(dateTo) : now);

    if (datePreset === "today") {
      return { from: startOfDay(now), to: endOfDay(now) };
    }
    if (datePreset === "7d") {
      const start = startOfDay(now);
      start.setDate(start.getDate() - 6);
      return { from: start, to: endOfDay(now) };
    }
    if (datePreset === "30d") {
      const start = startOfDay(now);
      start.setDate(start.getDate() - 29);
      return { from: start, to: endOfDay(now) };
    }

    return {
      from: dateFrom ? startOfDay(new Date(dateFrom)) : null,
      to: dateTo ? end : null,
    };
  }, [dateFrom, datePreset, dateTo]);

  const filteredTimeline = typeFilteredTimeline.filter((item) => {
    const time = getTimeValue(item.createdAt);
    if (!time) return datePreset === "all";
    if (dateRange.from && time < dateRange.from.getTime()) return false;
    if (dateRange.to && time > dateRange.to.getTime()) return false;
    return true;
  });

  const tabLabel =
    contentTabs.find((item) => item.id === activeTab)?.label || "Нүүр";
  const reelItems = filteredTimeline.filter(
    (item): item is Extract<ManagedTimelineItem, { kind: "reel" }> =>
      item.kind === "reel",
  );
  const datePresetLabel =
    datePreset === "today"
      ? "Өнөөдөр"
      : datePreset === "7d"
        ? "7 хоног"
        : datePreset === "30d"
          ? "30 хоног"
          : datePreset === "custom"
            ? "Огноогоор"
            : "Бүгд";

  const selectDatePreset = (preset: Exclude<DatePreset, "custom">) => {
    setDatePreset(preset);
    if (preset === "all") {
      setDateFrom("");
      setDateTo("");
    }
  };

  return (
    <section className="space-y-3">
      {activeTab === "about" ? (
        <OrganizationAboutPanel organization={organization} />
      ) : (
        <>
          <div className="rounded-[22px] border border-white bg-white px-4 py-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:px-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    {tabLabel}
                  </h2>
                  <p className="mt-0.5 text-xs font-bold text-slate-400">
                    Шинэ оруулсан нь эхэндээ харагдана
                  </p>
                </div>
                {activeTab !== "reels" ? (
                  <button
                    type="button"
                    onClick={() => setFilterOpen(true)}
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-slate-950 px-3.5 text-xs font-black text-white shadow-lg shadow-slate-900/10 xl:hidden"
                    aria-haspopup="dialog"
                  >
                    <SlidersHorizontal size={15} />
                    {datePresetLabel}
                  </button>
                ) : null}
              </div>
              {activeTab === "reels" ? (
                <div className="inline-flex h-10 items-center gap-2 rounded-2xl bg-fuchsia-50 px-4 text-xs font-black text-fuchsia-700 ring-1 ring-fuchsia-100 xl:h-9 xl:rounded-full">
                  <Clapperboard size={15} />
                  {reelItems.length} reel
                </div>
              ) : (
                <div className="hidden flex-wrap items-center gap-2 xl:flex">
                  <ContentDateFilterControls
                    dateFrom={dateFrom}
                    datePreset={datePreset}
                    dateTo={dateTo}
                    onDateFromChange={(value) => {
                      setDateFrom(value);
                      setDatePreset("custom");
                    }}
                    onDateToChange={(value) => {
                      setDateTo(value);
                      setDatePreset("custom");
                    }}
                    onPresetChange={selectDatePreset}
                  />
                  <span className="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-100 px-4 text-xs font-black text-slate-500 sm:h-auto sm:min-h-10 xl:h-9 xl:rounded-full">
                    {loading
                      ? "Шинэчилж байна..."
                      : loadingMore
                        ? "Нэмж ачааллаж байна..."
                        : `${filteredTimeline.length} ачаалсан`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {filterOpen && activeTab !== "reels" ? (
            <div
              className="fixed inset-0 z-[150] flex items-end bg-slate-950/55 backdrop-blur-sm xl:hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="content-filter-title"
            >
              <button
                type="button"
                className="absolute inset-0 cursor-default"
                onClick={() => setFilterOpen(false)}
                aria-label="Шүүлтүүр хаах"
              />
              <div className="relative w-full rounded-t-[28px] bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-2xl">
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2
                      id="content-filter-title"
                      className="text-lg font-black text-slate-950"
                    >
                      Огноогоор шүүх
                    </h2>
                    <p className="mt-0.5 text-xs font-bold text-slate-400">
                      Харах хугацаагаа сонгоно уу
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                    aria-label="Хаах"
                  >
                    <X size={20} />
                  </button>
                </div>
                <ContentDateFilterControls
                  dateFrom={dateFrom}
                  datePreset={datePreset}
                  dateTo={dateTo}
                  mobile
                  onDateFromChange={(value) => {
                    setDateFrom(value);
                    setDatePreset("custom");
                  }}
                  onDateToChange={(value) => {
                    setDateTo(value);
                    setDatePreset("custom");
                  }}
                  onPresetChange={selectDatePreset}
                />
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white"
                >
                  {filteredTimeline.length} үр дүн харах
                </button>
              </div>
            </div>
          ) : null}

          {statusMessage && (
            <div className="rounded-[18px] border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-black text-orange-700">
              {statusMessage}
            </div>
          )}

          {activeTab === "home" && reelItems.length > 0 && (
            <HomeReelsJumpStrip
              items={reelItems.slice(0, 6)}
              onOpenReel={onOpenReel}
              organizationLogo={organization.logo}
            />
          )}

          {activeTab === "reels" && reelItems.length > 0 ? (
            <OrganizationReelsTheater
              focusedReelId={focusedReelId}
              items={reelItems}
              onDelete={onDelete}
              onEdit={onEdit}
              organizationLogo={organization.logo}
              organizationName={organization.name}
            />
          ) : filteredTimeline.length === 0 && !loading ? (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-white px-5 py-10 text-center shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-black text-slate-700">
                Энэ хэсэгт харагдах контент алга байна.
              </p>
              <p className="mt-1 text-xs font-bold text-slate-400">
                Дээрээс бүтээгдэхүүн, пост эсвэл зар нэмэхэд огноогоор энд
                гарна.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTimeline.map((item) => (
                <TimelineContentCard
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  organizationName={organization.name}
                  organizationLogo={organization.logo}
                />
              ))}
              {(hasMore || loadingMore) && (
                <div
                  ref={loadMoreRef}
                  className="flex min-h-16 items-center justify-center rounded-[18px] border border-dashed border-slate-200 bg-white/80 px-4 py-4 text-xs font-black text-slate-400"
                >
                  {loadingMore ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      Дараагийн контент ачааллаж байна
                    </span>
                  ) : (
                    "Доош гүйлгэхэд дараагийн контент ачаална"
                  )}
                </div>
              )}
              {!hasMore && filteredTimeline.length > 0 && !loadingMore && (
                <div className="rounded-[18px] bg-slate-50 px-4 py-4 text-center text-xs font-black text-slate-400">
                  Бүх контент ачааллаа.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function HomeReelsJumpStrip({
  items,
  onOpenReel,
  organizationLogo,
}: {
  items: Array<Extract<ManagedTimelineItem, { kind: "reel" }>>;
  onOpenReel: (reelId: string) => void;
  organizationLogo: string;
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-fuchsia-100 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.07)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-fuchsia-600">
            Reels
          </p>
          <h3 className="truncate text-base font-black text-slate-950">
            Богино video танилцуулга
          </h3>
        </div>
        <button
          type="button"
          onClick={() => onOpenReel(items[0]?.id)}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-slate-950 px-4 text-xs font-black text-white transition hover:bg-orange-500"
        >
          Бүгдийг үзэх
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenReel(item.id)}
            className="group relative h-48 w-28 shrink-0 overflow-hidden rounded-[20px] bg-slate-950 text-left shadow-sm ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:ring-orange-200"
          >
            <video
              src={getMediaUrl(item.videoUrl)}
              poster={item.image ? getMediaUrl(item.image) : undefined}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover opacity-90 transition group-hover:scale-105 group-hover:opacity-100"
            />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent p-2">
              <img
                src={organizationLogo}
                alt=""
                className="h-6 w-6 rounded-full object-cover ring-1 ring-white/40"
                referrerPolicy="no-referrer"
              />
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-black text-white backdrop-blur">
                Reel
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2">
              <p className="line-clamp-2 text-[11px] font-black leading-4 text-white">
                {item.title === "Reel"
                  ? item.description || "Reel video"
                  : item.title}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function OrganizationReelsTheater({
  focusedReelId,
  items,
  onDelete,
  onEdit,
  organizationLogo,
  organizationName,
}: {
  focusedReelId: string | null;
  items: Array<Extract<ManagedTimelineItem, { kind: "reel" }>>;
  onDelete: (item: ManagedTimelineItem) => void;
  onEdit: (item: ManagedTimelineItem) => void;
  organizationLogo: string;
  organizationName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem =
    items[Math.min(activeIndex, Math.max(0, items.length - 1))];

  useEffect(() => {
    if (!focusedReelId) return;
    const nextIndex = items.findIndex((item) => item.id === focusedReelId);
    if (nextIndex >= 0) setActiveIndex(nextIndex);
  }, [focusedReelId, items]);

  useEffect(() => {
    if (activeIndex <= items.length - 1) return;
    setActiveIndex(Math.max(0, items.length - 1));
  }, [activeIndex, items.length]);

  if (!activeItem) return null;

  const goTo = (index: number) => {
    setActiveIndex(Math.min(Math.max(index, 0), items.length - 1));
  };

  return (
    <section className="overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <div className="grid gap-0 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-slate-100 bg-slate-50/70 p-3 xl:border-b-0 xl:border-r">
          <div className="flex items-center justify-between gap-2 px-1">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-500">
                Reels
              </p>
              <p className="text-sm font-black text-slate-900">
                {items.length} video
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm">
              <Clapperboard size={18} />
            </span>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 xl:block xl:space-y-2 xl:overflow-visible xl:pb-0">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(index)}
                className={`flex min-w-[172px] items-center gap-2 rounded-[18px] border p-2 text-left transition xl:min-w-0 xl:w-full ${
                  index === activeIndex
                    ? "border-orange-200 bg-white shadow-[0_10px_26px_rgba(249,115,22,0.12)]"
                    : "border-transparent bg-white/60 hover:border-slate-200 hover:bg-white"
                }`}
              >
                <span className="flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-white">
                  <Film size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-black text-slate-900">
                    {item.title === "Reel" ? "Reel video" : item.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-bold text-slate-400">
                    {formatDate(item.createdAt) || "Огноогүй"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="relative bg-gradient-to-b from-slate-50 to-white p-3 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_76px] lg:items-center">
            <div className="mx-auto w-full max-w-[430px]">
              <div className="relative overflow-hidden rounded-[28px] bg-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/10">
                <video
                  key={activeItem.id}
                  src={getMediaUrl(activeItem.videoUrl)}
                  poster={
                    activeItem.image ? getMediaUrl(activeItem.image) : undefined
                  }
                  controls
                  preload="metadata"
                  className="block h-auto w-full bg-slate-950 object-contain"
                  style={{ maxHeight: "min(760px, 74dvh)" }}
                />

                <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 via-black/12 to-transparent p-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <img
                        src={organizationLogo}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/30"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {organizationName}
                        </p>
                        <p className="text-[11px] font-bold text-white/70">
                          {formatDate(activeItem.createdAt) || "Огноогүй"}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-white/16 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] backdrop-blur">
                      Reel
                    </span>
                  </div>
                </div>

                {(activeItem.title !== "Reel" || activeItem.description) && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-4 text-white">
                    {activeItem.title !== "Reel" && (
                      <h3 className="line-clamp-2 text-lg font-black leading-6">
                        {activeItem.title}
                      </h3>
                    )}
                    {activeItem.description && (
                      <p className="mt-1 line-clamp-3 text-xs font-semibold leading-5 text-white/85">
                        {activeItem.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-2 lg:flex-col lg:items-center">
              <ReelActionButton
                icon={Heart}
                label={compactCount(activeItem.metrics.likes)}
              />
              <ReelActionButton
                icon={MessageCircle}
                label={compactCount(activeItem.metrics.comments)}
              />
              <ReelActionButton
                icon={Share2}
                label={compactCount(activeItem.metrics.shares)}
              />
              <ReelActionButton
                icon={Eye}
                label={compactCount(activeItem.metrics.views)}
              />
              <TimelineCardMenu
                onDelete={() => onDelete(activeItem)}
                onEdit={() => onEdit(activeItem)}
              />
            </div>
          </div>

          {items.length > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                disabled={activeIndex === 0}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm transition hover:border-orange-200 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp size={15} />
                Өмнөх
              </button>
              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                disabled={activeIndex === items.length - 1}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-950 px-4 text-xs font-black text-white shadow-sm transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Дараах
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ReelActionButton({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      className="flex min-w-14 flex-col items-center justify-center gap-1 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:text-orange-600"
    >
      <Icon size={20} />
      <span className="text-[11px] font-black">{label}</span>
    </button>
  );
}

function OrganizationAboutPanel({
  organization,
}: {
  organization: {
    address: string;
    category: string;
    email: string;
    name: string;
    phone: string;
    shortDescription: string;
    status: string;
  };
}) {
  return (
    <section className="rounded-[24px] border border-white bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <h2 className="text-lg font-black text-slate-950">Тухай</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {organization.shortDescription}
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <InfoPill label="Нэр" value={organization.name} />
        <InfoPill label="Төрөл" value={organization.category} />
        <InfoPill label="Төлөв" value={organization.status} />
        <InfoPill label="Утас" value={organization.phone || "Оруулаагүй"} />
        <InfoPill label="И-мэйл" value={organization.email || "Оруулаагүй"} />
        <InfoPill label="Хаяг" value={organization.address || "Оруулаагүй"} />
      </div>
    </section>
  );
}

function ContentDateFilterControls({
  dateFrom,
  datePreset,
  dateTo,
  mobile = false,
  onDateFromChange,
  onDateToChange,
  onPresetChange,
}: {
  dateFrom: string;
  datePreset: DatePreset;
  dateTo: string;
  mobile?: boolean;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onPresetChange: (preset: Exclude<DatePreset, "custom">) => void;
}) {
  const presets: Array<{
    id: Exclude<DatePreset, "custom">;
    label: string;
  }> = [
    { id: "all", label: "Бүгд" },
    { id: "today", label: "Өнөөдөр" },
    { id: "7d", label: "7 хоног" },
    { id: "30d", label: "30 хоног" },
  ];

  return (
    <div className={mobile ? "space-y-4" : "contents"}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:flex-wrap">
        {presets.map((preset) => (
          <DatePresetButton
            key={preset.id}
            active={datePreset === preset.id}
            onClick={() => onPresetChange(preset.id)}
            mobile={mobile}
          >
            {preset.label}
          </DatePresetButton>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 xl:flex xl:flex-wrap">
        <DateInput
          label="Эхлэх"
          mobile={mobile}
          onChange={onDateFromChange}
          value={dateFrom}
        />
        <DateInput
          label="Дуусах"
          mobile={mobile}
          onChange={onDateToChange}
          value={dateTo}
        />
      </div>
    </div>
  );
}

function DateInput({
  label,
  mobile,
  onChange,
  value,
}: {
  label: string;
  mobile: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label
      className={`flex min-w-0 items-center gap-2 border border-slate-200 bg-slate-50 px-3 text-[10px] font-black uppercase tracking-[0.08em] text-slate-400 ${
        mobile ? "h-14 rounded-2xl" : "h-9 rounded-full"
      }`}
    >
      <span className="shrink-0">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[12px] font-black normal-case tracking-normal text-slate-700 outline-none"
      />
    </label>
  );
}

function DatePresetButton({
  active,
  children,
  mobile = false,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  mobile?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${mobile ? "h-12" : "h-9"} w-full rounded-full px-2 text-xs font-black transition xl:w-auto xl:px-3 ${
        active
          ? "bg-slate-950 text-white shadow-lg shadow-slate-900/10"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function TimelineContentCard({
  item,
  onDelete,
  onEdit,
  organizationLogo,
  organizationName,
}: {
  item: ManagedTimelineItem;
  onDelete: (item: ManagedTimelineItem) => void;
  onEdit: (item: ManagedTimelineItem) => void;
  organizationLogo: string;
  organizationName: string;
}) {
  if (item.kind === "reel") {
    return (
      <TimelineReelCard
        item={item}
        onDelete={() => onDelete(item)}
        onEdit={() => onEdit(item)}
        organizationLogo={organizationLogo}
        organizationName={organizationName}
      />
    );
  }

  const Icon =
    item.kind === "product"
      ? Boxes
      : item.kind === "service"
        ? Megaphone
        : Send;
  const label =
    item.kind === "product"
      ? "Бүтээгдэхүүн"
      : item.kind === "service"
        ? "Зар / үйлчилгээ"
        : "Пост";
  const actionText =
    item.kind === "product"
      ? "Бүтээгдэхүүн харах"
      : item.kind === "service"
        ? "Зарын дэлгэрэнгүй"
        : "";
  const content = (
    <article className="group rounded-[18px] border border-slate-100 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-orange-100 hover:shadow-[0_18px_52px_rgba(15,23,42,0.11)]">
      <TimelineCardHeader
        date={formatDate(item.createdAt) || "Огноогүй"}
        icon={Icon}
        label={label}
        logo={organizationLogo}
        meta={item.meta}
        name={organizationName}
        onDelete={() => onDelete(item)}
        onEdit={() => onEdit(item)}
      />

      <div className="px-3.5 pb-2.5 pt-0 sm:px-4 sm:pb-3">
        <h3 className="text-[17px] font-black leading-6 tracking-tight text-slate-950 sm:text-[19px]">
          {item.title}
        </h3>
        {item.description && (
          <p className="mt-1.5 whitespace-pre-line text-[12px] font-semibold leading-5 text-slate-600 sm:text-[13px]">
            {item.description}
          </p>
        )}
      </div>

      <TimelineCardMedia
        images={
          item.images.length ? item.images : item.image ? [item.image] : []
        }
      />

      <TimelineCardFooter
        actionText={"href" in item && item.href ? actionText : ""}
        href={"href" in item ? item.href : ""}
        label={label}
        stats={item.stats}
      />
    </article>
  );

  return content;
}

function TimelineReelCard({
  item,
  onDelete,
  onEdit,
  organizationLogo,
  organizationName,
}: {
  item: Extract<ManagedTimelineItem, { kind: "reel" }>;
  onDelete: () => void;
  onEdit: () => void;
  organizationLogo: string;
  organizationName: string;
}) {
  return (
    <article className="overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.09)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(15,23,42,0.13)]">
      <div className="flex items-center justify-between gap-3 px-3.5 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-[3px] ring-slate-50">
            <img
              src={organizationLogo}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">
              {organizationName}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-slate-400">
              {formatDate(item.createdAt) || "Огноогүй"} ·{" "}
              <Clapperboard size={12} /> Reel
            </p>
          </div>
        </div>
        <TimelineCardMenu onDelete={onDelete} onEdit={onEdit} />
      </div>

      <div className="px-3.5 pb-3 sm:px-4">
        <div className="relative mx-auto max-w-[420px] overflow-hidden rounded-[24px] bg-slate-950 shadow-[0_18px_48px_rgba(15,23,42,0.22)]">
          <video
            src={getMediaUrl(item.videoUrl)}
            poster={item.image ? getMediaUrl(item.image) : undefined}
            controls
            preload="metadata"
            className="block h-auto w-full bg-slate-950 object-contain"
            style={{ maxHeight: "min(720px, 72dvh)" }}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 via-black/10 to-transparent p-4 text-white">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/18 backdrop-blur">
                <Clapperboard size={16} />
              </span>
              <span className="text-xs font-black uppercase tracking-[0.12em]">
                Reel
              </span>
            </div>
          </div>
          {(item.title !== "Reel" || item.description) && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 text-white">
              {item.title !== "Reel" && (
                <h3 className="line-clamp-2 text-lg font-black leading-6">
                  {item.title}
                </h3>
              )}
              {item.description && (
                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-white/85">
                  {item.description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-3.5 py-2.5 sm:px-4">
        <span className="rounded-full bg-fuchsia-50 px-3 py-1.5 text-[11px] font-black text-fuchsia-600">
          Reel
        </span>
        {item.stats && (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-500">
            {item.stats}
          </span>
        )}
      </div>
    </article>
  );
}

function TimelineCardHeader({
  date,
  icon: Icon,
  label,
  logo,
  meta,
  name,
  onDelete,
  onEdit,
}: {
  date: string;
  icon: LucideIcon;
  label: string;
  logo: string;
  meta: string;
  name: string;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2.5 px-3.5 pb-2.5 pt-3.5 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-[3px] ring-slate-50">
          <img
            src={logo}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-400">
            <span>{date}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="inline-flex items-center gap-1">
              <Icon size={13} />
              {label}
            </span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-start justify-end gap-2">
        <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500 sm:inline-flex">
          {meta}
        </span>
        <TimelineCardMenu onDelete={onDelete} onEdit={onEdit} />
      </div>
    </div>
  );
}

function TimelineCardMenu({
  onDelete,
  onEdit,
}: {
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const closeMenu = () => setMenuOpen(false);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [menuOpen]);

  const editItem = () => {
    setMenuOpen(false);
    onEdit();
  };

  const deleteItem = () => {
    setMenuOpen(false);
    onDelete();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen((current) => !current);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
        aria-expanded={menuOpen}
        aria-label="Үйлдэл"
      >
        <MoreHorizontal size={19} />
      </button>
      {menuOpen && (
        <div
          className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-2xl border border-slate-100 bg-white p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.16)]"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={editItem}
            className="flex h-10 w-full items-center rounded-xl px-3 text-left text-sm font-black text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
          >
            Засах
          </button>
          <button
            type="button"
            onClick={deleteItem}
            className="flex h-10 w-full items-center rounded-xl px-3 text-left text-sm font-black text-red-600 transition hover:bg-red-50"
          >
            Устгах
          </button>
        </div>
      )}
    </div>
  );
}

function TimelineCardVideo({ poster, src }: { poster?: string; src: string }) {
  return (
    <div className="px-3.5 pb-3 sm:px-4">
      <div className="flex justify-center overflow-hidden rounded-[18px] bg-slate-950/5 p-2">
        <video
          src={getMediaUrl(src)}
          poster={poster ? getMediaUrl(poster) : undefined}
          controls
          preload="metadata"
          className="h-auto w-auto max-w-full rounded-[14px] bg-slate-950 object-contain"
          style={{ maxHeight: "min(620px, 68dvh)" }}
        />
      </div>
    </div>
  );
}

function TimelineCardMedia({ images }: { images: string[] }) {
  const [orientation, setOrientation] = useState<"landscape" | "portrait">(
    "landscape",
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const hasImages = images.length > 0;
  const hasMultipleImages = images.length > 1;
  const frameClass =
    orientation === "portrait"
      ? "h-[408px] max-h-[55dvh]"
      : hasImages
        ? "max-h-[312px]"
        : "aspect-[16/9] max-h-[210px] sm:max-h-[272px]";

  const scrollImage = (direction: -1 | 1) => {
    if (!hasMultipleImages) return;
    const next = Math.min(
      Math.max(activeIndex + direction, 0),
      images.length - 1,
    );
    setActiveIndex(next);
    scrollerRef.current?.children[next]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  const updateActiveIndex = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const next = Math.round(scroller.scrollLeft / scroller.clientWidth);
    setActiveIndex(Math.min(Math.max(next, 0), images.length - 1));
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [images.join("|")]);

  return (
    <div className="px-2.5 pb-2.5 sm:px-3">
      <div className="overflow-hidden rounded-[16px] border border-slate-100 bg-slate-100">
        <div
          className={`relative mx-auto flex w-full items-center justify-center overflow-hidden bg-slate-100 ${frameClass}`}
        >
          {hasImages ? (
            <>
              <div
                ref={scrollerRef}
                onScroll={updateActiveIndex}
                className="scrollbar-hide flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
              >
                {images.map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="relative flex w-full shrink-0 snap-center items-center justify-center overflow-hidden bg-slate-950/5"
                  >
                    <img
                      src={image}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full scale-105 object-cover opacity-20 blur-2xl"
                      referrerPolicy="no-referrer"
                    />
                    <img
                      src={image}
                      alt=""
                      className={`relative z-10 w-full object-contain ${
                        orientation === "portrait"
                          ? "max-h-[408px]"
                          : "max-h-[312px]"
                      }`}
                      referrerPolicy="no-referrer"
                      onLoad={(event) => {
                        if (index !== activeIndex) return;
                        const img = event.currentTarget;
                        setOrientation(
                          img.naturalHeight > img.naturalWidth
                            ? "portrait"
                            : "landscape",
                        );
                      }}
                    />
                  </div>
                ))}
              </div>

              {hasMultipleImages && (
                <>
                  <button
                    type="button"
                    onClick={() => scrollImage(-1)}
                    disabled={activeIndex === 0}
                    className="absolute left-2.5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg shadow-slate-950/10 transition hover:bg-white disabled:pointer-events-none disabled:opacity-35"
                    aria-label="Өмнөх зураг"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollImage(1)}
                    disabled={activeIndex === images.length - 1}
                    className="absolute right-2.5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg shadow-slate-950/10 transition hover:bg-white disabled:pointer-events-none disabled:opacity-35"
                    aria-label="Дараах зураг"
                  >
                    <ArrowRight size={20} />
                  </button>
                  <span className="absolute right-2.5 top-2.5 z-20 rounded-full bg-slate-950/75 px-2.5 py-1 text-[11px] font-black text-white">
                    {activeIndex + 1} / {images.length}
                  </span>
                  <div className="absolute bottom-2.5 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 rounded-full bg-slate-950/35 px-2 py-1 backdrop-blur-sm">
                    {images.map((image, index) => (
                      <button
                        key={`${image}-dot-${index}`}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={`h-1.5 rounded-full transition ${
                          activeIndex === index
                            ? "w-5 bg-white"
                            : "w-1.5 bg-white/55"
                        }`}
                        aria-label={`${index + 1}-р зураг`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-slate-300">
              <ImageIcon size={48} />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-slate-300">
                Зураггүй
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineCardFooter({
  actionText,
  href,
  label,
  stats,
}: {
  actionText: string;
  href: string;
  label: string;
  stats?: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        {stats && (
          <span className="rounded-full bg-orange-50 px-3 py-1.5 text-[11px] font-black text-orange-600">
            {stats}
          </span>
        )}
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-500">
          {label}
        </span>
      </div>
      {actionText && href && (
        <a
          href={href}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-[11px] font-black text-white shadow-lg shadow-slate-900/10 transition hover:bg-orange-600 sm:w-auto"
        >
          {actionText}
          <ArrowUpRight size={14} />
        </a>
      )}
    </div>
  );
}

function TimelineEditModal({
  authFetch,
  item,
  onClose,
  onSave,
}: {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  item: ManagedTimelineItem;
  onClose: () => void;
  onSave: (item: ManagedTimelineItem, form: TimelineEditForm) => Promise<void>;
}) {
  useLockBodyScroll();

  const [form, setForm] = useState<TimelineEditForm>({
    content: item.kind === "post" ? item.edit.content : "",
    description: item.kind !== "post" ? item.edit.description : "",
    images: item.kind !== "post" ? item.images : [],
    price: item.kind === "product" ? item.edit.price : "",
    priceText: item.kind === "service" ? item.edit.priceText : "",
    stock: item.kind === "product" ? item.edit.stock : "",
    title: item.kind !== "post" ? item.edit.title : item.title,
    type: item.kind === "post" ? item.edit.type : "GENERAL",
  });
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: keyof TimelineEditForm, value: string) => {
    setError("");
    setForm((current) => ({ ...current, [field]: value }));
  };

  const addImages = async (files: FileList | null) => {
    if (!files?.length || item.kind === "post" || imageUploading) return;
    setImageUploading(true);
    setError("");
    try {
      const uploadedUrls = await uploadProductImages({
        authFetch,
        files,
        remainingSlots: MAX_PRODUCT_IMAGES - form.images.length,
      });
      setForm((current) => ({
        ...current,
        images: [...current.images, ...uploadedUrls].slice(
          0,
          MAX_PRODUCT_IMAGES,
        ),
      }));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Зураг upload хийхэд алдаа гарлаа.",
      );
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = (image: string) => {
    setError("");
    setForm((current) => ({
      ...current,
      images: current.images.filter((item) => item !== image),
    }));
  };

  const save = async () => {
    if (item.kind === "post" && !form.content.trim()) {
      setError("Постын агуулга хоосон байж болохгүй.");
      return;
    }
    if (item.kind !== "post" && !form.title.trim()) {
      setError("Гарчиг хоосон байж болохгүй.");
      return;
    }
    if (item.kind === "product") {
      const price = Number(form.price || 0);
      const stock = Number(form.stock || 0);
      if (!Number.isFinite(price) || price < 0) {
        setError("Үнэ зөв тоо байх ёстой.");
        return;
      }
      if (!Number.isFinite(stock) || stock < 0) {
        setError("Нөөц зөв тоо байх ёстой.");
        return;
      }
    }

    setSaving(true);
    setError("");
    try {
      await onSave(item, form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Хадгалахад алдаа гарлаа.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center overflow-hidden overscroll-none bg-slate-950/55 px-3 py-6 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Засах цонх хаах"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_34px_120px_rgba(15,23,42,0.38)]">
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <h2 className="text-lg font-black text-slate-950">
            {item.kind === "product"
              ? "Бүтээгдэхүүн засах"
              : item.kind === "service"
                ? "Зар / үйлчилгээ засах"
                : item.kind === "reel"
                  ? "Reel засах"
                  : "Пост засах"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
            aria-label="Хаах"
          >
            <X size={22} />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain p-5">
          {item.kind === "post" ? (
            <div className="grid gap-3">
              <label>
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                  Постын төрөл
                </span>
                <select
                  value={form.type}
                  onChange={(event) => updateField("type", event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="GENERAL">Ерөнхий</option>
                  <option value="ANNOUNCEMENT">Мэдэгдэл</option>
                  <option value="PROMOTION">Урамшуулал</option>
                  <option value="UPDATE">Шинэчлэл</option>
                </select>
              </label>
              <TimelineTextarea
                label="Агуулга"
                value={form.content}
                onChange={(value) => updateField("content", value)}
              />
            </div>
          ) : item.kind === "reel" ? (
            <div className="grid gap-3">
              <TimelineInput
                label="Reel гарчиг"
                value={form.title}
                onChange={(value) => updateField("title", value)}
                wide
              />
              <TimelineTextarea
                label="Caption"
                value={form.description}
                onChange={(value) => updateField("description", value)}
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TimelineImageEditor
                  images={form.images}
                  uploading={imageUploading}
                  onAddImages={addImages}
                  onRemoveImage={removeImage}
                />
              </div>
              <TimelineInput
                label="Гарчиг"
                value={form.title}
                onChange={(value) => updateField("title", value)}
                wide
              />
              {item.kind === "product" ? (
                <>
                  <TimelineInput
                    label="Үнэ"
                    value={form.price}
                    inputMode="decimal"
                    onChange={(value) => updateField("price", value)}
                  />
                  <TimelineInput
                    label="Нөөц"
                    value={form.stock}
                    inputMode="numeric"
                    onChange={(value) => updateField("stock", value)}
                  />
                </>
              ) : (
                <TimelineInput
                  label="Үнэ / санал"
                  value={form.priceText}
                  onChange={(value) => updateField("priceText", value)}
                  wide
                />
              )}
              <TimelineTextarea
                label="Тайлбар"
                value={form.description}
                onChange={(value) => updateField("description", value)}
              />
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full border border-slate-200 bg-white px-6 text-sm font-black text-slate-600 transition hover:bg-slate-50"
          >
            Болих
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || imageUploading}
            className="h-11 rounded-full bg-orange-500 px-7 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {imageUploading
              ? "Зураг боловсруулж байна..."
              : saving
                ? "Хадгалж байна..."
                : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TimelineImageEditor({
  images,
  onAddImages,
  onRemoveImage,
  uploading,
}: {
  images: string[];
  onAddImages: (files: FileList | null) => void;
  onRemoveImage: (image: string) => void;
  uploading: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-black text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50">
          {uploading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <ImageIcon size={18} />
          )}
          {uploading ? "Боловсруулж байна..." : "Зураг оруулах"}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading || images.length >= MAX_PRODUCT_IMAGES}
            className="sr-only"
            onChange={(event) => {
              onAddImages(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        <p className="text-xs font-bold text-slate-500">
          {images.length}/5 зураг
        </p>
      </div>

      {images.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((image, index) => (
            <div
              key={`${image.slice(0, 48)}-${index}`}
              className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white bg-slate-100 shadow-sm"
            >
              <img
                src={image}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => onRemoveImage(image)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/75 text-xs font-black text-white opacity-100 transition hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="Зураг устгах"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineInput({
  inputMode,
  label,
  onChange,
  value,
  wide = false,
}: {
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  onChange: (value: string) => void;
  value: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
      />
    </label>
  );
}

function TimelineTextarea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="sm:col-span-2">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <textarea
        value={value}
        rows={5}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
      />
    </label>
  );
}

function getTimeValue(value?: string | Date) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function formatPrice(value: ManagedProduct["price"]) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Үнэ тохироогүй";
  return `${amount.toLocaleString("mn-MN")}₮`;
}

function formatDate(value?: string | Date) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("mn-MN", {
    month: "short",
    day: "numeric",
  });
}

function WidgetCard({
  action,
  children,
  className = "",
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section
      className={`rounded-[22px] border border-white bg-white p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:rounded-[24px] sm:p-5 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-slate-950 sm:text-base">
          {title}
        </h3>
        {action}
      </div>
      <div className="mt-3 sm:mt-4">{children}</div>
    </section>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-slate-100 bg-slate-50 px-3 py-2.5 sm:rounded-2xl sm:py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400 sm:tracking-[0.12em]">
        {label}
      </p>
      <p className="mt-1 truncate text-[13px] font-black text-slate-900 sm:text-sm">
        {value}
      </p>
    </div>
  );
}

function WidgetLink({
  href,
  icon: Icon,
  label,
  text,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  text: string;
}) {
  return (
    <a
      href={href}
      className="flex min-h-[86px] flex-col items-center justify-center gap-2 rounded-[18px] border border-slate-100 bg-slate-50 px-2 py-3 text-center transition hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50 sm:min-h-0 sm:flex-row sm:justify-between sm:gap-3 sm:px-3 sm:text-left"
    >
      <span className="flex min-w-0 flex-col items-center gap-2 sm:flex-row sm:gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm sm:h-10 sm:w-10">
          <Icon size={17} className="sm:h-[18px] sm:w-[18px]" />
        </span>
        <span className="min-w-0">
          <span className="block max-w-[76px] truncate text-[11px] font-black leading-tight text-slate-900 sm:max-w-none sm:text-sm">
            {label}
          </span>
          <span className="mt-0.5 hidden truncate text-xs font-bold text-slate-400 sm:block">
            {text}
          </span>
        </span>
      </span>
      <ArrowUpRight
        size={13}
        className="hidden shrink-0 text-slate-400 sm:block"
      />
    </a>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[86px] flex-col items-center justify-center gap-2 rounded-[18px] border border-slate-100 bg-slate-50 px-2 py-3 text-center sm:min-h-0 sm:flex-row sm:gap-3 sm:px-3 sm:text-left">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm sm:h-10 sm:w-10">
        <Icon size={17} className="sm:h-[18px] sm:w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block max-w-[76px] truncate text-xs font-black text-slate-950 sm:max-w-none sm:text-sm">
          {value}
        </span>
        <span className="block max-w-[76px] truncate text-[10px] font-bold text-slate-400 sm:max-w-none sm:text-xs">
          {label}
        </span>
      </span>
    </div>
  );
}

function ImageActionMenu({
  field,
  isOpen,
  label,
  onPreview,
  onToggle,
  onUpload,
  uploading,
  variant,
}: {
  field: "logoUrl" | "bannerUrl";
  isOpen: boolean;
  label: string;
  onPreview: () => void;
  onToggle: () => void;
  onUpload: (field: "logoUrl" | "bannerUrl", files: FileList | null) => void;
  uploading: boolean;
  variant: "avatar" | "cover";
}) {
  const position =
    variant === "cover"
      ? "absolute left-3 top-3 z-20 sm:bottom-4 sm:left-auto sm:right-4 sm:top-auto"
      : "absolute left-1/2 top-[calc(100%+8px)] z-40 w-48 -translate-x-1/2 sm:w-52";

  return (
    <div className={position}>
      {variant === "cover" && (
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-white/92 px-3 text-xs font-black text-slate-800 shadow-lg backdrop-blur transition hover:bg-white sm:h-10 sm:px-4 sm:text-sm"
        >
          <ImageIcon size={16} />
          <span className="hidden min-[380px]:inline">{label}</span>
          <span className="min-[380px]:hidden">Cover</span>
          <ChevronDown size={15} />
        </button>
      )}

      {isOpen && (
        <div
          className={`mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_18px_55px_rgba(15,23,42,0.20)] ${
            variant === "cover" ? "w-48 sm:w-56" : "w-full"
          }`}
        >
          <button
            type="button"
            onClick={onPreview}
            className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            <Eye size={16} />
            Зураг харах
          </button>
          <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
            <ImageIcon size={16} />
            {uploading ? "Сольж байна..." : "Зураг солих"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                void onUpload(field, event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}

function ImagePreviewModal({
  onClose,
  title,
  url,
}: {
  onClose: () => void;
  title: string;
  url: string;
}) {
  useLockBodyScroll();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center overflow-hidden overscroll-none bg-slate-950/80 px-3 py-6 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Зураг хаах"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-[0_34px_120px_rgba(0,0,0,0.55)]">
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <h2 className="truncate text-lg font-black text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Хаах"
          >
            <X size={22} />
          </button>
        </div>
        <div className="flex min-h-[360px] items-center justify-center bg-slate-900 p-3 sm:min-h-[520px]">
          <img
            src={url}
            alt=""
            className="max-h-[72vh] max-w-full rounded-2xl object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </div>
  );
}

function OrganizationProfileEditor({
  authFetch,
  initialForm,
  organizationId,
  onClose,
  onSaved,
}: {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  initialForm: OrgProfileFormState;
  organizationId: string;
  onClose: () => void;
  onSaved: (updated: Partial<ManagedOrgDetails>) => void;
}) {
  useLockBodyScroll();

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  const updateField = (field: keyof OrgProfileFormState, value: string) => {
    setMessage("");
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async () => {
    const cleanName = form.name.trim();
    const operatingYears = Number(form.operatingYears || 0);
    if (!cleanName) {
      setMessage("Байгууллагын нэр хоосон байж болохгүй.");
      return;
    }
    if (!Number.isFinite(operatingYears) || operatingYears < 0) {
      setMessage("Ажилласан жил зөв тоо байх ёстой.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const res = await authFetch(`${API}/partners/${organizationId}/profile`, {
        method: "PATCH",
        body: JSON.stringify({
          name: cleanName,
          address: form.address.trim() || null,
          shortDescription: form.shortDescription.trim() || null,
          description: form.description.trim() || null,
          openingHours: form.openingHours.trim() || null,
          operatingYears,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(
          data?.message || "Байгууллагын мэдээлэл хадгалахад алдаа гарлаа.",
        );
        return;
      }
      onSaved(data);
    } catch {
      setMessage("Байгууллагын мэдээлэл хадгалахад сүлжээний алдаа гарлаа.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center overflow-hidden overscroll-none bg-slate-950/55 px-3 py-6 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Засах modal хаах"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_34px_120px_rgba(15,23,42,0.38)]">
        <div className="flex h-16 items-center justify-center border-b border-slate-100 px-5">
          <h2 className="text-xl font-black text-slate-950">
            Байгууллагын мэдээлэл засах
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-3.5 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
            aria-label="Хаах"
          >
            <X size={22} />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileInput
              label="Байгууллагын нэр"
              value={form.name}
              onChange={(value) => updateField("name", value)}
            />
            <ProfileInput
              label="Ажилласан жил"
              value={form.operatingYears}
              inputMode="numeric"
              onChange={(value) => updateField("operatingYears", value)}
            />
            <VerifiedContactRow
              label="Утас"
              onRequest={() =>
                setMessage(
                  "Утас солих хүсэлт баталгаажуулалтын тусдаа урсгалаар явах ёстой.",
                )
              }
              value={form.phone || "Бүртгэлгүй"}
            />
            <VerifiedContactRow
              label="И-мэйл"
              onRequest={() =>
                setMessage(
                  "И-мэйл солих хүсэлт тухайн и-мэйлээр баталгаажсаны дараа хийгдэнэ.",
                )
              }
              value={form.email || "Бүртгэлгүй"}
            />
            <ProfileInput
              label="Хаяг"
              value={form.address}
              onChange={(value) => updateField("address", value)}
              wide
            />
            <ProfileInput
              label="Цагийн хуваарь"
              value={form.openingHours}
              placeholder="Жишээ: Даваа-Баасан 09:00-18:00"
              onChange={(value) => updateField("openingHours", value)}
              wide
            />
            <ProfileTextarea
              label="Товч тайлбар"
              value={form.shortDescription}
              onChange={(value) => updateField("shortDescription", value)}
            />
            <ProfileTextarea
              label="Дэлгэрэнгүй танилцуулга"
              value={form.description}
              onChange={(value) => updateField("description", value)}
            />
          </div>

          {message && (
            <p className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
              {message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full border border-slate-200 bg-white px-6 text-sm font-black text-slate-600 transition hover:bg-slate-50"
          >
            Болих
          </button>
          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="h-11 rounded-full bg-orange-500 px-7 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VerifiedContactRow({
  label,
  onRequest,
  value,
}: {
  label: string;
  onRequest: () => void;
  value: string;
}) {
  return (
    <div>
      <p className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">
              {value}
            </p>
            <p className="mt-1 text-[11px] font-bold leading-4 text-amber-700">
              Солихын тулд баталгаажуулалтын хүсэлт илгээнэ.
            </p>
          </div>
          <ShieldCheck size={18} className="shrink-0 text-amber-600" />
        </div>
        <button
          type="button"
          className="mt-3 h-9 w-full rounded-xl bg-white text-xs font-black text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
          onClick={onRequest}
        >
          Баталгаажуулж солих
        </button>
      </div>
    </div>
  );
}

function ProfileInput({
  inputMode,
  label,
  onChange,
  placeholder,
  value,
  wide = false,
}: {
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <input
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
      />
    </label>
  );
}

function ProfileTextarea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="sm:col-span-2">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <textarea
        value={value}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
      />
    </label>
  );
}

function OrganizationCreateHub({
  authFetch,
  createMode,
  message,
  name,
  onContentChanged,
  onModeChange,
  onPostTextChange,
  onPostTypeChange,
  onPostContactChange,
  onPostImagesChange,
  onPostLocationChange,
  onPostPromoChange,
  onPublishPost,
  postContact,
  postImages,
  postLocation,
  postPromo,
  postText,
  postType,
  posting,
  products,
  selectedOrganizationId,
}: {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  createMode: CreateMode;
  message: string;
  name: string;
  onContentChanged: () => Promise<void>;
  onModeChange: (mode: CreateMode) => void;
  onPostTextChange: (value: string) => void;
  onPostTypeChange: (value: string) => void;
  onPostContactChange: (value: string) => void;
  onPostImagesChange: (images: string[]) => void;
  onPostLocationChange: (value: string) => void;
  onPostPromoChange: (value: string) => void;
  onPublishPost: () => void;
  postContact: string;
  postImages: string[];
  postLocation: string;
  postPromo: string;
  postText: string;
  postType: string;
  posting: boolean;
  products: ManagedProduct[];
  selectedOrganizationId: string;
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [productForm, setProductForm] = useState<QuickProductFormState>({
    businessCategoryId: "",
    name: "",
    price: "",
    stock: "0",
    description: "",
    images: [] as string[],
    supplyType: "IN_STOCK",
    preorderPriceCurrency: "MNT",
    preorderPriceAmount: "",
    preorderLeadTimeDays: "14",
    preorderCapacity: "50",
    preorderNote: "",
  });
  const [productSaving, setProductSaving] = useState(false);
  const [productMessage, setProductMessage] = useState("");
  const [reelForm, setReelForm] = useState<ReelFormState>({
    linkMode: "store",
    productId: "",
    title: "",
    caption: "",
    tags: "",
    video: null,
  });
  const [reelSaving, setReelSaving] = useState(false);
  const [reelMessage, setReelMessage] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const modes = [
    ...(SHOW_POST_SECTION
      ? [
          {
            id: "post" as const,
            icon: Send,
            label: "Пост",
            tone: "text-rose-500 bg-rose-50",
          },
        ]
      : []),
    {
      id: "product" as const,
      icon: ImageIcon,
      label: "Бүтээгдэхүүн",
      tone: "text-emerald-600 bg-emerald-50",
    },
    {
      id: "reel" as const,
      icon: Clapperboard,
      label: "Reel",
      tone: "text-fuchsia-600 bg-fuchsia-50",
    },
  ];

  useLockBodyScroll(composerOpen);

  useEffect(() => {
    if (!composerOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setComposerOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [composerOpen]);

  useEffect(() => {
    if (!successToast) return;
    const timer = window.setTimeout(() => setSuccessToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [successToast]);

  const openComposer = (mode: CreateMode) => {
    const nextMode = !SHOW_POST_SECTION && mode === "post" ? "product" : mode;
    onModeChange(nextMode);
    setComposerOpen(true);
  };

  const updateProductField = (field: QuickProductTextField, value: string) => {
    setProductMessage("");
    setProductForm((current) => ({ ...current, [field]: value }));
  };

  const updateProductImages = (images: string[]) => {
    setProductMessage("");
    setProductForm((current) => ({ ...current, images }));
  };

  const createProduct = async () => {
    if (productSaving) return;
    const productName = productForm.name.trim();
    const isPreorder = productForm.supplyType === "CHINA_PREORDER";
    const price = Number(
      isPreorder ? productForm.preorderPriceAmount : productForm.price,
    );
    const stock = Number(productForm.stock || 0);

    if (!productName || !Number.isFinite(price) || price <= 0) {
      setProductMessage("Бүтээгдэхүүний нэр болон 0-ээс их үнэ оруулна уу.");
      return;
    }
    if (!productForm.businessCategoryId) {
      setProductMessage("Бүтээгдэхүүний ангилал сонгоно уу.");
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      setProductMessage("Нөөцийн тоо 0 эсвэл түүнээс их байх ёстой.");
      return;
    }
    const preorderCapacity = Number(productForm.preorderCapacity);
    const preorderLeadTimeDays = Number(productForm.preorderLeadTimeDays);
    if (
      isPreorder &&
      (!Number.isInteger(preorderCapacity) ||
        preorderCapacity < 1 ||
        preorderCapacity > 1_000_000)
    ) {
      setProductMessage("Захиалга дүүрэх хүний тоог зөв оруулна уу.");
      return;
    }
    if (
      isPreorder &&
      (!Number.isInteger(preorderLeadTimeDays) ||
        preorderLeadTimeDays < 0 ||
        preorderLeadTimeDays > 365)
    ) {
      setProductMessage("Ирэх хугацааг 0-365 хоногийн хооронд оруулна уу.");
      return;
    }

    setProductSaving(true);
    setProductMessage("");
    try {
      const res = await authFetch(`${API}/products`, {
        method: "POST",
        body: JSON.stringify({
          organizationId: selectedOrganizationId,
          businessCategoryId: productForm.businessCategoryId,
          name: productName,
          price,
          stock: isPreorder ? 0 : stock,
          description: productForm.description.trim() || undefined,
          images: productForm.images,
          supplyType: productForm.supplyType,
          preorderPriceCurrency: isPreorder
            ? productForm.preorderPriceCurrency
            : null,
          preorderPriceAmount: isPreorder ? price : null,
          preorderLeadTimeDays: isPreorder ? preorderLeadTimeDays : null,
          preorderCapacity: isPreorder ? preorderCapacity : null,
          preorderNote: isPreorder
            ? productForm.preorderNote.trim() || null
            : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProductMessage(
          data?.message || "Бүтээгдэхүүн хадгалахад алдаа гарлаа.",
        );
        return;
      }
      setProductForm({
        businessCategoryId: "",
        name: "",
        price: "",
        stock: "0",
        description: "",
        images: [],
        supplyType: "IN_STOCK",
        preorderPriceCurrency: "MNT",
        preorderPriceAmount: "",
        preorderLeadTimeDays: "14",
        preorderCapacity: "50",
        preorderNote: "",
      });
      setProductMessage("Бүтээгдэхүүн амжилттай нэмэгдлээ.");
      await onContentChanged();
    } catch {
      setProductMessage("Сүлжээний алдаа гарлаа.");
    } finally {
      setProductSaving(false);
    }
  };

  const updateReelField = <K extends keyof ReelFormState>(
    field: K,
    value: ReelFormState[K],
  ) => {
    setReelMessage("");
    setReelForm((current) => ({ ...current, [field]: value }));
  };

  const createReel = async () => {
    if (reelSaving) return;
    if (!reelForm.video) {
      setReelMessage("Reel video файл сонгоно уу.");
      return;
    }
    if (reelForm.linkMode === "product" && !reelForm.productId) {
      setReelMessage(
        "Бүтээгдэхүүнтэй reel бол холбох бүтээгдэхүүнээ сонгоно уу.",
      );
      return;
    }

    const formData = new FormData();
    formData.set("organizationId", selectedOrganizationId);
    formData.set("title", reelForm.title.trim());
    formData.set("caption", reelForm.caption.trim());
    formData.set("tags", reelForm.tags.trim());
    if (reelForm.productId) formData.set("productId", reelForm.productId);
    formData.set("video", reelForm.video);

    setReelSaving(true);
    setReelMessage("");
    try {
      const res = await authFetch(`${API}/reels`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReelMessage(data?.message || "Reel upload хийхэд алдаа гарлаа.");
        return;
      }
      setReelForm({
        linkMode: "store",
        productId: "",
        title: "",
        caption: "",
        tags: "",
        video: null,
      });
      setReelMessage("");
      await onContentChanged();
      setComposerOpen(false);
      setSuccessToast(
        "Reel орлоо. Store дээр харагдах жагсаалт руу нэмэгдлээ.",
      );
    } catch {
      setReelMessage("Сүлжээний алдаа гарлаа.");
    } finally {
      setReelSaving(false);
    }
  };

  return (
    <>
      {successToast && (
        <div className="fixed bottom-24 left-1/2 z-[170] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-[22px] border border-emerald-100 bg-white px-4 py-3 shadow-[0_20px_70px_rgba(15,23,42,0.18)] sm:bottom-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={21} />
            </span>
            <p className="text-sm font-black leading-5 text-slate-900">
              {successToast}
            </p>
          </div>
        </div>
      )}

      <section className="rounded-[24px] border border-white bg-white p-3 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-sm font-black text-white ring-4 ring-slate-100">
            {getInitials(name)}
          </div>

          <button
            type="button"
            onClick={() => openComposer("product")}
            className="min-w-0 flex-1 rounded-full bg-slate-100 px-5 py-3.5 text-left text-sm font-black text-slate-500 transition hover:bg-slate-200 sm:text-base"
          >
            Бүтээгдэхүүн эсвэл Reel нэмэх
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            {modes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => openComposer(mode.id)}
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl transition hover:-translate-y-0.5 ${
                    createMode === mode.id
                      ? mode.tone
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                  title={mode.label}
                >
                  <Icon size={22} />
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={`mt-3 grid gap-2 ${
            SHOW_POST_SECTION ? "grid-cols-3" : "grid-cols-2"
          }`}
        >
          {modes.map((mode) => {
            const Icon = mode.icon;
            const active = createMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => openComposer(mode.id)}
                className={`inline-flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-black transition sm:h-10 sm:flex-row sm:gap-2 sm:rounded-full sm:text-sm ${
                  active
                    ? "bg-slate-950 text-white shadow-lg shadow-slate-900/10"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                <Icon size={16} />
                <span className="w-full truncate text-center sm:w-auto">
                  {mode.label}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 hidden px-1 text-xs font-bold text-slate-400 sm:block">
          Бүтээгдэхүүн эсвэл Reel оруулахдаа дээрээс сонгоно.
        </p>

        {composerOpen && (
          <CreateContentModal
            authFetch={authFetch}
            createMode={createMode}
            message={message}
            modes={modes}
            name={name}
            onClose={() => setComposerOpen(false)}
            onModeChange={onModeChange}
            onPostTextChange={onPostTextChange}
            onPostTypeChange={onPostTypeChange}
            onPostContactChange={onPostContactChange}
            onPostImagesChange={onPostImagesChange}
            onPostLocationChange={onPostLocationChange}
            onPostPromoChange={onPostPromoChange}
            onPublishPost={onPublishPost}
            postContact={postContact}
            postImages={postImages}
            postLocation={postLocation}
            postPromo={postPromo}
            postText={postText}
            postType={postType}
            posting={posting}
            productForm={productForm}
            productMessage={productMessage}
            productSaving={productSaving}
            reelForm={reelForm}
            reelMessage={reelMessage}
            reelSaving={reelSaving}
            products={productListForReels(products)}
            onCreateProduct={createProduct}
            onCreateReel={createReel}
            onProductFieldChange={updateProductField}
            onProductImagesChange={updateProductImages}
            onReelFieldChange={updateReelField}
          />
        )}
      </section>
    </>
  );
}

function CreateContentModal({
  authFetch,
  createMode,
  message,
  modes,
  name,
  onClose,
  onCreateProduct,
  onCreateReel,
  onPostContactChange,
  onPostImagesChange,
  onPostLocationChange,
  onPostPromoChange,
  onModeChange,
  onPostTextChange,
  onPostTypeChange,
  onProductFieldChange,
  onProductImagesChange,
  onReelFieldChange,
  onPublishPost,
  postText,
  postContact,
  postImages,
  postLocation,
  postPromo,
  postType,
  posting,
  productForm,
  productMessage,
  productSaving,
  products,
  reelForm,
  reelMessage,
  reelSaving,
}: {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  createMode: CreateMode;
  message: string;
  modes: Array<{
    id: CreateMode;
    icon: typeof Send;
    label: string;
    tone: string;
  }>;
  name: string;
  onClose: () => void;
  onCreateProduct: () => void;
  onCreateReel: () => void;
  onModeChange: (mode: CreateMode) => void;
  onPostContactChange: (value: string) => void;
  onPostImagesChange: (images: string[]) => void;
  onPostLocationChange: (value: string) => void;
  onPostPromoChange: (value: string) => void;
  onPostTextChange: (value: string) => void;
  onPostTypeChange: (value: string) => void;
  onProductFieldChange: (field: QuickProductTextField, value: string) => void;
  onProductImagesChange: (images: string[]) => void;
  onReelFieldChange: <K extends keyof ReelFormState>(
    field: K,
    value: ReelFormState[K],
  ) => void;
  onPublishPost: () => void;
  postContact: string;
  postImages: string[];
  postLocation: string;
  postPromo: string;
  postText: string;
  postType: string;
  posting: boolean;
  productForm: QuickProductFormState;
  productMessage: string;
  productSaving: boolean;
  products: Array<{ id: string; label: string; meta: string }>;
  reelForm: ReelFormState;
  reelMessage: string;
  reelSaving: boolean;
}) {
  const title =
    createMode === "post"
      ? "Пост үүсгэх"
      : createMode === "product"
        ? "Бүтээгдэхүүн оруулах"
        : "Reel оруулах";
  const isPostMode = createMode === "post";
  const canPublishPost = Boolean(
    postText.trim() ||
    postImages.length ||
    postContact.trim() ||
    postLocation.trim() ||
    postPromo.trim(),
  );
  const [activePostTool, setActivePostTool] = useState<
    "images" | "contact" | "location" | "promo" | null
  >(null);

  const addPostImages = async (files: FileList | null) => {
    if (!files?.length) return;

    const selected = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, Math.max(0, 10 - postImages.length));

    const dataUrls = await Promise.all(
      selected.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          }),
      ),
    );

    onPostImagesChange([...postImages, ...dataUrls].slice(0, 10));
    setActivePostTool("images");
  };

  const removePostImage = (image: string) => {
    onPostImagesChange(postImages.filter((item) => item !== image));
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-start justify-center overflow-hidden overscroll-none bg-slate-950/55 px-0 py-0 backdrop-blur-sm sm:px-3 sm:py-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Composer хаах"
        onClick={onClose}
      />
      <div
        onWheel={(event) => event.stopPropagation()}
        className={`relative flex w-full flex-col overflow-hidden border border-white/80 bg-white shadow-[0_34px_120px_rgba(15,23,42,0.38)] ${
          isPostMode
            ? "h-[100dvh] max-w-none rounded-none sm:h-[calc(100dvh-3rem)] sm:max-w-2xl sm:rounded-[24px]"
            : "h-[100dvh] max-w-3xl rounded-none sm:h-[calc(100dvh-3rem)] sm:rounded-[28px]"
        }`}
      >
        <div
          className={`flex h-[60px] shrink-0 items-center border-b border-slate-100 px-4 ${
            isPostMode ? "justify-between" : "justify-center px-5"
          }`}
        >
          {isPostMode ? (
            <button
              type="button"
              onClick={onClose}
              className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
              aria-label="Буцах"
            >
              <ArrowLeft size={24} />
            </button>
          ) : null}
          <h2
            className={`font-black text-slate-950 ${
              isPostMode ? "text-lg" : "text-xl"
            }`}
          >
            {isPostMode ? "Пост нийтлэх" : title}
          </h2>
          {isPostMode ? (
            <button
              type="button"
              onClick={onPublishPost}
              disabled={!canPublishPost || posting}
              className="rounded-full px-2 py-1 text-sm font-black text-orange-600 transition hover:bg-orange-50 disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              {posting ? "НИЙТЭЛЖ..." : "НИЙТЛЭХ"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className={`absolute right-4 top-3.5 h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 ${
              isPostMode ? "hidden" : "flex"
            }`}
            aria-label="Хаах"
          >
            <X size={22} />
          </button>
        </div>

        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${
            isPostMode ? "flex-1 p-0" : "p-4 sm:p-5"
          }`}
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
            <div
              className={`flex shrink-0 items-center justify-center rounded-full bg-slate-950 font-black text-white ${
                isPostMode ? "h-14 w-14 text-base" : "h-12 w-12 text-sm"
              }`}
            >
              {getInitials(name)}
            </div>
            <div className="min-w-0">
              <p
                className={`truncate font-black text-slate-950 ${
                  isPostMode ? "text-lg" : "text-base"
                }`}
              >
                {name}
              </p>
              <button
                type="button"
                className={`mt-1 inline-flex items-center gap-1.5 bg-slate-100 font-black text-slate-600 ${
                  isPostMode
                    ? "h-9 rounded-2xl px-3 text-xs"
                    : "h-8 rounded-xl px-3 text-xs"
                }`}
              >
                <Globe2 size={14} />
                Нийтэд
                <ChevronDown size={14} />
              </button>
            </div>
          </div>

          {!isPostMode && (
            <section className="mt-4" aria-labelledby="create-mode-title">
              <div className="mb-2 flex items-center justify-between">
                <p
                  id="create-mode-title"
                  className="text-xs font-black uppercase tracking-[0.1em] text-slate-500"
                >
                  Оруулах төрөл
                </p>
                <span className="text-[11px] font-bold text-slate-400 sm:hidden">
                  Нэгийг сонгоно уу
                </span>
              </div>
              <div
                className={`grid grid-cols-2 gap-2 ${
                  SHOW_POST_SECTION ? "sm:grid-cols-3" : "sm:grid-cols-2"
                }`}
              >
                {modes.map((mode) => {
                  const Icon = mode.icon;
                  const active = createMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onModeChange(mode.id)}
                      className={`group inline-flex min-h-12 items-center justify-start gap-2.5 rounded-2xl border px-3 text-left text-sm font-black transition sm:h-11 sm:min-h-0 sm:justify-center sm:px-2 ${
                        active
                          ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-900/15"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition sm:h-auto sm:w-auto ${
                          active
                            ? "bg-white/15 text-white"
                            : `${mode.tone} group-hover:scale-105`
                        }`}
                      >
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0 truncate">{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {createMode === "post" && (
            <div className="space-y-4 bg-slate-50 p-4">
              <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      Нийтлэлийн агуулга
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-slate-400">
                      Хэрэглэгчид харагдах үндсэн текст
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500">
                    {postText.length}/1200
                  </span>
                </div>
                <textarea
                  value={postText}
                  onChange={(event) => onPostTextChange(event.target.value)}
                  placeholder={`${name}-ийн шинэ мэдээлэл, санал эсвэл зарлалаа бичнэ үү...`}
                  rows={7}
                  maxLength={1200}
                  className="min-h-[190px] w-full resize-none rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-base font-bold leading-7 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
                />
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      Нийтлэлийн тохиргоо
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-slate-400">
                      Page дээр гарах төрөл, нэмэлт мэдээлэл
                    </p>
                  </div>
                  <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-600">
                    Нийтэд
                  </span>
                </div>

                <label className="relative block">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                    Ангилал
                  </span>
                  <select
                    value={postType}
                    onChange={(event) => onPostTypeChange(event.target.value)}
                    className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm font-black text-slate-600 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="GENERAL">Ерөнхий пост</option>
                    <option value="ANNOUNCEMENT">Мэдэгдэл</option>
                    <option value="PROMOTION">Урамшуулал</option>
                    <option value="UPDATE">Шинэ мэдээлэл</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-[38px] text-slate-400"
                  />
                </label>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3">
                  <p className="text-sm font-black text-slate-950">
                    Бизнес мэдээлэл нэмэх
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-slate-400">
                    Сонгосон мэдээлэл постын агуулгад нэгтгэгдэнэ
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <PostComposerAction
                    active={activePostTool === "images"}
                    icon={ImageIcon}
                    label="Зураг"
                    onClick={() =>
                      setActivePostTool((current) =>
                        current === "images" ? null : "images",
                      )
                    }
                    tone="text-lime-600"
                  />
                  <PostComposerAction
                    active={activePostTool === "contact"}
                    icon={Phone}
                    label="Холбоо барих"
                    onClick={() =>
                      setActivePostTool((current) =>
                        current === "contact" ? null : "contact",
                      )
                    }
                    tone="text-blue-500"
                  />
                  <PostComposerAction
                    active={activePostTool === "location"}
                    icon={MapPin}
                    label="Байршил"
                    onClick={() =>
                      setActivePostTool((current) =>
                        current === "location" ? null : "location",
                      )
                    }
                    tone="text-red-500"
                  />
                  <PostComposerAction
                    active={activePostTool === "promo"}
                    icon={Megaphone}
                    label="Урамшуулал"
                    onClick={() =>
                      setActivePostTool((current) =>
                        current === "promo" ? null : "promo",
                      )
                    }
                    tone="text-amber-500"
                  />
                </div>
              </section>

              {activePostTool && (
                <PostToolPanel
                  activeTool={activePostTool}
                  contact={postContact}
                  images={postImages}
                  location={postLocation}
                  onAddImages={addPostImages}
                  onContactChange={onPostContactChange}
                  onLocationChange={onPostLocationChange}
                  onPromoChange={onPostPromoChange}
                  onRemoveImage={removePostImage}
                  onTypeChange={onPostTypeChange}
                  promo={postPromo}
                />
              )}

              {(postImages.length > 0 ||
                postContact ||
                postLocation ||
                postPromo) && (
                <section className="rounded-[24px] border border-orange-100 bg-orange-50 p-4">
                  <p className="text-sm font-black text-orange-700">
                    Нэмэгдсэн мэдээлэл
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {postImages.length > 0 && (
                      <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700">
                        {postImages.length} зураг
                      </span>
                    )}
                    {postContact && (
                      <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700">
                        Холбоо барих
                      </span>
                    )}
                    {postLocation && (
                      <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700">
                        Байршил
                      </span>
                    )}
                    {postPromo && (
                      <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700">
                        Урамшуулал
                      </span>
                    )}
                  </div>
                </section>
              )}

              <p
                className={`text-xs font-bold ${
                  message.includes("нийтлэгдлээ")
                    ? "text-emerald-700"
                    : "text-slate-400"
                }`}
              >
                {message || "Байгууллагын page дээр нийтэд харагдана"}
              </p>
            </div>
          )}

          {createMode === "product" && (
            <QuickProductForm
              authFetch={authFetch}
              form={productForm}
              message={productMessage}
              onCreate={onCreateProduct}
              onFieldChange={onProductFieldChange}
              onImagesChange={onProductImagesChange}
              saving={productSaving}
            />
          )}

          {createMode === "reel" && (
            <QuickReelForm
              form={reelForm}
              message={reelMessage}
              onCreate={onCreateReel}
              onFieldChange={onReelFieldChange}
              products={products}
              saving={reelSaving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PostComposerAction({
  active,
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[92px] w-full flex-col items-start justify-between rounded-2xl border px-3 py-3 text-left text-sm font-black transition ${
        active
          ? "border-orange-200 bg-orange-50 text-slate-950 shadow-sm"
          : "border-slate-100 bg-slate-50 text-slate-700 hover:border-orange-100 hover:bg-orange-50 hover:text-slate-950"
      }`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
        <Icon size={22} className={tone} />
      </span>
      <span>{label}</span>
    </button>
  );
}

function PostToolPanel({
  activeTool,
  contact,
  images,
  location,
  onAddImages,
  onContactChange,
  onLocationChange,
  onPromoChange,
  onRemoveImage,
  onTypeChange,
  promo,
}: {
  activeTool: "images" | "contact" | "location" | "promo";
  contact: string;
  images: string[];
  location: string;
  onAddImages: (files: FileList | null) => void;
  onContactChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onPromoChange: (value: string) => void;
  onRemoveImage: (image: string) => void;
  onTypeChange: (value: string) => void;
  promo: string;
}) {
  if (activeTool === "images") {
    return (
      <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-lime-200 bg-white px-4 text-sm font-black text-lime-700 shadow-sm transition hover:bg-lime-50">
            <ImageIcon size={18} />
            Зураг сонгох
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(event) => {
                void onAddImages(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          <p className="text-xs font-bold text-slate-500">
            {images.length}/10 зураг
          </p>
        </div>
        {images.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {images.map((image, index) => (
              <div
                key={`${image.slice(0, 40)}-${index}`}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white bg-slate-100 shadow-sm"
              >
                <img
                  src={image}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage(image)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/75 text-xs font-black text-white hover:bg-red-600"
                  aria-label="Зураг устгах"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeTool === "contact") {
    return (
      <PostToolInput
        label="Пост дээр харагдах холбоо барих мэдээлэл"
        onChange={onContactChange}
        placeholder="Жишээ: 89123581, info@mglstore.mn"
        value={contact}
      />
    );
  }

  if (activeTool === "location") {
    return (
      <PostToolInput
        label="Байршил / салбар"
        onChange={onLocationChange}
        placeholder="Жишээ: Улаанбаатар, Хан-Уул, 120 мянгат"
        value={location}
      />
    );
  }

  if (activeTool === "promo") {
    return (
      <PostToolInput
        label="Урамшуулал / онцлох мэдээлэл"
        onChange={(value) => {
          onPromoChange(value);
          if (value.trim()) onTypeChange("PROMOTION");
        }}
        placeholder="Жишээ: Энэ 7 хоногт хүргэлт үнэгүй"
        value={promo}
      />
    );
  }

  return null;
}

function PostToolInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block rounded-[20px] border border-slate-200 bg-slate-50 p-3">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
      />
    </label>
  );
}

function QuickReelForm({
  form,
  message,
  onCreate,
  onFieldChange,
  products,
  saving,
}: {
  form: ReelFormState;
  message: string;
  onCreate: () => void;
  onFieldChange: <K extends keyof ReelFormState>(
    field: K,
    value: ReelFormState[K],
  ) => void;
  products: Array<{ id: string; label: string; meta: string }>;
  saving: boolean;
}) {
  const success = message.includes("амжилттай");
  const selectedProduct = products.find(
    (product) => product.id === form.productId,
  );
  const requiresProduct = form.linkMode === "product";
  const uploadDisabled =
    saving || !form.video || (requiresProduct && !form.productId);
  const previewUrl = useMemo(
    () => (form.video ? URL.createObjectURL(form.video) : ""),
    [form.video],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="mt-4 overflow-hidden rounded-[24px] border border-fuchsia-100 bg-white shadow-sm">
      <div className="border-b border-fuchsia-100 bg-gradient-to-r from-fuchsia-50 via-white to-orange-50 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20">
            <Film size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-base font-black text-slate-950">
              Shop reel оруулах
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
              Reel-ээ дэлгүүрийн ерөнхий танилцуулга эсвэл тодорхой
              бүтээгдэхүүний худалдааны video болгож холбоно.
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] font-black text-slate-500">
          <span className="rounded-2xl bg-white px-3 py-2 ring-1 ring-fuchsia-100">
            1. Холбох төрөл
          </span>
          <span className="rounded-2xl bg-white px-3 py-2 ring-1 ring-fuchsia-100">
            2. Мэдээлэл
          </span>
          <span className="rounded-2xl bg-white px-3 py-2 ring-1 ring-fuchsia-100">
            3. Video
          </span>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4 p-4">
          <section>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Холбох төрөл
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  onFieldChange("linkMode", "store");
                  onFieldChange("productId", "");
                }}
                className={`rounded-[20px] border p-3 text-left transition ${
                  form.linkMode === "store"
                    ? "border-fuchsia-300 bg-fuchsia-50 shadow-sm ring-4 ring-fuchsia-100"
                    : "border-slate-200 bg-white hover:border-fuchsia-200"
                }`}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-black text-slate-950">
                  <span className="flex items-center gap-2">
                    <Store size={17} className="text-fuchsia-600" />
                    Ерөнхий shop reel
                  </span>
                  {form.linkMode === "store" && (
                    <CheckCircle2 size={17} className="text-fuchsia-600" />
                  )}
                </span>
                <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">
                  Байгууллагын дэлгүүр, үйлчилгээ рүү чиглүүлнэ.
                </span>
              </button>
              <button
                type="button"
                onClick={() => onFieldChange("linkMode", "product")}
                className={`rounded-[20px] border p-3 text-left transition ${
                  form.linkMode === "product"
                    ? "border-fuchsia-300 bg-fuchsia-50 shadow-sm ring-4 ring-fuchsia-100"
                    : "border-slate-200 bg-white hover:border-fuchsia-200"
                }`}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-black text-slate-950">
                  <span className="flex items-center gap-2">
                    <Boxes size={17} className="text-fuchsia-600" />
                    Бүтээгдэхүүнтэй reel
                  </span>
                  {form.linkMode === "product" && (
                    <CheckCircle2 size={17} className="text-fuchsia-600" />
                  )}
                </span>
                <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">
                  Барааны card гарч, дарахад detail хуудас нээгдэнэ.
                </span>
              </button>
            </div>
          </section>

          {requiresProduct && (
            <section className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                  Холбох бүтээгдэхүүн
                </span>
                <select
                  value={form.productId}
                  onChange={(event) =>
                    onFieldChange("productId", event.target.value)
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-fuchsia-300 focus:ring-4 focus:ring-fuchsia-100"
                >
                  <option value="">Бүтээгдэхүүн сонгох</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.label}
                      {product.meta ? ` · ${product.meta}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                {products.length
                  ? "Сонгосон бараа reel дээр card байдлаар харагдаж, хэрэглэгч дарахад бүтээгдэхүүний detail хуудас нээгдэнэ."
                  : "Эхлээд бүтээгдэхүүн нэмсний дараа reel-тэй холбож болно."}
              </p>
              {selectedProduct && (
                <div className="mt-3 rounded-2xl border border-fuchsia-100 bg-white p-3">
                  <p className="text-sm font-black text-slate-950">
                    {selectedProduct.label}
                  </p>
                  {selectedProduct.meta && (
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {selectedProduct.meta}
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                Reel гарчиг
              </span>
              <input
                value={form.title}
                onChange={(event) => onFieldChange("title", event.target.value)}
                placeholder="Жишээ: Шинэ барааны танилцуулга"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-fuchsia-300 focus:ring-4 focus:ring-fuchsia-100"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                Tags
              </span>
              <input
                value={form.tags}
                onChange={(event) => onFieldChange("tags", event.target.value)}
                placeholder="sale, food, new"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-fuchsia-300 focus:ring-4 focus:ring-fuchsia-100"
              />
            </label>
          </section>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
              Caption
            </span>
            <textarea
              value={form.caption}
              onChange={(event) => onFieldChange("caption", event.target.value)}
              placeholder="Reel дээр харагдах богино тайлбар..."
              rows={3}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-fuchsia-300 focus:ring-4 focus:ring-fuchsia-100"
            />
          </label>

          <section>
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
              Video файл
            </span>
            <label className="flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed border-fuchsia-300 bg-fuchsia-50/60 px-4 py-5 text-center transition hover:border-fuchsia-400 hover:bg-fuchsia-50">
              <Upload size={24} className="text-fuchsia-600" />
              <span className="mt-2 text-sm font-black text-slate-950">
                {form.video
                  ? form.video.name
                  : "Video сонгох эсвэл дахин сонгох"}
              </span>
              <span className="mt-1 text-xs font-bold text-slate-500">
                MP4, WebM, MOV файл
              </span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
                className="sr-only"
                onChange={(event) => {
                  onFieldChange("video", event.target.files?.[0] || null);
                  event.target.value = "";
                }}
              />
            </label>
          </section>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p
              className={`text-xs font-bold ${
                success
                  ? "text-emerald-700"
                  : message
                    ? "text-rose-600"
                    : "text-slate-500"
              }`}
            >
              {message ||
                "Reel upload хийсний дараа store-ийн reel жагсаалт руу нэмэгдэнэ."}
            </p>
            <button
              type="button"
              onClick={onCreate}
              disabled={uploadDisabled}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-fuchsia-600 px-5 text-sm font-black text-white shadow-lg shadow-fuchsia-500/20 transition hover:-translate-y-0.5 hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 sm:w-auto sm:min-w-44"
            >
              <PlusCircle size={17} />
              {saving ? "Upload хийж байна..." : "Reel оруулах"}
            </button>
          </div>
        </div>

        <aside className="border-t border-slate-100 bg-slate-950 p-4 text-white lg:border-l lg:border-t-0">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black">Preview</p>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-white/70">
              {requiresProduct ? "Product reel" : "Store reel"}
            </span>
          </div>
          <div className="mx-auto aspect-[9/16] max-h-[440px] overflow-hidden rounded-[28px] bg-black ring-1 ring-white/10">
            {previewUrl ? (
              <video
                src={previewUrl}
                controls
                className="h-full w-full bg-black object-contain"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <Clapperboard size={34} className="text-white/35" />
                <p className="mt-3 text-sm font-black text-white/80">
                  Video preview
                </p>
                <p className="mt-1 text-xs font-bold leading-5 text-white/45">
                  Сонгосон reel энд vertical байдлаар харагдана.
                </p>
              </div>
            )}
          </div>
          <div className="mt-3 rounded-2xl bg-white/10 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-black text-slate-950">
                {requiresProduct ? "P" : "S"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black">
                  {form.title.trim() ||
                    (requiresProduct
                      ? selectedProduct?.label || "Бүтээгдэхүүний reel"
                      : "Дэлгүүрийн reel")}
                </p>
                <p className="truncate text-xs font-bold text-white/50">
                  {requiresProduct
                    ? selectedProduct?.meta || "Бүтээгдэхүүн сонгоно"
                    : "Дэлгүүр рүү чиглүүлнэ"}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function QuickProductForm({
  authFetch,
  form,
  message,
  onCreate,
  onFieldChange,
  onImagesChange,
  saving,
}: {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  form: QuickProductFormState;
  message: string;
  onCreate: () => void;
  onFieldChange: (field: QuickProductTextField, value: string) => void;
  onImagesChange: (images: string[]) => void;
  saving: boolean;
}) {
  const success = message.includes("амжилттай");
  const [imageUploading, setImageUploading] = useState(false);

  return (
    <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <ProductImageUploader
        authFetch={authFetch}
        images={form.images}
        onImagesChange={onImagesChange}
        onUploadingChange={setImageUploading}
      />

      <ProductCategorySelect
        authFetch={authFetch}
        value={form.businessCategoryId}
        onChange={(value) => onFieldChange("businessCategoryId", value)}
      />

      <QuickProductSupplyFields
        authFetch={authFetch}
        values={form}
        onChange={(field, value) => onFieldChange(field, value)}
      />

      <div
        className={`mt-3 grid gap-3 ${
          form.supplyType === "IN_STOCK"
            ? "lg:grid-cols-[minmax(0,1fr)_176px_144px]"
            : "grid-cols-1"
        }`}
      >
        <label className="min-w-0 flex-1">
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
            Бүтээгдэхүүний нэр
          </span>
          <input
            value={form.name}
            onChange={(event) => onFieldChange("name", event.target.value)}
            placeholder="Жишээ: Дулаан барьдаг шүгээ"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
          />
        </label>

        {form.supplyType === "IN_STOCK" && (
          <>
            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                Борлуулах үнэ (₮)
              </span>
              <input
                value={form.price}
                onChange={(event) => onFieldChange("price", event.target.value)}
                inputMode="decimal"
                placeholder="Жишээ: 25,000"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                Бэлэн нөөц
              </span>
              <input
                value={form.stock}
                onChange={(event) => onFieldChange("stock", event.target.value)}
                inputMode="numeric"
                placeholder="0"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
          </>
        )}
      </div>

      <label className="mt-3 block">
        <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
          Тайлбар
        </span>
        <textarea
          value={form.description}
          onChange={(event) => onFieldChange("description", event.target.value)}
          placeholder="Бүтээгдэхүүний богино тайлбар..."
          rows={2}
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onCreate}
          disabled={
            saving ||
            imageUploading ||
            !form.businessCategoryId ||
            !form.name.trim() ||
            !(form.supplyType === "CHINA_PREORDER"
              ? form.preorderPriceAmount.trim()
              : form.price.trim())
          }
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 sm:w-auto sm:min-w-40"
        >
          <PlusCircle size={17} />
          {imageUploading
            ? "Зураг боловсруулж байна..."
            : saving
              ? "Хадгалж..."
              : "Оруулах"}
        </button>
      </div>

      <p
        className={`mt-3 text-xs font-bold ${
          success ? "text-emerald-700" : "text-slate-500"
        }`}
      >
        {message ||
          (form.supplyType === "CHINA_PREORDER"
            ? "Захиалгын үнэ сервер дээр дахин ханшаар баталгаажиж, төгрөгөөр хадгалагдана."
            : "Barcode шаардлагагүй. Нэр, үнэ, нөөцөөр шууд нэмнэ.")}
      </p>
    </div>
  );
}

function ProductImageUploader({
  authFetch,
  images,
  onImagesChange,
  onUploadingChange,
}: {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  images: string[];
  onImagesChange: (images: string[]) => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const canAddMore = images.length < MAX_PRODUCT_IMAGES;

  const addImages = async (files: FileList | null) => {
    if (!files?.length || !canAddMore || uploading) return;
    setUploading(true);
    onUploadingChange(true);
    setUploadError("");
    try {
      const uploadedUrls = await uploadProductImages({
        authFetch,
        files,
        remainingSlots: MAX_PRODUCT_IMAGES - images.length,
      });
      onImagesChange([...images, ...uploadedUrls].slice(0, MAX_PRODUCT_IMAGES));
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Зураг upload хийхэд алдаа гарлаа.",
      );
    } finally {
      setUploading(false);
      onUploadingChange(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    onImagesChange(images.filter((_, index) => index !== indexToRemove));
  };

  return (
    <section className="mb-4" aria-labelledby="product-images-title">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p
            id="product-images-title"
            className="text-sm font-black text-slate-950"
          >
            Бүтээгдэхүүний зураг
          </p>
          <p className="mt-0.5 text-xs font-bold text-slate-500">
            Эхний зураг бүтээгдэхүүний үндсэн зураг болно
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-500 ring-1 ring-slate-200">
          {images.length}/{MAX_PRODUCT_IMAGES}
        </span>
      </div>

      {images.length === 0 ? (
        <label className="group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-slate-300 bg-white px-5 py-6 text-center transition hover:border-emerald-400 hover:bg-emerald-50/60 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition group-hover:scale-105 group-hover:bg-emerald-100">
            {uploading ? (
              <Loader2 size={25} className="animate-spin" />
            ) : (
              <ImageIcon size={25} />
            )}
          </span>
          <span className="mt-3 text-sm font-black text-slate-950">
            {uploading ? "Зураг боловсруулж байна..." : "Зураг нэмэх"}
          </span>
          <span className="mt-1 text-xs font-bold text-slate-500">
            Энд дарж 5 хүртэл зураг сонгоно уу
          </span>
          <span className="mt-2 text-[11px] font-bold text-slate-400">
            JPG, PNG, WEBP
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={uploading}
            className="sr-only"
            onChange={(event) => {
              void addImages(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {images.map((image, index) => (
            <div
              key={`${image.slice(0, 40)}-${index}`}
              className={`group relative aspect-square overflow-hidden rounded-[18px] bg-slate-200 ring-1 ring-slate-200 ${
                index === 0 ? "col-span-2 row-span-2" : ""
              }`}
            >
              <img
                src={image}
                alt={`Бүтээгдэхүүний зураг ${index + 1}`}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-slate-950/55 to-transparent p-2">
                {index === 0 ? (
                  <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black text-slate-900 shadow-sm">
                    Үндсэн зураг
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  aria-label={`${index + 1}-р зургийг устгах`}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/75 text-white shadow-sm transition hover:scale-105 hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}

          {canAddMore ? (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-slate-300 bg-white text-slate-500 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 focus-within:ring-4 focus-within:ring-emerald-100">
              <PlusCircle size={22} />
              <span className="mt-1.5 text-xs font-black">Нэмэх</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={uploading}
                className="sr-only"
                onChange={(event) => {
                  void addImages(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
          ) : null}
        </div>
      )}

      {uploadError && (
        <p
          role="alert"
          className="mt-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
        >
          {uploadError}
        </p>
      )}
    </section>
  );
}

function ProductCategorySelect({
  authFetch,
  onChange,
  value,
}: {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onChange: (value: string) => void;
  value: string;
}) {
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  useLockBodyScroll(open);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await authFetch(`${API}/business-categories`);
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok || !Array.isArray(data)) {
          throw new Error("Ангиллын жагсаалт авах боломжгүй байна.");
        }
        if (!cancelled) setCategories(data as BusinessCategory[]);
      } catch {
        if (!cancelled) setError("Ангиллын жагсаалт ачаалж чадсангүй.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const visibleCategories = useMemo(
    () =>
      categories.filter((category) =>
        activeParentId
          ? category.parentId === activeParentId
          : !category.parentId,
      ),
    [activeParentId, categories],
  );
  const selectedCategory = value ? categoryById.get(value) : undefined;
  const activeParent = activeParentId
    ? categoryById.get(activeParentId)
    : undefined;

  const getCategoryPath = (category: BusinessCategory | undefined) => {
    if (!category) return "";
    const names: string[] = [];
    const visited = new Set<string>();
    let current: BusinessCategory | undefined = category;
    while (current && !visited.has(current.id)) {
      names.unshift(current.name);
      visited.add(current.id);
      current = current.parentId
        ? categoryById.get(current.parentId)
        : undefined;
    }
    return names.join(" › ");
  };

  const openPicker = () => {
    setActiveParentId(null);
    setOpen(true);
  };

  const chooseCategory = (category: BusinessCategory) => {
    const hasChildren = categories.some(
      (candidate) => candidate.parentId === category.id,
    );
    if (hasChildren) {
      setActiveParentId(category.id);
      return;
    }
    onChange(category.id);
    setOpen(false);
  };

  const goBack = () => {
    setActiveParentId(activeParent?.parentId || null);
  };

  return (
    <div className="block">
      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        Ангилал
        <span className="text-rose-500" aria-hidden="true">
          *
        </span>
      </div>
      <button
        type="button"
        onClick={openPicker}
        disabled={loading || categories.length === 0}
        aria-haspopup="dialog"
        aria-describedby={error ? "product-category-error" : undefined}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-left outline-none transition hover:border-emerald-300 focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        <span
          className={`min-w-0 truncate text-sm font-bold ${
            selectedCategory ? "text-slate-900" : "text-slate-400"
          }`}
        >
          {loading
            ? "Ангилал ачаалж байна..."
            : selectedCategory
              ? getCategoryPath(selectedCategory)
              : "Бүтээгдэхүүний ангилал сонгох"}
        </span>
        <ChevronRight size={18} className="shrink-0 text-slate-400" />
      </button>
      {error ? (
        <span
          id="product-category-error"
          className="mt-1.5 block text-xs font-bold text-rose-600"
        >
          {error}
        </span>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[180] flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-picker-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Ангилал сонголт хаах"
          />
          <div className="relative flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-w-lg sm:rounded-[28px]">
            <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-slate-200 sm:hidden" />
            <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-4">
              {activeParent ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                  aria-label="Өмнөх ангилал руу буцах"
                >
                  <ArrowLeft size={20} />
                </button>
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Boxes size={20} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2
                  id="category-picker-title"
                  className="truncate text-lg font-black text-slate-950"
                >
                  {activeParent?.name || "Ангилал сонгох"}
                </h2>
                <p className="mt-0.5 truncate text-xs font-bold text-slate-400">
                  {activeParent
                    ? getCategoryPath(activeParent)
                    : "Үндсэн ангиллаас эхэлж сонгоно уу"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                aria-label="Хаах"
              >
                <X size={20} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
              {visibleCategories.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {visibleCategories.map((category) => {
                    const childCount = categories.filter(
                      (candidate) => candidate.parentId === category.id,
                    ).length;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => chooseCategory(category)}
                        className="group flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-emerald-100 group-hover:text-emerald-700">
                          <Boxes size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-black text-slate-900">
                            {category.name}
                          </span>
                          <span className="mt-0.5 block text-[11px] font-bold text-slate-400">
                            {childCount > 0
                              ? `${childCount} дэд ангилал`
                              : "Сонгох"}
                          </span>
                        </span>
                        <ChevronRight
                          size={18}
                          className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600"
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center">
                  <p className="text-sm font-black text-slate-700">
                    Дэд ангилал олдсонгүй
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "amber" | "blue" | "emerald" | "slate";
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-500 text-white border-emerald-500",
    slate: "bg-slate-100 text-slate-600 border-slate-100",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function MobileOrganizationHero({
  category,
  cover,
  imageActionMenu,
  imageUploading,
  isOpen,
  isVerified,
  logo,
  name,
  onEditProfile,
  onPreviewImage,
  onToggleImageMenu,
  onUploadImage,
  publicHref,
  rating,
  reviewCount,
  role,
  shortDescription,
}: {
  category: string;
  cover: string;
  imageActionMenu: "logoUrl" | "bannerUrl" | null;
  imageUploading: "logoUrl" | "bannerUrl" | null;
  isOpen: boolean;
  isVerified: boolean;
  logo: string;
  name: string;
  onEditProfile: () => void;
  onPreviewImage: (title: string, url: string) => void;
  onToggleImageMenu: React.Dispatch<
    React.SetStateAction<"logoUrl" | "bannerUrl" | null>
  >;
  onUploadImage: (
    field: "logoUrl" | "bannerUrl",
    files: FileList | null,
  ) => void;
  publicHref: string;
  rating: number;
  reviewCount: number;
  role: string;
  shortDescription: string;
}) {
  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.10)] sm:hidden">
      <div className="relative h-40 bg-slate-200">
        <button
          type="button"
          onClick={() =>
            onToggleImageMenu((current) =>
              current === "bannerUrl" ? null : "bannerUrl",
            )
          }
          className="block h-full w-full"
          aria-label="Cover зурагны сонголт"
        >
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        </button>
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
        <ImageActionMenu
          field="bannerUrl"
          isOpen={imageActionMenu === "bannerUrl"}
          label="Cover зураг"
          onToggle={() =>
            onToggleImageMenu((current) =>
              current === "bannerUrl" ? null : "bannerUrl",
            )
          }
          onPreview={() => onPreviewImage("Cover зураг", cover)}
          onUpload={onUploadImage}
          uploading={imageUploading === "bannerUrl"}
          variant="cover"
        />
        <div className="absolute right-3 top-3">
          <PublicProfileActions
            compact
            href={publicHref}
            organizationName={name}
          />
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="relative -mt-12 flex items-end justify-between">
          <div className="relative h-24 w-24 rounded-[28px] bg-slate-100 shadow-xl ring-4 ring-white">
            <button
              type="button"
              onClick={() =>
                onToggleImageMenu((current) =>
                  current === "logoUrl" ? null : "logoUrl",
                )
              }
              className="h-full w-full overflow-hidden rounded-[28px]"
              aria-label="Profile зурагны сонголт"
            >
              <img
                src={logo}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>
            <button
              type="button"
              onClick={() =>
                onToggleImageMenu((current) =>
                  current === "logoUrl" ? null : "logoUrl",
                )
              }
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-950 shadow ring-4 ring-white"
              aria-label="Profile зураг солих"
            >
              <ImageIcon size={17} />
            </button>
            {isOpen && (
              <span className="absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
            )}
            <ImageActionMenu
              field="logoUrl"
              isOpen={imageActionMenu === "logoUrl"}
              label="Profile зураг"
              onToggle={() =>
                onToggleImageMenu((current) =>
                  current === "logoUrl" ? null : "logoUrl",
                )
              }
              onPreview={() => onPreviewImage("Profile зураг", logo)}
              onUpload={onUploadImage}
              uploading={imageUploading === "logoUrl"}
              variant="avatar"
            />
          </div>

          <button
            type="button"
            onClick={onEditProfile}
            className="mb-1 inline-flex h-10 items-center gap-2 rounded-full bg-slate-950 px-4 text-xs font-black text-white shadow-lg"
          >
            <Pencil size={15} />
            Засах
          </button>
        </div>

        <div className={imageActionMenu === "logoUrl" ? "pt-24" : "pt-3"}>
          <h1 className="line-clamp-2 text-2xl font-black leading-tight tracking-tight text-slate-950">
            {name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-slate-900">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {rating} ({reviewCount})
            </span>
            <span className="text-slate-300">·</span>
            <span className={isOpen ? "text-emerald-600" : "text-slate-500"}>
              {isOpen ? "Идэвхтэй" : "Идэвхгүй"}
            </span>
          </div>

          <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-slate-500">
            {shortDescription}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {isVerified && (
              <Badge tone="blue">
                <ShieldCheck size={13} />
                Баталгаат
              </Badge>
            )}
            <Badge tone="slate">{category}</Badge>
            <Badge tone="amber">{role}</Badge>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-2 py-3 text-center shadow-sm sm:p-4">
      <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-orange-500 sm:h-10 sm:w-10 sm:rounded-2xl">
        <Icon size={16} className="sm:h-[18px] sm:w-[18px]" />
      </span>
      <p className="mt-2 truncate text-xs font-black text-slate-950 sm:mt-3 sm:text-sm">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] font-bold text-slate-400 sm:mt-1 sm:text-[11px]">
        {label}
      </p>
    </div>
  );
}

function PortalLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Store;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center justify-between gap-3 rounded-[22px] border border-white bg-white px-5 py-4 text-sm font-black text-slate-800 shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:text-orange-600"
    >
      <span className="inline-flex items-center gap-3">
        <Icon size={18} />
        {label}
      </span>
      <ArrowUpRight size={16} />
    </a>
  );
}
