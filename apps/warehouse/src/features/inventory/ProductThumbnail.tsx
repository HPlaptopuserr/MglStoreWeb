"use client";

import { useState } from "react";
import Image from "next/image";
import { Package, Pencil } from "lucide-react";
import { getOptimizedProductImageUrl } from "./product-image.utils";

interface ProductThumbnailProps {
  onEditImage?: () => void;
  imageUrl?: string | null;
  productName: string;
  className?: string;
  size?: number;
  quality?: number;
  eager?: boolean;
}

export function ProductThumbnail({
  onEditImage,
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
      className={`group/image relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50 ${className}`}
    >
      <Package className="h-5 w-5 text-slate-300" aria-hidden="true" />
      {imageUrl && !failed && (
        <Image
          src={getOptimizedProductImageUrl(imageUrl, size, quality)}
          alt={productName}
          fill
          sizes={`${size}px`}
          priority={eager}
          unoptimized
          referrerPolicy="no-referrer"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
      {onEditImage && (
        <button
          type="button"
          aria-label={`${productName} зураг нэмэх`}
          title="Зураг нэмэх"
          onClick={(event) => {
            event.stopPropagation();
            onEditImage();
          }}
          onKeyDown={(event) => event.stopPropagation()}
          className="absolute inset-0 flex items-center justify-center rounded-lg bg-blue-600/90 text-white opacity-0 transition-opacity group-hover/image:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [@media(hover:none)]:opacity-100"
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
