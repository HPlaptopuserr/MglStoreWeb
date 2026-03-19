import { ShoppingBasket } from "lucide-react";
import type { BusinessCategory } from "@/types/category";

interface CategoryIconProps {
  category: BusinessCategory;
  /** Icon size in pixels */
  size?: number;
  /** CSS class for the text/emoji wrapper */
  className?: string;
}

/**
 * Renders a category icon — supports image URLs, data URIs, emoji strings,
 * and falls back to a ShoppingBasket icon.
 */
export function CategoryIcon({
  category,
  size = 14,
  className,
}: CategoryIconProps) {
  const { icon } = category;

  if (!icon) {
    return <ShoppingBasket size={size} className={className ?? "text-gray-400"} />;
  }

  if (icon.startsWith("data:image") || icon.startsWith("http")) {
    return (
      <img
        src={icon}
        alt=""
        className="rounded-sm object-contain"
        style={{ width: size, height: size }}
      />
    );
  }

  return <span style={{ fontSize: size }}>{icon}</span>;
}
