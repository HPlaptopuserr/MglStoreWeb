"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  Boxes,
  ClipboardList,
  CreditCard,
  Crown,
  LayoutDashboard,
  Megaphone,
  Package,
  PackageSearch,
  RotateCcw,
  ScanLine,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import {
  AppSidebar,
  type AppSidebarGroup,
  type AppSidebarItem,
} from "./AppSidebar";

type VendorNavItem = Omit<AppSidebarItem, "children"> & {
  children?: VendorNavItem[];
  posOnly?: boolean;
  preorderOnly?: boolean;
  serviceOnly?: boolean;
  supplyOnly?: boolean;
};

const VENDOR_NAV_GROUPS: Array<
  Omit<AppSidebarGroup, "items"> & { items: VendorNavItem[] }
> = [
  {
    id: "vendor-menu",
    title: "Цэс",
    items: [
      {
        id: "overview-menu",
        label: "Хяналт",
        href: "/dashboard",
        icon: LayoutDashboard,
        children: [
          {
            id: "dashboard",
            label: "Хяналтын самбар",
            href: "/dashboard",
            icon: LayoutDashboard,
          },
          {
            id: "pos",
            label: "POS касс",
            href: "/pos",
            icon: ScanLine,
            tone: "success",
            posOnly: true,
          },
        ],
      },
      {
        id: "commerce-menu",
        label: "Захиалга ба борлуулалт",
        href: "/orders",
        icon: ShoppingCart,
        children: [
          {
            id: "orders",
            label: "Захиалгууд",
            href: "/orders",
            icon: ShoppingCart,
          },
          {
            id: "returns",
            label: "Буцаалт",
            href: "/returns",
            icon: RotateCcw,
          },
          {
            id: "sales",
            label: "Борлуулалт",
            href: "/sales",
            icon: BarChart2,
          },
          {
            id: "payments",
            label: "Төлбөр",
            href: "/payments",
            icon: CreditCard,
          },
        ],
      },
      {
        id: "catalog-menu",
        label: "Бүтээгдэхүүн ба контент",
        href: "/products",
        icon: Package,
        children: [
          {
            id: "products",
            label: "Өөрийн бүтээгдэхүүн",
            href: "/products",
            icon: Package,
          },
          {
            id: "preorder-products",
            label: "Захиалгын бараа",
            href: "/products?type=preorder",
            icon: PackageSearch,
            preorderOnly: true,
          },
          {
            id: "supply-products",
            label: "Нэгдсэн бараа",
            href: "/supply-products",
            icon: Boxes,
            supplyOnly: true,
          },
          {
            id: "service-posts",
            label: "Үйлчилгээний постууд",
            href: "/service-posts",
            icon: Megaphone,
            serviceOnly: true,
          },
        ],
      },
      {
        id: "operations-menu",
        label: "Үйл ажиллагаа",
        href: "/drivers",
        icon: ClipboardList,
        children: [
          {
            id: "drivers",
            label: "Түгээгчийн мэдээлэл",
            href: "/drivers",
            icon: Users,
          },
          {
            id: "requests",
            label: "Хүсэлтүүд",
            href: "/requests",
            icon: ClipboardList,
          },
          {
            id: "central-warehouse-orders",
            label: "Төв агуулахын захиалга",
            href: "/shipments",
            icon: Truck,
            tone: "warning",
          },
        ],
      },
    ],
  },
];

const VENDOR_BOTTOM_GROUPS: AppSidebarGroup[] = [
  {
    id: "upgrade",
    title: "Upgrade",
    items: [
      {
        id: "upgrade",
        label: "Pro Upgrade",
        href: "/upgrade",
        icon: Crown,
        tone: "warning",
      },
    ],
  },
];

const VENDOR_SIDEBAR_COLLAPSED_KEY = "vendor_sidebar_collapsed";

