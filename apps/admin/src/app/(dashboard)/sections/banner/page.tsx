"use client";

import { useSiteSettings } from "@/hooks/sections/useSiteSettings";
import { BannerSection } from "@/components/organisms/sections/banner/BannerSection";
import { SectionsRouteFrame } from "../_components/SectionsRouteFrame";
import { SectionContent } from "../_components/SectionContent";

export default function BannerSectionPage() {
  const { banners, setBanners, saving, saved, saveBanners } = useSiteSettings();

  return (
    <SectionsRouteFrame
      active="banner"
      onSave={() => saveBanners(banners)}
      saving={saving}
      saved={saved}
    >
      <SectionContent>
        <BannerSection banners={banners} setBanners={setBanners} />
      </SectionContent>
    </SectionsRouteFrame>
  );
}
