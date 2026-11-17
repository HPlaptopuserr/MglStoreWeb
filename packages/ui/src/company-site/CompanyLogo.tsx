"use client";
import Image from "next/image";
import { useState } from "react";
import { resolveApiAssetUrl } from "./api";

export function CompanyLogo({ name, url }: { name: string; url?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return url && failedUrl !== url ? (
    <Image
      src={url.startsWith("/mgl-club/") ? url : resolveApiAssetUrl(url)}
      alt={`${name} лого`}
      width={120}
      height={120}
      unoptimized
      onError={() => setFailedUrl(url)}
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  ) : (
    <span aria-hidden="true">{Array.from(name)[0]}</span>
  );
}
