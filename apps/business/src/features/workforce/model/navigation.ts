import {
  Bell,
  Building2,
  CalendarDays,
  ChartColumn,
  Clock3,
  FileSpreadsheet,
  KeyRound,
  LayoutDashboard,
  MapPin,
  Receipt,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";
import type { WorkforceFeature } from "@mgl/types";
export type WorkforceSection =
  | "overview"
  | "analytics"
  | "work-reports"
  | "reports"
  | "requests"
  | "employees"
  | "departments"
  | "schedules"
  | "locations"
  | "notifications"
  | "billing"
  | "market"
  | "settings"
  | "integrations"
  | "tracking"
  | "mail";
export const sections: {
  id: WorkforceSection;
  label: string;
  icon: typeof Clock3;
  feature?: WorkforceFeature;
  addon?: string;
}[] = [
  {
    id: "overview",
    label: "Нүүр хуудас",
    icon: LayoutDashboard,
    feature: "dashboard",
  },
  {
    id: "analytics",
    label: "Хянах самбар",
    icon: ChartColumn,
    feature: "analytics",
  },
  {
    id: "reports",
    label: "Цагийн тайлан",
    icon: FileSpreadsheet,
    feature: "reports",
  },
  {
    id: "work-reports",
    label: "Ажлын тайлан",
    icon: FileSpreadsheet,
    feature: "reports",
  },
  { id: "requests", label: "Цагийн хүсэлт", icon: Clock3, feature: "requests" },
  { id: "employees", label: "Ажилтан", icon: Users, feature: "employees" },
  {
    id: "departments",
    label: "Алба, хэлтэс",
    icon: Building2,
    feature: "departments",
  },
  {
    id: "schedules",
    label: "Хуваарь",
    icon: CalendarDays,
    feature: "schedules",
  },
  { id: "locations", label: "Байршил", icon: MapPin, feature: "locations" },
  {
    id: "notifications",
    label: "Мэдэгдэл",
    icon: Bell,
    feature: "notifications",
  },
  { id: "billing", label: "Багц ба төлбөр", icon: Receipt },
  { id: "market", label: "Маркет", icon: ShoppingBag },
  {
    id: "integrations",
    label: "API холболт",
    icon: KeyRound,
    feature: "integrations",
  },
  {
    id: "tracking",
    label: "Байршлын трекинг",
    icon: MapPin,
    addon: "tracking",
  },
  { id: "mail", label: "Масс имэйл", icon: Bell, addon: "mail" },
  { id: "settings", label: "Тохиргоо", icon: Settings },
];
