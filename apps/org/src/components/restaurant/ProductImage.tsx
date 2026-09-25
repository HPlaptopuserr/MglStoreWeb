"use client";

import { ImageOff, PackageOpen } from "lucide-react";
import { useState } from "react";
import { retryProductImageUrl } from "@/lib/product-image-feedback";
import { useProductImageFeedback } from "./ProductImageFeedback";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export function ProductImage(props: ProductImageProps) {
  const { attempt } = useProductImageFeedback();
  return (
    <ProductImageAttempt
      key={`${props.src}:${attempt}`}
      {...props}
      attempt={attempt}
    />
  );
}

function ProductImageAttempt({
  src,
  alt,
  className = "",
  attempt,
}: ProductImageProps & { attempt: number }) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">(
    "loading",
  );
  const { reportFailure, reportSuccess } = useProductImageFeedback();

  if (!src || state === "failed") {
    const Icon = src ? ImageOff : PackageOpen;
    return (
      <span
        className={`inline-flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}
        role="img"
        aria-label={
          src
            ? `${alt || "Бүтээгдэхүүн"}: зураг ачаалсангүй`
            : "Зураг оруулаагүй"
        }
      >
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={retryProductImageUrl(src, attempt)}
      alt={alt}
      decoding="async"
      loading="lazy"
      className={`${className} ${state === "loading" ? "motion-safe:animate-pulse" : ""}`}
      onLoad={() => {
        setState("loaded");
        reportSuccess(src);
      }}
      onError={() => {
        setState("failed");
        reportFailure(src);
      }}
    />
  );
}
