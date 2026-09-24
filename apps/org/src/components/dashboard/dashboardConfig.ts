import {
  BarChart3,
  Boxes,
  Building2,
  ChefHat,
  Clapperboard,
  ClipboardList,
  Coffee,
  Megaphone,
  MonitorSmartphone,
  Package,
  Settings,
  TimerReset,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { OrgUser } from "@/lib/api";
import { money } from "@/lib/org-format";
import { DashboardStats, OrgFeatureState } from "@/lib/org-types";
import { canViewWorkforceReport } from "@/lib/workforce-api";

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

export function getDashboardModules(
  features: OrgFeatureState,
  user?: OrgUser | null,
) {
  if (features.selfService) {
    const isCafe = features.selfServiceMode === "CAFE";
    return [
      {
        title: "Өөртөө үйлчлэх касс",
        desc: "Зочин захиалгаа өөрөө үүсгэж, QPay эсвэл картаар төлнө.",
        href: "/dashboard/self-service",
        icon: MonitorSmartphone,
        enabled: true,
      },
      {
        title: isCafe ? "Бариста дэлгэц" : "Гал тогооны дэлгэц",
        desc: isCafe
          ? "Шинэ захиалгыг хүлээн авч, кофе болон уух зүйлсийн бэлтгэлийг удирдана."
          : "Шинэ захиалгыг хүлээн авч, бэлтгэлийн төлөвийг удирдана.",
        href: "/dashboard/kitchen-display",
        icon: isCafe ? Coffee : ChefHat,
        enabled: true,
      },
      {
        title: "Бүтээгдэхүүн",
        desc: isCafe
          ? "Кофе шопын кассанд харагдах уух зүйл, бүтээгдэхүүн болон үнийг удирдана."
          : "Өөртөө үйлчлэх кассанд харагдах бүтээгдэхүүн, хоол болон үнийг удирдана.",
        href: "/dashboard/products",
        icon: Package,
        enabled: true,
      },
      ...(isCafe
        ? [
            {
              title: "Өдрийн бараа орлого",
              desc: "Өдрийн орлого, борлуулалт, хорогдол болон үлдэгдлийг бүтээгдэхүүн тус бүрээр хянана.",
              href: "/dashboard/daily-stock",
              icon: ClipboardList,
              enabled: true,
            },
          ]
        : []),
      {
        title: "Ажилтан ба эрх",
        desc: "Ресторан, кофе шопын ажилтнууд болон тэдний ашиглах эрхийг удирдана.",
        href: "/dashboard/members",
        icon: Users,
        enabled: true,
      },
      {
        title: "Цаг бүртгэлийн тайлан",
        desc: "Ажилтнуудын ирц, ажилласан хугацаа болон цаг бүртгэлийн төлөвийг хянана.",
        href: "/dashboard/workforce/attendance",
        icon: TimerReset,
        enabled: canViewWorkforceReport(user?.orgRole, user?.capabilities),
      },
      {
        title: "Тохиргоо",
        desc: `Касс, QPay, карт болон ${isCafe ? "кофе шопын" : "рестораны"} тохиргоог удирдана.`,
        href: "/dashboard/settings",
        icon: Settings,
        enabled: true,
      },
      {
        title: "Тайлан",
        desc: "Өөртөө үйлчлэх кассын борлуулалт, төлбөрийн тайланг харна.",
        href: "/dashboard/reports",
        icon: BarChart3,
        enabled: true,
      },
    ];
  }

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
      title: "Reels",
      desc: "Бүтээгдэхүүнтэй холбосон богино video танилцуулга оруулна.",
      href: "/dashboard/reels",
      icon: Clapperboard,
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