export interface VendorSidebarProps {
  onSignOut?: () => void;
  userName?: string;
  userRole?: string;
  userInitials?: string;
  showPos?: boolean;
  showSupplyProducts?: boolean;
  showPreorderProducts?: boolean;
  showServicePosts?: boolean;
  bottomSlot?: ReactNode;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function shouldShowItem(
  item: VendorNavItem,
  flags: Pick<
    VendorSidebarProps,
    | "showPos"
    | "showPreorderProducts"
    | "showServicePosts"
    | "showSupplyProducts"
  >,
) {
  if (item.posOnly) return Boolean(flags.showPos);
  if (item.preorderOnly) return Boolean(flags.showPreorderProducts);
  if (item.serviceOnly) return Boolean(flags.showServicePosts);
  if (item.supplyOnly) return Boolean(flags.showSupplyProducts);
  return true;
}

function mapVendorItem(
  item: VendorNavItem,
  pathname: string | null,
  productType: string | null,
  onProductTypeChange: (type: string | null) => void,
  flags: Pick<
    VendorSidebarProps,
    | "showPos"
    | "showPreorderProducts"
    | "showServicePosts"
    | "showSupplyProducts"
  >,
): VendorNavItem | null {
  const children = item.children
    ?.map((child) =>
      mapVendorItem(
        child as VendorNavItem,
        pathname,
        productType,
        onProductTypeChange,
        flags,
      ),
    )
    .filter((child): child is VendorNavItem => Boolean(child));

  if (!children?.length && !shouldShowItem(item, flags)) return null;

  const isPreorderItem = item.preorderOnly;
  const isProductsItem = item.id === "products";
  const nextProductType = item.href.startsWith("/products")
    ? new URLSearchParams(item.href.split("?")[1] ?? "").get("type")
    : null;

  return {
    ...item,
    children,
    isActive: isPreorderItem
      ? pathname === "/products" && productType === "preorder"
      : isProductsItem
        ? pathname === "/products" && productType !== "preorder"
        : item.isActive,
    onClick: item.href.startsWith("/products")
      ? () => {
          onProductTypeChange(nextProductType);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("vendor-product-type-change", {
                detail: { type: nextProductType },
              }),
            );
          }
        }
      : item.onClick,
  };
}

export function VendorSidebar({
  onSignOut,
  userName = "Vendor",
  userRole = "Vendor",
  userInitials,
  showPos = false,
  showSupplyProducts = false,
  showPreorderProducts = false,
  showServicePosts = false,
  bottomSlot,
  mobileOpen = false,
  onMobileClose,
}: VendorSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(VENDOR_SIDEBAR_COLLAPSED_KEY) === "true";
  });
  const [productType, setProductType] = useState<string | null>(null);
  const profileInitials =
    userInitials || userName.trim().slice(0, 2).toUpperCase() || "V";

  useEffect(() => {
    onMobileClose?.();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const syncProductType = () => {
      if (typeof window === "undefined") return;
      setProductType(new URLSearchParams(window.location.search).get("type"));
    };
    syncProductType();
    window.addEventListener("popstate", syncProductType);
    return () => window.removeEventListener("popstate", syncProductType);
  }, [pathname]);

  const groups = useMemo(
    () =>
      VENDOR_NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items
          .map((item) =>
            mapVendorItem(item, pathname, productType, setProductType, {
              showPos,
              showPreorderProducts,
              showServicePosts,
              showSupplyProducts,
            }),
          )
          .filter((item): item is VendorNavItem => Boolean(item)),
      })).filter((group) => group.items.length > 0),
    [
      pathname,
      productType,
      showPos,
      showPreorderProducts,
      showServicePosts,
      showSupplyProducts,
    ],
  );

  const mobileGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items
            .map((item) => ({
              ...item,
              children: item.children?.filter((child) => child.href !== "/pos"),
            }))
            .filter((item) => !item.children || item.children.length > 0),
        }))
        .filter((group) => group.items.length > 0),
    [groups],
  );

  const handleCollapsedChange = (next: boolean) => {
    setIsCollapsed(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VENDOR_SIDEBAR_COLLAPSED_KEY, String(next));
    }
  };

  return (
    <>
      <AppSidebar
        userName={userName}
        userRole={userRole}
        userInitials={profileInitials}
        groups={groups}
        bottomSlot={bottomSlot}
        bottomGroups={VENDOR_BOTTOM_GROUPS}
        collapsed={isCollapsed}
        onCollapsedChange={handleCollapsedChange}
        onSignOut={onSignOut}
        profileHref="/profile"
        mobileOpen={false}
      />

      <AppSidebar
        userName={userName}
        userRole={userRole}
        userInitials={profileInitials}
        groups={mobileGroups}
        bottomSlot={bottomSlot}
        bottomGroups={VENDOR_BOTTOM_GROUPS}
        collapsed={false}
        onCollapsedChange={() => undefined}
        onSignOut={onSignOut}
        profileHref="/profile"
        mobileOpen={mobileOpen}
        onMobileClose={onMobileClose}
        showDesktopSidebar={false}
        showDesktopSpacer={false}
      />
    </>
  );
}
