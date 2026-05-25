"use client";

import { useEffect, useRef, useState } from "react";
import { API, adminFetch } from "@/lib/api";
import type { ProjectItem } from "@/lib/sections/types";

export function useSiteSettings() {
  const [banners, setBanners] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [projects, setProjectsRaw] = useState<ProjectItem[]>([]);
  const projectsRef = useRef<ProjectItem[]>([]);
  const [showBranchMapOnWeb, setShowBranchMapOnWeb] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [branchMapVisibilitySaving, setBranchMapVisibilitySaving] =
    useState(false);

  const setProjects = (
    update: ProjectItem[] | ((prev: ProjectItem[]) => ProjectItem[]),
  ) => {
    setProjectsRaw((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      projectsRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    adminFetch(`${API}/site-settings/admin`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, string>) => {
        if (data["promo-banners"]) {
          try {
            const parsed = JSON.parse(data["promo-banners"]);
            if (Array.isArray(parsed)) setBanners(parsed);
          } catch {}
        } else if (data["promo-banner"]) {
          setBanners([data["promo-banner"]]);
        }

        if (data["home-categories"]) {
          try {
            const parsed = JSON.parse(data["home-categories"]);
            if (Array.isArray(parsed)) setCategories(parsed);
          } catch {}
        }

        if (data["paid-projects"]) {
          try {
            const parsed = JSON.parse(data["paid-projects"]);
            if (Array.isArray(parsed)) {
              setProjectsRaw(parsed);
              projectsRef.current = parsed;
            }
          } catch {}
        }

        const showMapRaw = data["show-branch-map"];
        setShowBranchMapOnWeb(
          showMapRaw === "true" || showMapRaw === "1" || showMapRaw === "on",
        );
      })
      .catch(() => {});
  }, []);

  const saveBanners = async (currentBanners: string[]) => {
    setSaving(true);
    try {
      await adminFetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "promo-banners": JSON.stringify(currentBanners),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const saveCategories = async (currentCategories: string[]) => {
    setSaving(true);
    try {
      await adminFetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "home-categories": JSON.stringify(currentCategories),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const saveProjects = async (currentProjects?: ProjectItem[]) => {
    const toSave = currentProjects ?? projectsRef.current;
    setSaving(true);
    try {
      await adminFetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "paid-projects": JSON.stringify(toSave) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const toggleBranchMapOnWeb = async () => {
    const nextValue = !showBranchMapOnWeb;
    setShowBranchMapOnWeb(nextValue);
    setBranchMapVisibilitySaving(true);
    try {
      const res = await adminFetch(`${API}/site-settings/show-branch-map`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: nextValue ? "true" : "false" }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setShowBranchMapOnWeb(!nextValue);
      alert("Салбарын map-ийн төлвийг хадгалах үед алдаа гарлаа");
    } finally {
      setBranchMapVisibilitySaving(false);
    }
  };

  return {
    banners,
    setBanners,
    categories,
    setCategories,
    projects,
    setProjects,
    showBranchMapOnWeb,
    saving,
    saved,
    branchMapVisibilitySaving,
    saveBanners,
    saveCategories,
    saveProjects,
    toggleBranchMapOnWeb,
  };
}
