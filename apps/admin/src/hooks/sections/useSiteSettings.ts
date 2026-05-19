"use client";

import { useEffect, useRef, useState } from "react";
import { API, adminFetch } from "@/lib/api";

import { ServiceCategory } from "@/lib/sections/types";

export function useSiteSettings() {
  const [banners, setBanners] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [mglServices, setMglServicesRaw] = useState<ServiceCategory[]>([]);
  const mglServicesRef = useRef<ServiceCategory[]>([]);

  const setMglServices = (update: ServiceCategory[] | ((prev: ServiceCategory[]) => ServiceCategory[])) => {
    setMglServicesRaw((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      mglServicesRef.current = next;
      return next;
    });
  };
  const [showBranchMapOnWeb, setShowBranchMapOnWeb] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [branchMapVisibilitySaving, setBranchMapVisibilitySaving] = useState(false);

  useEffect(() => {
    adminFetch(`${API}/site-settings`)
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
        body: JSON.stringify({ "promo-banners": JSON.stringify(currentBanners) }),
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
        body: JSON.stringify({ "home-categories": JSON.stringify(currentCategories) }),
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
    showBranchMapOnWeb,
    saving,
    saved,
    branchMapVisibilitySaving,
    saveBanners,
    saveCategories,
    saveMglServices,
    toggleBranchMapOnWeb,
  };
}
