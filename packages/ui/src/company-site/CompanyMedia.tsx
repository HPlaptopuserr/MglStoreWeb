"use client";
import Image from "next/image";
import { useState } from "react";
import { resolveApiAssetUrl } from "./api";
export function CompanyMedia({
  url,
  alt,
  priority = false,
  fit = "cover",
}: {
  url: string;
  alt: string;
  priority?: boolean;
  fit?: "cover" | "contain";
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!url || failed === url) return null;
  return (
    <Image
      src={url.startsWith("/api/") ? resolveApiAssetUrl(url) : url}
      alt={alt}
      fill
      sizes="(max-width: 767px) 100vw, 70vw"
      priority={priority}
      unoptimized={!url.startsWith("/mgl-club/")}
      onError={() => setFailed(url)}
      style={{ objectFit: fit }}
    />
  );
}
