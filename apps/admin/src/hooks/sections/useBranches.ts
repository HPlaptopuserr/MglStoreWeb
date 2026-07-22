"use client";

import { useEffect, useState } from "react";
import { API, adminFetch } from "@/lib/api";
import { normalizeText } from "@/lib/sections/utils";
import type {
  BranchMapItem,
  BranchFormState,
  CardPartner,
} from "@/lib/sections/types";

const EMPTY_FORM: BranchFormState = { name: "", address: "", lat: "", lng: "" };

function readPartners(raw: unknown): CardPartner[] {
  if (Array.isArray(raw)) return raw as CardPartner[];
  const data = raw as { data?: CardPartner[]; partners?: CardPartner[] } | null;
  return data?.partners || data?.data || [];
}

function readBranches(raw: unknown): BranchMapItem[] {
  if (Array.isArray(raw)) return raw as BranchMapItem[];
  const data = raw as { data?: BranchMapItem[] } | null;
  return data?.data || [];
}

function isValidLatLng(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

export function useBranches(enabled: boolean) {
  const [branchItems, setBranchItems] = useState<BranchMapItem[]>([]);
  const [branchPartners, setBranchPartners] = useState<CardPartner[]>([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchLoadError, setBranchLoadError] = useState("");
  const [branchOrgId, setBranchOrgId] = useState<string>("");
  const [branchSaving, setBranchSaving] = useState(false);
  const [branchError, setBranchError] = useState("");
  const [branchSuccess, setBranchSuccess] = useState("");
  const [branchForm, setBranchForm] = useState<BranchFormState>(EMPTY_FORM);
  const [selectedRegisteredBranchId, setSelectedRegisteredBranchId] =
    useState<string>("");
  const [branchSearchCity, setBranchSearchCity] = useState("");
  const [branchSearchDistrict, setBranchSearchDistrict] = useState("");
  const [branchSearchKhoroo, setBranchSearchKhoroo] = useState("");

  useEffect(() => {
    if (!enabled) return;

    setBranchLoading(true);
    setBranchLoadError("");
    Promise.all([
      adminFetch(`${API}/partners?minimal=true`).then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(
            errorMessage(err, "Байгууллагын жагсаалт авахад алдаа гарлаа"),
          );
        }
        return r.json();
      }),
      adminFetch(`${API}/branches/map`).then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(
            errorMessage(err, "Салбарын жагсаалт авахад алдаа гарлаа"),
          );
        }
        return r.json();
      }),
    ])
      .then(([partnersRaw, branchesData]) => {
        const partners = readPartners(partnersRaw);
        const branches = readBranches(branchesData);

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
      .catch((error: unknown) => {
        setBranchLoadError(
          errorMessage(error, "Салбарын мэдээлэл ачаалахад алдаа гарлаа"),
        );
        setBranchPartners([]);
        setBranchItems([]);
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

  const isBranchLocationInRange =
    isBranchCoordsValid && isValidLatLng(parsedBranchLat, parsedBranchLng);

  const normalizedCity = normalizeText(branchSearchCity);
  const normalizedDistrict = normalizeText(branchSearchDistrict);
  const normalizedKhoroo = normalizeText(branchSearchKhoroo);

  const filteredRegisteredBranchItems = branchItems.filter((item) => {
    const haystack = normalizeText(
      `${item.name} ${item.address} ${item.organization.name}`,
    );
    if (normalizedCity && !haystack.includes(normalizedCity)) return false;
    if (normalizedDistrict && !haystack.includes(normalizedDistrict))
      return false;
    if (normalizedKhoroo && !haystack.includes(normalizedKhoroo)) return false;
    return true;
  });

  const selectedRegisteredBranch =
    branchItems.find((item) => item.id === selectedRegisteredBranchId) ||
    branchItems[0] ||
    null;

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

  const branchValidationError = (() => {
    if (!branchOrgId) return "Эхлээд байгууллага сонгоно уу";
    if (!branchForm.name.trim()) return "Салбарын нэр оруулна уу";
    if (!branchForm.address.trim()) return "Салбарын хаяг оруулна уу";
    if (!isBranchCoordsValid)
      return "Map дээр дарж эсвэл координат оруулж байршил сонгоно уу";
    if (!isBranchLocationInRange)
      return "Lat/Lng координатын range буруу байна";

    const normalizedName = normalizeText(branchForm.name);
    const duplicate = branchItems.some(
      (item) =>
        item.organizationId === branchOrgId &&
        normalizeText(item.name) === normalizedName,
    );
    if (duplicate)
      return "Энэ байгууллагад ижил нэртэй салбар бүртгэгдсэн байна";

    return "";
  })();

  const canCreateBranch = !branchSaving && !branchValidationError;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCreateBranch = async () => {
    setBranchError("");
    setBranchSuccess("");

    const parsedLat = Number(branchForm.lat);
    const parsedLng = Number(branchForm.lng);
    if (branchValidationError) {
      setBranchError(branchValidationError);
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
        throw new Error(errorMessage(err, "Салбар нэмэхэд алдаа гарлаа"));
      }

      const created = await res.json();
      const selectedOrg = branchPartners.find((p) => p.id === branchOrgId);

      if (selectedOrg) {
        const newItem: BranchMapItem = {
          ...created,
          organizationId: created.organizationId || selectedOrg.id,
          organization: created.organization || {
            id: selectedOrg.id,
            name: selectedOrg.name,
            slug: selectedOrg.slug || "",
            logoUrl: selectedOrg.logoUrl || null,
          },
        };
        setBranchItems((prev) => [newItem, ...prev]);
        setSelectedRegisteredBranchId(newItem.id);
      }

      setBranchForm(EMPTY_FORM);
      setBranchSuccess("Салбар амжилттай нэмэгдлээ");
    } catch (error: unknown) {
      setBranchError(errorMessage(error, "Салбар нэмэхэд алдаа гарлаа"));
    } finally {
      setBranchSaving(false);
    }
  };

  return {
    // raw state
    branchItems,
    branchPartners,
    branchLoading,
    branchLoadError,
    branchOrgId,
    setBranchOrgId,
    branchSaving,
    branchError,
    branchSuccess,
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
    isBranchLocationInRange,
    filteredRegisteredBranchItems,
    selectedRegisteredBranch,
    previewLat,
    previewLng,
    hasMapPreview,
    selectedBranchOrg,
    branchValidationError,
    canCreateBranch,
    // handlers
    handleCreateBranch,
  };
}
