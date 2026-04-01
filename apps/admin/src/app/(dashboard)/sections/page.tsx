"use client";

import { useState } from "react";
import type { SectionKey } from "@/lib/sections/types";
import { useSiteSettings } from "@/hooks/sections/useSiteSettings";
import { SectionsLayout } from "@/components/organisms/sections/SectionsLayout";
import { BannerSection } from "@/components/organisms/sections/banner/BannerSection";
import { CategoriesSection } from "@/components/organisms/sections/categories/CategoriesSection";
import { BranchesSection } from "@/components/organisms/sections/branches/BranchesSection";
import { CardsSection } from "@/components/organisms/sections/cards/CardsSection";
import { FormBuilderTool, QrGeneratorPanel } from "@/components/organisms";
import { PosRegistersSection } from "@/components/organisms/sections/pos/PosRegistersSection";
import { HrSection } from "@/components/organisms/sections/hr/HrSection";

export default function SectionsPage() {
  const [active, setActive] = useState<SectionKey>("banner");

  const {
    banners,
    setBanners,
    categories,
    setCategories,
    showBranchMapOnWeb,
    saving,
    saved,
    branchMapVisibilitySaving,
    saveBanners,
    saveCategories,
    toggleBranchMapOnWeb,
  } = useSiteSettings();

  const handleSave = async () => {
    if (active === "banner") await saveBanners(banners);
    else if (active === "categories") await saveCategories(categories);
  };

  return (
    <SectionsLayout
      active={active}
      setActive={setActive}
      onSave={handleSave}
      saving={saving}
      saved={saved}
    >
      {active !== "forms" ? (
        <div className="flex-1 overflow-y-auto p-8">
          {active === "banner" && (
            <BannerSection banners={banners} setBanners={setBanners} />
          )}
          {active === "categories" && (
            <CategoriesSection categories={categories} setCategories={setCategories} />
          )}
          {active === "branches" && (
            <BranchesSection
              showBranchMapOnWeb={showBranchMapOnWeb}
              onToggle={toggleBranchMapOnWeb}
              saving={branchMapVisibilitySaving}
            />
          )}
          {active === "cards" && <CardsSection />}
          {active === "qr" && <QrGeneratorPanel showHeader={false} />}
          {active === "pos" && <PosRegistersSection />}
          {active === "hr" && <HrSection />}
        </div>
      ) : (
        <FormBuilderTool />
      )}
    </SectionsLayout>
  );
}
