"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SectionKey } from "@/lib/sections/types";
import { SECTIONS } from "@/lib/sections/constants";
import { useAdminAuth } from "@/lib/admin-auth";
import { SectionsLayout } from "@/components/organisms/sections/SectionsLayout";

type Props = {
  active: SectionKey;
  children: ReactNode;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
};

export function SectionsRouteFrame({
  active,
  children,
  onSave,
  saving,
  saved,
}: Props) {
  const router = useRouter();
  const { hasPermission, isFullAdmin } = useAdminAuth();

  const visibleSections = useMemo(() => {
    if (isFullAdmin) return SECTIONS;
    return SECTIONS.filter((section) => !section.requires || hasPermission(section.requires));
  }, [isFullAdmin, hasPermission]);

  const defaultKey = visibleSections[0]?.key ?? "banner";

  useEffect(() => {
    if (!visibleSections.some((section) => section.key === active)) {
      router.replace(`/sections/${defaultKey}`);
    }
  }, [active, defaultKey, router, visibleSections]);

  return (
    <SectionsLayout
      active={active}
      setActive={(key) => router.push(`/sections/${key}`)}
      onSave={onSave}
      saving={saving}
      saved={saved}
      visibleSections={visibleSections}
    >
      {children}
    </SectionsLayout>
  );
}
