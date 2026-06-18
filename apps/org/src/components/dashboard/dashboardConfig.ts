import {
  Boxes,
  Building2,
  ClipboardList,
  Megaphone,
  Package,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { money } from "@/lib/org-format";
import { DashboardStats, OrgFeatureState } from "@/lib/org-types";

export function getDashboardKpis(stats: DashboardStats | null) {
  return [
    {
      label: "Идэвхтэй бүтээгдэхүүн",
      value: stats?.products?.active ?? 0,
      sub: `Нийт ${stats?.products?.total ?? 0}`,
      icon: Package,
    },
    {
      label: "Үйлчилгээний пост",
      value: stats?.servicePosts?.active ?? 0,
      sub: `${stats?.servicePosts?.totalViews ?? 0} үзэлт`,
      icon: Megaphone,
    },
    {
      label: "Үйлчилгээний хүсэлт",
      value: stats?.serviceRequests?.pending ?? 0,
      sub: `Нийт ${stats?.serviceRequests?.total ?? 0}`,
      icon: ClipboardList,
    },
    {
      label: "Хүлээгдэж буй төлбөр",
      value: stats?.pendingPayments?.count ?? 0,
      sub: money(stats?.pendingPayments?.totalAmount),
      icon: Boxes,
    },
  ];
}

export function getDashboardModules(features: OrgFeatureState) {
  return [
    {
      title: "Байгууллагын profile",
      desc: "Нэр, холбоо барих, public харагдах мэдээллээ удирдана.",
      href: "/dashboard/profile",
      icon: Building2,
      enabled: true,
    },
    {
      title: "Ажилтан ба эрх",
      desc: "Owner, admin, staff эрхтэй хэрэглэгчид болон login мэдээлэл.",
      href: "/dashboard/members",
      icon: Users,
      enabled: true,
    },
    {
      title: "Үйлчилгээний пост",
      desc: "Үйлчилгээ, зар, мэдээллийн контентоо нийтэлнэ.",
      href: "/dashboard/service-posts",
      icon: Megaphone,
      enabled: features.servicePosts,
    },
    {
      title: "Бүтээгдэхүүн",
      desc: "Бараа эсвэл худалдах боломжтой item-уудаа удирдана.",
      href: "/dashboard/products",
      icon: Package,
      enabled: true,
    },
    {
      title: "Ресторан касс",
      desc: "Ширээ, ticket, menu item, төлбөр хаалттай restaurant-first кассын UI.",
      href: "/dashboard/restaurant-pos",
      icon: UtensilsCrossed,
      enabled: true,
    },
    {
      title: "Агуулах / нэгдсэн бараа",
      desc: "Supply болон stock request workflow идэвхтэй үед харагдана.",
      href: "/dashboard/supply",
      icon: Boxes,
      enabled: features.supplyProducts,
    },
  ];
}
