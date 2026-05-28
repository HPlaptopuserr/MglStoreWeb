"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { API } from "@/lib/api";

export const PromoBanner = () => {
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/site-settings`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, string>) => {
        if (data["promo-banner"]) setBannerUrl(data["promo-banner"]);
      })
      .catch(() => {});
  }, []);

  if (!bannerUrl) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: "33.333vh", minHeight: "180px" }}>
      {bannerUrl.startsWith("data:") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bannerUrl} alt="Промо баннер" className="h-full w-full object-cover" />
      ) : (
        <Image
          src={bannerUrl}
          alt="Промо баннер"
          fill
          className="object-cover"
          priority
        />
      )}
    </div>
  );
};
