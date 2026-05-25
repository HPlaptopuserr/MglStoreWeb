"use client";

import { useMemo, useState } from "react";
import type { SectionKey } from "@/lib/sections/types";
import { SECTIONS } from "@/lib/sections/constants";
import { useSiteSettings } from "@/hooks/sections/useSiteSettings";
import { SectionsLayout } from "@/components/organisms/sections/SectionsLayout";
import { BannerSection } from "@/components/organisms/sections/banner/BannerSection";
import { CategoriesSection } from "@/components/organisms/sections/categories/CategoriesSection";
import { BranchesSection } from "@/components/organisms/sections/branches/BranchesSection";
import { CardsSection } from "@/components/organisms/sections/cards/CardsSection";
import { FormBuilderTool, QrGeneratorPanel } from "@/components/organisms";
import { PosRegistersSection } from "@/components/organisms/sections/pos/PosRegistersSection";
import { VendorFeaturesSection } from "@/components/organisms/sections/vendor-features/VendorFeaturesSection";
import { MglServicesSection } from "@/components/organisms/sections/mgl-services/MglServicesSection";
import { ProjectsSection } from "@/components/organisms/sections/projects/ProjectsSection";
import { HrSection } from "@/components/organisms/sections/hr/HrSection";
import { TeamSection } from "@/components/organisms/sections/team/TeamSection";
import { useAdminAuth } from "@/lib/admin-auth";

export default function SectionsPage() {
  const { hasPermission, isFullAdmin } = useAdminAuth();

  const visibleSections = useMemo(() => {
    if (isFullAdmin) return SECTIONS;
    return SECTIONS.filter((s) => !s.requires || hasPermission(s.requires));
  }, [isFullAdmin, hasPermission]);

  const defaultKey = visibleSections[0]?.key ?? "banner";
  const [active, setActive] = useState<SectionKey>(defaultKey);

  const {
    banners,
    setBanners,
    categories,
    setCategories,
    mglServices,
    setMglServices,
    projects,
    setProjects,
    showBranchMapOnWeb,
    saving,
    saved,
    branchMapVisibilitySaving,
    saveBanners,
    saveCategories,
    saveMglServices,
    saveProjects,
    toggleBranchMapOnWeb,
  } = useSiteSettings();

  const handleSave = async () => {
    if (active === "banner") await saveBanners(banners);
    else if (active === "categories") await saveCategories(categories);
    else if (active === "mgl-services") await saveMglServices();
    else if (active === "projects") await saveProjects();
  };

  return (
    <SectionsLayout
      active={active}
      setActive={setActive}
      onSave={handleSave}
      saving={saving}
      saved={saved}
      visibleSections={visibleSections}
    >
      {active !== "forms" ? (
        <div className="flex-1 overflow-y-auto p-8">
          {active === "banner" && (
            <BannerSection banners={banners} setBanners={setBanners} />
          )}
          {active === "categories" && (
            <CategoriesSection
              categories={categories}
              setCategories={setCategories}
            />
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
          {active === "vendor-features" && <VendorFeaturesSection />}
          {active === "mgl-services" && (
            <MglServicesSection
              mglServices={mglServices}
              setMglServices={setMglServices}
              onSave={() => saveMglServices()}
              saving={saving}
              saved={saved}
              key="mgl-services"
            />
          )}
          {active === "projects" && (
            <ProjectsSection
              projects={projects}
              setProjects={setProjects}
              onSave={saveProjects}
              saving={saving}
              saved={saved}
            />
          )}
          {active === "hr" && <HrSection />}
          {active === "team" && <TeamSection />}
        </div>
      ) : (
        <FormBuilderTool />
      )}
    </SectionsLayout>
  );
}
