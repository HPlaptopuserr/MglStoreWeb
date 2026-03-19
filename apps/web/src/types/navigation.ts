import type { LucideIcon } from "lucide-react";

export interface NavLinkItem {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  color: string;
}