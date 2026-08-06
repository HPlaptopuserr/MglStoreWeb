"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { getOptimizedProductImageUrl } from "./product-image.utils";

interface ProductThumbnailProps {
  imageUrl?: string | null;
  productName: string;
  className?: string;
  size?: number;
  quality?: number;
  eager?: boolean;
}

export function ProductThumbnail({
  imageUrl,
  productName,
  className = "h-11 w-11",
  size = 72,
  quality = 60,
  eager = false,
}: ProductThumbnailProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50 ${className}`}
    >
      <Package className="h-5 w-5 text-slate-300" aria-hidden="true" />
      {imageUrl && !failed && (
        <img
          src={getOptimizedProductImageUrl(imageUrl, size, quality)}
          alt={productName}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "low"}
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
