"use client";

import { useEffect, useState } from "react";
import { API, adminFetch } from "@/lib/api";
import { haversineDistanceMeters, normalizeText } from "@/lib/sections/utils";
import { MIN_BRANCH_DISTANCE_METERS } from "@/lib/sections/constants";
import type { BranchMapItem, BranchFormState, CardPartner } from "@/lib/sections/types";

const EMPTY_FORM: BranchFormState = { name: "", address: "", lat: "", lng: "" };

export function useBranches(enabled: boolean) {
  const [branchItems, setBranchItems] = useState<BranchMapItem[]>([]);
  const [branchPartners, setBranchPartners] = useState<CardPartner[]>([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchOrgId, setBranchOrgId] = useState<string>("");
  const [branchSaving, setBranchSaving] = useState(false);
  const [branchForm, setBranchForm] = useState<BranchFormState>(EMPTY_FORM);
  const [selectedRegisteredBranchId, setSelectedRegisteredBranchId] = useState<string>("");
  const [branchSearchCity, setBranchSearchCity] = useState("");
  const [branchSearchDistrict, setBranchSearchDistrict] = useState("");
  const [branchSearchKhoroo, setBranchSearchKhoroo] = useState("");

  useEffect(() => {
    if (!enabled) return;

    setBranchLoading(true);
    Promise.all([
      adminFetch(`${API}/partners`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      adminFetch(`${API}/branches/map`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(([partnersData, branchesData]) => {
        const partners = Array.isArray(partnersData) ? (partnersData as CardPartner[]) : [];
        const branches = Array.isArray(branchesData) ? (branchesData as BranchMapItem[]) : [];

        setBranchPartners(partners);
        setBranchItems(branches);

        if (branches.length > 0) {
          setSelectedRegisteredBranchId((prev) => {
            if (prev && branches.some((b) => b.id === prev)) return prev;
            return branches[0].id;
          });
        } else {
          setSelectedRegisteredBranchId("");
        }

        if (partners.length > 0) {
          setBranchOrgId((prev) => {
            if (prev && partners.some((p) => p.id === prev)) return prev;
            return partners[0].id;
          });
        }
      })
      .finally(() => setBranchLoading(false));
  }, [enabled]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const parsedBranchLat = Number(branchForm.lat);
  const parsedBranchLng = Number(branchForm.lng);

  const isBranchCoordsValid =
    branchForm.lat.trim() !== "" &&
    branchForm.lng.trim() !== "" &&
    Number.isFinite(parsedBranchLat) &&
    Number.isFinite(parsedBranchLng);

  const normalizedCity = normalizeText(branchSearchCity);
  const normalizedDistrict = normalizeText(branchSearchDistrict);
  const normalizedKhoroo = normalizeText(branchSearchKhoroo);

  const filteredRegisteredBranchItems = branchItems.filter((item) => {
    const haystack = normalizeText(
      `${item.name} ${item.address} ${item.organization.name}`,
    );
    if (normalizedCity && !haystack.includes(normalizedCity)) return false;
    if (normalizedDistrict && !haystack.includes(normalizedDistrict)) return false;
    if (normalizedKhoroo && !haystack.includes(normalizedKhoroo)) return false;
    return true;
  });

  const selectedRegisteredBranch =
    branchItems.find((item) => item.id === selectedRegisteredBranchId) ||
    branchItems[0] ||
    null;

  const draftNearbyBranches = isBranchCoordsValid
    ? branchItems
        .filter((item) => item.lat !== null && item.lng !== null)
        .map((item) => ({
          item,
          distanceMeters: haversineDistanceMeters(
            parsedBranchLat,
            parsedBranchLng,
            item.lat as number,
            item.lng as number,
          ),
        }))
        .filter(({ distanceMeters }) => distanceMeters < MIN_BRANCH_DISTANCE_METERS)
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
    : [];

  const nearestDraftConflict = draftNearbyBranches[0] || null;

  const previewLat = isBranchCoordsValid
    ? parsedBranchLat
    : (selectedRegisteredBranch?.lat ?? null);
  const previewLng = isBranchCoordsValid
    ? parsedBranchLng
    : (selectedRegisteredBranch?.lng ?? null);
  const hasMapPreview =
    previewLat !== null &&
    previewLng !== null &&
    Number.isFinite(previewLat) &&
    Number.isFinite(previewLng);

  const selectedBranchOrg = branchPartners.find((p) => p.id === branchOrgId);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCreateBranch = async () => {
    if (!branchOrgId) {
      alert("Эхлээд байгууллага сонгоно уу");
      return;
    }
    if (!branchForm.name.trim() || !branchForm.address.trim()) {
      alert("Салбарын нэр болон хаяг оруулна уу");
      return;
    }

    const parsedLat = Number(branchForm.lat);
    const parsedLng = Number(branchForm.lng);
    if (
      branchForm.lat.trim() === "" ||
      branchForm.lng.trim() === "" ||
      !Number.isFinite(parsedLat) ||
      !Number.isFinite(parsedLng)
    ) {
      alert("Lat/Lng координатыг зөв оруулна уу");
      return;
    }

    if (nearestDraftConflict) {
      alert("500м радиус дотор өөр салбар байна. Илүү хол байршил сонгоно уу.");
      return;
    }

    setBranchSaving(true);
    try {
      const res = await adminFetch(`${API}/partners/${branchOrgId}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: branchForm.name,
          address: branchForm.address,
          lat: parsedLat,
          lng: parsedLng,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message || "Салбар нэмэхэд алдаа гарлаа");
      }

      const created = await res.json();
      const selectedOrg = branchPartners.find((p) => p.id === branchOrgId);

      if (selectedOrg) {
        const newItem: BranchMapItem = {
          ...created,
          organizationId: selectedOrg.id,
          organization: {
            id: selectedOrg.id,
            name: selectedOrg.name,
            slug: selectedOrg.slug,
            logoUrl: selectedOrg.logoUrl || null,
          },
        };
        setBranchItems((prev) => [newItem, ...prev]);
      }

      setBranchForm(EMPTY_FORM);
    } catch (error: any) {
      alert(error?.message || "Салбар нэмэхэд алдаа гарлаа");
    } finally {
      setBranchSaving(false);
    }
  };

  return {
    // raw state
    branchItems,
    branchPartners,
    branchLoading,
    branchOrgId,
    setBranchOrgId,
    branchSaving,
    branchForm,
    setBranchForm,
    selectedRegisteredBranchId,
    setSelectedRegisteredBranchId,
    branchSearchCity,
    setBranchSearchCity,
    branchSearchDistrict,
    setBranchSearchDistrict,
    branchSearchKhoroo,
    setBranchSearchKhoroo,
    // derived
    parsedBranchLat,
    parsedBranchLng,
    isBranchCoordsValid,
    filteredRegisteredBranchItems,
    selectedRegisteredBranch,
    nearestDraftConflict,
    previewLat,
    previewLng,
    hasMapPreview,
    selectedBranchOrg,
    // handlers
    handleCreateBranch,
  };
}
