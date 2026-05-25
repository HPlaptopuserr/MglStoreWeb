import {
  ImagePlus,
  Tag,
  MapPin,
  CreditCard,
  Wrench,
  Monitor,
  Users,
  ClipboardList,
  Settings2,
  FileSignature,
  UserSquare2,
  FolderKanban,
} from "lucide-react";
import type { CardColorScheme } from "@mgl/ui";
import type { SectionKey } from "./types";

export const SECTIONS: { key: SectionKey; label: string; icon: React.ElementType; requires?: string }[] = [
  { key: "banner", label: "Промо баннер", icon: ImagePlus },
  { key: "categories", label: "Ангилалууд", icon: Tag },
  { key: "branches", label: "Салбар байршил", icon: MapPin },
  { key: "cards", label: "Карт хэвлэх", icon: CreditCard },
  { key: "qr", label: "QR Generator", icon: Wrench },
  { key: "pos", label: "POS Register", icon: Monitor, requires: "MANAGE_POS" },
  { key: "vendor-features", label: "Vendor тохиргоо", icon: Settings2, requires: "MANAGE_SITE_SETTINGS" },
  { key: "hr", label: "Хүний нөөц", icon: Users, requires: "MANAGE_USERS" },
  { key: "forms", label: "Маягт үүсгэгч", icon: ClipboardList, requires: "MANAGE_FORMS" },
  { key: "mgl-services", label: "MGL Үйлчилгээ", icon: Settings2, requires: "MANAGE_SITE_SETTINGS" },
  { key: "projects", label: "Төсөл", icon: FolderKanban, requires: "MANAGE_SITE_SETTINGS" },
  { key: "team", label: "Баг хамт олон", icon: UserSquare2, requires: "MANAGE_SITE_SETTINGS" },
];

export const SCHEME_ORDER: CardColorScheme[] = [
  "default",
  "dark",
  "charcoal",
  "navy",
  "forest",
];

export const MAX_BANNERS = 3;
export const PRINT_COPIES = 8;
export const PRINT_SCALE = 0.84;
export const MIN_BRANCH_DISTANCE_METERS = 500;
export const BRANCH_MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const UB_CENTER: [number, number] = [47.9184, 106.9177];
