"use client";
import Image from "next/image";
import { useState } from "react";
export function StoreProfileImage({
  src,
  label,
}: {
  src: string | null;
  label: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const safe =
    src &&
    (/^https?:\/\//i.test(src) ||
      (src.startsWith("/") && !src.startsWith("//")));
  return (
    <figure className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
      <figcaption className="mb-2 text-xs font-semibold text-slate-500">
        {label}
      </figcaption>
      {safe && failedSource !== src ? (
        <Image
          unoptimized
          src={src}
          alt={label}
          width={480}
          height={240}
          loading="lazy"
          onError={() => setFailedSource(src)}
          className="h-32 w-full rounded-lg object-contain"
        />
      ) : (
        <p className="flex h-32 items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-500">
          {safe ? "Зураг ачаалагдсангүй" : "Зураг бүртгэгдээгүй"}
        </p>
      )}
    </figure>
  );
}
