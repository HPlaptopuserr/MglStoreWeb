"use client";

import { useEffect, useRef, useState } from "react";
import { API, adminFetch } from "@/lib/api";

import { ProjectItem, ServiceCategory } from "@/lib/sections/types";

function normalizeProjectImages(project: ProjectItem): ProjectItem {
  const imageUrls = Array.from(
    new Set(
      [
        ...(Array.isArray(project.imageUrls) ? project.imageUrls : []),
        project.imageUrl,
      ]
        .filter((url): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  );

  return {
    ...project,
    price: 0,
    imageUrl: imageUrls[0] ?? "",
    imageUrls,
  };
}

export function useSiteSettings() {
  const [banners, setBanners] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [mglServices, setMglServicesRaw] = useState<ServiceCategory[]>([]);
  const mglServicesRef = useRef<ServiceCategory[]>([]);
  const [projects, setProjectsRaw] = useState<ProjectItem[]>([]);
  const projectsRef = useRef<ProjectItem[]>([]);

  const setMglServices = (
    update:
      | ServiceCategory[]
      | ((prev: ServiceCategory[]) => ServiceCategory[]),
  ) => {
    setMglServicesRaw((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      mglServicesRef.current = next;
      return next;
    });
  };

  const setProjects = (
    update: ProjectItem[] | ((prev: ProjectItem[]) => ProjectItem[]),
  ) => {
    setProjectsRaw((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      projectsRef.current = next;
      return next;
    });
  };
  const [showBranchMapOnWeb, setShowBranchMapOnWeb] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [branchMapVisibilitySaving, setBranchMapVisibilitySaving] =
    useState(false);

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

        if (data["mgl-services"]) {
          try {
            const parsed = JSON.parse(data["mgl-services"]);
            if (Array.isArray(parsed)) {
              setMglServicesRaw(parsed);
              mglServicesRef.current = parsed;
            }
          } catch {}
        }

        if (data["paid-projects"]) {
          try {
            const parsed = JSON.parse(data["paid-projects"]);
            if (Array.isArray(parsed)) {
              const normalized = parsed.map(normalizeProjectImages);
              setProjectsRaw(normalized);
              projectsRef.current = normalized;
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

  const saveMglServices = async (currentServices?: ServiceCategory[]) => {
    // Always use the ref to get the latest value, avoiding stale closures
    const toSave = currentServices ?? mglServicesRef.current;
    setSaving(true);
    try {
      await adminFetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "mgl-services": JSON.stringify(toSave) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const saveProjects = async (currentProjects?: ProjectItem[]) => {
    const toSave = (currentProjects ?? projectsRef.current).map(
      normalizeProjectImages,
    );
    setSaving(true);
    try {
      const res = await adminFetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "paid-projects": JSON.stringify(toSave) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Franchise хадгалахад алдаа гарлаа");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      return true;
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Franchise хадгалахад алдаа гарлаа",
      );
      return false;
    } finally {
      setSaving(false);
    }
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
  };
}
