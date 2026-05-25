"use client";

import { useMemo, useState } from "react";
import type { SectionKey } from "@/lib/sections/types";
import { SECTIONS } from "@/lib/sections/constants";
import { useSiteSettings } from "@/hooks/sections/useSiteSettings";
import { SectionsLayout } from "@/components/organisms/sections/SectionsLayout";
import { BranchesSection } from "@/components/organisms/sections/branches/BranchesSection";
import { CardsSection } from "@/components/organisms/sections/cards/CardsSection";
import { FormBuilderTool, QrGeneratorPanel } from "@/components/organisms";
import { PosRegistersSection } from "@/components/organisms/sections/pos/PosRegistersSection";
import { VendorFeaturesSection } from "@/components/organisms/sections/vendor-features/VendorFeaturesSection";
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
    showBranchMapOnWeb,
    saving,
    saved,
    branchMapVisibilitySaving,
    toggleBranchMapOnWeb,
  } = useSiteSettings();

  const handleSave = async () => {
    // Save handlers removed - not needed for current sections
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
        <>
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
        </>
      ) : null}
    </SectionsLayout>
  );
}
