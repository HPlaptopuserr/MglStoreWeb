"use client";
import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { API } from "@/lib/api";

export function ManagedProductImage({
  url,
  name,
  sizes,
}: {
  url?: string | null;
  name: string;
  sizes: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const source =
    url &&
    (/^(https?:|data:|blob:)/i.test(url)
      ? url
      : `${API.replace(/\/api$/, "")}${url.startsWith("/") ? url : `/${url}`}`);
  return source && source !== failedUrl ? (
    <Image
      src={source}
      alt={name}
      fill
      sizes={sizes}
      onError={() => setFailedUrl(source)}
      className="object-contain motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
    />
  ) : (
    <span
      role="img"
      aria-label={`${name} — зураггүй`}
      className="absolute inset-0 flex items-center justify-center text-slate-300"
    >
      <ImageIcon className="h-1/3 w-1/3 max-w-12" />
    </span>
  );
}
