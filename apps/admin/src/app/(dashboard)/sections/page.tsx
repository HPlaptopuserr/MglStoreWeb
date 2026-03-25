"use client";

import { useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  Tag,
  Save,
  Trash2,
  Plus,
  X,
  CheckCircle2,
  Loader2,
  MoveLeft,
  MoveRight,
  CreditCard,
  Printer,
  Wrench,
  MapPin,
  Navigation,
} from "lucide-react";
import Image from "next/image";
import { API } from "@/lib/api";
import { QrGeneratorPanel } from "@/components/organisms";
import {
  BusinessCardFront,
  BusinessCardBack,
  CARD_COLOR_SCHEMES,
  type CardColorScheme,
  type BusinessCardData,
} from "@mgl/ui";

const SECTIONS = [
  { key: "banner", label: "Промо баннер", icon: ImagePlus },
  { key: "categories", label: "Ангилалууд", icon: Tag },
  { key: "branches", label: "Салбар байршил", icon: MapPin },
  { key: "cards", label: "Карт хэвлэх", icon: CreditCard },
  { key: "qr", label: "QR Generator", icon: Wrench },
];

type SectionKey = "banner" | "categories" | "branches" | "cards" | "qr";

type CardPartner = {
  id: string;
  name: string;
  slug: string;
  type?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  businessCategory?: string | null;
  phone?: string | null;
  address?: string | null;
};

type BranchMapItem = {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  organizationId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  createdAt?: string;
};

const SCHEME_ORDER: CardColorScheme[] = [
  "default",
  "dark",
  "charcoal",
  "navy",
  "forest",
];

const MAX_BANNERS = 3;
const PRINT_COPIES = 8;
const PRINT_SCALE = 0.84;
const MIN_BRANCH_DISTANCE_METERS = 500;

function buildBackPrintOrder(total: number, columns: number): number[] {
  const order: number[] = [];
  for (let i = 0; i < total; i += columns) {
    const row = Array.from({ length: columns }, (_, idx) => i + idx).filter(
      (idx) => idx < total,
    );
    order.push(...row.reverse());
  }
  return order;
}

async function getLeafletLib() {
  const leafletModule: any = await import("leaflet");
  return leafletModule?.default ?? leafletModule;
}

function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

export default function SectionsPage() {
  const [active, setActive] = useState<SectionKey>("banner");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Banner section state — support up to MAX_BANNERS images
  const [banners, setBanners] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Categories section state
  const [categories, setCategories] = useState<string[]>([]);
  const [newCat, setNewCat] = useState("");

  // Cards section state
  const [cardPartners, setCardPartners] = useState<CardPartner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [cardScheme, setCardScheme] = useState<CardColorScheme>("default");
  const [webBaseUrl, setWebBaseUrl] = useState<string>("https://mglstore.mn");
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Branch map section state
  const [branchPartners, setBranchPartners] = useState<CardPartner[]>([]);
  const [branchOrgId, setBranchOrgId] = useState<string>("");
  const [branchSaving, setBranchSaving] = useState(false);
  const [branchMapVisibilitySaving, setBranchMapVisibilitySaving] = useState(false);
  const [showBranchMapOnWeb, setShowBranchMapOnWeb] = useState(false);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchMapError, setBranchMapError] = useState<string>("");
  const [selectedRegisteredBranchId, setSelectedRegisteredBranchId] = useState<string>("");
  const [branchSearchCity, setBranchSearchCity] = useState("");
  const [branchSearchDistrict, setBranchSearchDistrict] = useState("");
  const [branchSearchKhoroo, setBranchSearchKhoroo] = useState("");
  const [branchForm, setBranchForm] = useState({
    name: "",
    address: "",
    lat: "",
    lng: "",
  });
  const [branchItems, setBranchItems] = useState<BranchMapItem[]>([]);
  const branchMapPickerRef = useRef<HTMLDivElement>(null);
  const branchMapInstanceRef = useRef<any>(null);
  const branchMarkerInstanceRef = useRef<any>(null);
  const branchRadiusCircleRef = useRef<any>(null);
  const branchPreviewMapRef = useRef<HTMLDivElement>(null);
  const branchPreviewMapInstanceRef = useRef<any>(null);
  const branchPreviewLayerRef = useRef<any>(null);

  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_WEB_URL;
    if (envUrl && envUrl.trim()) {
      setWebBaseUrl(envUrl.trim());
      return;
    }

    if (typeof window !== "undefined") {
      const { protocol, hostname } = window.location;
      const host = hostname.toLowerCase();

      if (hostname === "localhost" || hostname === "127.0.0.1") {
        // Admin runs on 3001, web runs on 3000 in local dev
        setWebBaseUrl("http://localhost:3000");
        return;
      }

      // Map admin/vendor domains to the public web domain for QR/profile links.
      if (host === "mgl-admin.onrender.com" || host === "mgl-vendor.onrender.com") {
        setWebBaseUrl("https://mgl-web-n7wg.onrender.com");
        return;
      }

      if (host.startsWith("admin.") || host.startsWith("vendor.")) {
        const rootHost = host.split(".").slice(1).join(".");
        setWebBaseUrl(`${protocol}//${rootHost}`);
        return;
      }

      setWebBaseUrl(`${protocol}//${host}`);
      return;
    }

    setWebBaseUrl("https://mglstore.mn");
  }, []);

  useEffect(() => {
    fetch(`${API}/site-settings`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, string>) => {
        // Multi-banner key
        if (data["promo-banners"]) {
          try {
            const parsed = JSON.parse(data["promo-banners"]);
            if (Array.isArray(parsed)) {
              setBanners(parsed);
            }
          } catch {}
        } else if (data["promo-banner"]) {
          // Migrate old single-banner setting
          setBanners([data["promo-banner"]]);
        }

        if (data["home-categories"]) {
          try {
            const parsed = JSON.parse(data["home-categories"]);
            if (Array.isArray(parsed)) setCategories(parsed);
          } catch {}
        }

        const showMapRaw = data["show-branch-map"];
        setShowBranchMapOnWeb(
          showMapRaw === "true" || showMapRaw === "1" || showMapRaw === "on",
        );
      })
      .catch(() => {});
  }, []);

  const handleToggleBranchMapOnWeb = async () => {
    const nextValue = !showBranchMapOnWeb;
    setShowBranchMapOnWeb(nextValue);
    setBranchMapVisibilitySaving(true);

    try {
      const res = await fetch(`${API}/site-settings/show-branch-map`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: nextValue ? "true" : "false" }),
      });

      if (!res.ok) {
        throw new Error("Салбарын map-ийн төлвийг хадгалах үед алдаа гарлаа");
      }
    } catch {
      setShowBranchMapOnWeb(!nextValue);
      alert("Салбарын map-ийн төлвийг хадгалах үед алдаа гарлаа");
    } finally {
      setBranchMapVisibilitySaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (banners.length >= MAX_BANNERS) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setBanners((prev) => [...prev, result]);
    };
    reader.readAsDataURL(file);
    // Reset input so user can pick the same file again
    e.target.value = "";
  };

  const removeBanner = (index: number) => {
    setBanners((prev) => prev.filter((_, i) => i !== index));
  };

  const swapBanners = (index1: number, index2: number) => {
    setBanners((prev) => {
      const newArr = [...prev];
      // Swap items
      const temp = newArr[index1];
      newArr[index1] = newArr[index2];
      newArr[index2] = temp;
      return newArr;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const body: Record<string, string> = {};
    if (active === "banner") {
      body["promo-banners"] = JSON.stringify(banners);
    } else if (active === "categories") {
      body["home-categories"] = JSON.stringify(categories);
    }

    try {
      await fetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const addCategory = () => {
    const trimmed = newCat.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
      setNewCat("");
    }
  };

  const removeCategory = (cat: string) => {
    setCategories(categories.filter((c) => c !== cat));
  };

  // Fetch partners when cards tab is activated
  useEffect(() => {
    if (active !== "cards") return;
    fetch(`${API}/partners`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CardPartner[]) => {
        setCardPartners(data);
        if (!selectedPartnerId && data.length > 0) {
          setSelectedPartnerId(data[0].id);
        }
      })
      .catch(() => {});
  }, [active]);

  // Fetch data when branches tab is activated
  useEffect(() => {
    if (active !== "branches") return;

    setBranchLoading(true);
    Promise.all([
      fetch(`${API}/partners`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`${API}/branches/map`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(([partnersData, branchesData]) => {
        const partners = Array.isArray(partnersData)
          ? (partnersData as CardPartner[])
          : [];
        const branches = Array.isArray(branchesData)
          ? (branchesData as BranchMapItem[])
          : [];

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
  }, [active]);

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

    const hasTooCloseBranch = allRegisteredBranchItems.some((item) => {
      if (item.lat === null || item.lng === null) return false;
      const distanceMeters = haversineDistanceMeters(
        parsedLat,
        parsedLng,
        item.lat,
        item.lng,
      );
      return distanceMeters < MIN_BRANCH_DISTANCE_METERS;
    });

    if (hasTooCloseBranch) {
      alert("500м радиус дотор өөр салбар байна. Илүү хол байршил сонгоно уу.");
      return;
    }

    setBranchSaving(true);
    try {
      const res = await fetch(`${API}/partners/${branchOrgId}/branches`, {
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
        throw new Error(err?.message || "Салбар нэмэхэд алдаа гарлаа");
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

      setBranchForm({ name: "", address: "", lat: "", lng: "" });
    } catch (error: any) {
      alert(error?.message || "Салбар нэмэхэд алдаа гарлаа");
    } finally {
      setBranchSaving(false);
    }
  };

  const handlePrint = () => {
    if (!printAreaRef.current) return;

    const existingRuntime = document.getElementById("card-print-area-runtime");
    if (existingRuntime) existingRuntime.remove();

    const existingStyle = document.getElementById("card-print-override");
    if (existingStyle) existingStyle.remove();

    const runtimeRoot = printAreaRef.current.cloneNode(true) as HTMLDivElement;
    runtimeRoot.id = "card-print-area-runtime";
    runtimeRoot.style.display = "block";
    document.body.appendChild(runtimeRoot);

    const style = document.createElement("style");
    style.id = "card-print-override";
    style.textContent = `
      #card-print-area-runtime {
        position: fixed !important;
        left: -99999px !important;
        top: 0 !important;
        width: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      @media print {
        @page { size: A4 portrait; margin: 6mm; }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body > *:not(#card-print-area-runtime) {
          display: none !important;
        }
        #card-print-area-runtime,
        #card-print-area-runtime * {
          visibility: visible !important;
        }
        #card-print-area-runtime {
          position: static !important;
          width: 100% !important;
          min-height: auto !important;
          display: block !important;
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        #card-print-area-runtime .print-page {
          min-height: auto !important;
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 6mm 5mm !important;
          align-content: start !important;
          justify-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
        }

        #card-print-area-runtime .print-page-front {
          break-after: page !important;
          page-break-after: always !important;
        }

        #card-print-area-runtime .print-card-slot {
          width: ${420 * PRINT_SCALE}px !important;
          height: ${240 * PRINT_SCALE}px !important;
          overflow: hidden !important;
          display: flex !important;
          align-items: flex-start !important;
          justify-content: center !important;
        }

        #card-print-area-runtime .print-card-slot > * {
          transform: scale(${PRINT_SCALE}) !important;
          transform-origin: top center !important;
        }
      }
    `;
    document.head.appendChild(style);

    const cleanup = () => {
      const existing = document.getElementById("card-print-override");
      if (existing) existing.remove();

      const runtime = document.getElementById("card-print-area-runtime");
      if (runtime) runtime.remove();
    };

    window.addEventListener("afterprint", cleanup, { once: true });

    window.print();
  };

  const selectedPartner = cardPartners.find((p) => p.id === selectedPartnerId);
  const profileTarget = selectedPartner
    ? (selectedPartner.slug?.trim() || selectedPartner.id)
    : "";
  const cardData: BusinessCardData | null = selectedPartner
    ? {
        name: selectedPartner.name,
        type: selectedPartner.type ?? undefined,
        slug: profileTarget,
        profileTarget,
        profileId: selectedPartner.id,
        category: selectedPartner.businessCategory ?? undefined,
        phone: selectedPartner.phone ?? undefined,
        address: selectedPartner.address ?? undefined,
        logoUrl: selectedPartner.logoUrl ?? undefined,
        bannerUrl: selectedPartner.bannerUrl ?? undefined,
      }
    : null;
  const qrPreviewUrl = cardData
    ? `${webBaseUrl}/organizations/${encodeURIComponent(cardData.profileTarget || cardData.slug)}${cardData.profileId ? `?oid=${encodeURIComponent(cardData.profileId)}` : ""}`
    : "";
  const printSlots = Array.from({ length: PRINT_COPIES }, (_, i) => i);
  const backPrintSlots = buildBackPrintOrder(PRINT_COPIES, 2);
  const selectedBranchOrg = branchPartners.find((p) => p.id === branchOrgId);
  const parsedBranchLat = Number(branchForm.lat);
  const parsedBranchLng = Number(branchForm.lng);
  const allRegisteredBranchItems = branchItems;
  const normalizedCity = normalizeText(branchSearchCity);
  const normalizedDistrict = normalizeText(branchSearchDistrict);
  const normalizedKhoroo = normalizeText(branchSearchKhoroo);
  const filteredRegisteredBranchItems = allRegisteredBranchItems.filter((item) => {
    const haystack = normalizeText(
      `${item.name} ${item.address} ${item.organization.name}`,
    );

    if (normalizedCity && !haystack.includes(normalizedCity)) return false;
    if (normalizedDistrict && !haystack.includes(normalizedDistrict)) return false;
    if (normalizedKhoroo && !haystack.includes(normalizedKhoroo)) return false;
    return true;
  });
  const selectedRegisteredBranch =
    allRegisteredBranchItems.find((item) => item.id === selectedRegisteredBranchId) ||
    allRegisteredBranchItems[0] ||
    null;
  const isBranchCoordsValid =
    branchForm.lat.trim() !== "" &&
    branchForm.lng.trim() !== "" &&
    Number.isFinite(parsedBranchLat) &&
    Number.isFinite(parsedBranchLng);
  const previewLat = isBranchCoordsValid
    ? parsedBranchLat
    : selectedRegisteredBranch?.lat ?? null;
  const previewLng = isBranchCoordsValid
    ? parsedBranchLng
    : selectedRegisteredBranch?.lng ?? null;
  const hasMapPreview =
    previewLat !== null &&
    previewLng !== null &&
    Number.isFinite(previewLat) &&
    Number.isFinite(previewLng);
  const draftNearbyBranches = isBranchCoordsValid
    ? allRegisteredBranchItems
        .filter((item) => item.lat !== null && item.lng !== null)
        .map((item) => {
          const distanceMeters = haversineDistanceMeters(
            parsedBranchLat,
            parsedBranchLng,
            item.lat as number,
            item.lng as number,
          );
          return { item, distanceMeters };
        })
        .filter(({ distanceMeters }) => distanceMeters < MIN_BRANCH_DISTANCE_METERS)
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
    : [];
  const nearestDraftConflict = draftNearbyBranches[0] || null;
  const branchMapAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  useEffect(() => {
    if (active !== "branches") {
      if (branchMapInstanceRef.current) {
        branchMapInstanceRef.current.remove();
        branchMapInstanceRef.current = null;
        branchMarkerInstanceRef.current = null;
        branchRadiusCircleRef.current = null;
      }
      return;
    }

    if (branchLoading) return;

    if (!branchMapPickerRef.current || branchMapInstanceRef.current) return;

    setBranchMapError("");
    let isCancelled = false;

    const setupMap = async () => {
      const L = await getLeafletLib();
      if (isCancelled || !branchMapPickerRef.current || branchMapInstanceRef.current) return;

      const map = L.map(branchMapPickerRef.current).setView([47.9184, 106.9177], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: branchMapAttribution,
      }).addTo(map);

      map.on("click", (event: any) => {
        const { lat, lng } = event.latlng;
        setBranchForm((prev) => ({
          ...prev,
          lat: lat.toFixed(6),
          lng: lng.toFixed(6),
        }));
      });

      // Ensure tiles/layout are recalculated after the container is painted.
      setTimeout(() => {
        map.invalidateSize();
      }, 0);

      branchMapInstanceRef.current = map;
    };

    setupMap().catch((error) => {
      console.error("Failed to initialize branch map", error);
      setBranchMapError("Map ачаалахад алдаа гарлаа. Хуудсаа дахин ачаална уу.");
    });

    return () => {
      isCancelled = true;
    };
  }, [active, branchLoading]);

  useEffect(() => {
    if (!branchMapInstanceRef.current) return;

    if (!isBranchCoordsValid) {
      if (branchMarkerInstanceRef.current) {
        branchMarkerInstanceRef.current.remove();
        branchMarkerInstanceRef.current = null;
      }
      if (branchRadiusCircleRef.current) {
        branchRadiusCircleRef.current.remove();
        branchRadiusCircleRef.current = null;
      }
      return;
    }

    const map = branchMapInstanceRef.current;
    const nextLatLng: [number, number] = [parsedBranchLat, parsedBranchLng];

    const syncMarker = async () => {
      const L = await getLeafletLib();
      if (!branchMapInstanceRef.current) return;

      if (branchMarkerInstanceRef.current) {
        branchMarkerInstanceRef.current.setLatLng(nextLatLng);
      } else {
        branchMarkerInstanceRef.current = L.circleMarker(nextLatLng, {
          radius: 8,
          color: nearestDraftConflict ? "#dc2626" : "#7c3aed",
          weight: 2,
          fillColor: nearestDraftConflict ? "#fca5a5" : "#a78bfa",
          fillOpacity: 0.8,
        }).addTo(map);
      }

      if (branchRadiusCircleRef.current) {
        branchRadiusCircleRef.current.setLatLng(nextLatLng);
        branchRadiusCircleRef.current.setRadius(MIN_BRANCH_DISTANCE_METERS);
        branchRadiusCircleRef.current.setStyle({
          color: nearestDraftConflict ? "#ef4444" : "#7c3aed",
          fillColor: nearestDraftConflict ? "#fca5a5" : "#c4b5fd",
        });
      } else {
        branchRadiusCircleRef.current = L.circle(nextLatLng, {
          radius: MIN_BRANCH_DISTANCE_METERS,
          color: nearestDraftConflict ? "#ef4444" : "#7c3aed",
          weight: 2,
          fillColor: nearestDraftConflict ? "#fca5a5" : "#c4b5fd",
          fillOpacity: 0.18,
        }).addTo(map);
      }

      if (map.getZoom() < 14) {
        map.setView(nextLatLng, 14);
      } else {
        map.panTo(nextLatLng);
      }
    };

    syncMarker().catch(() => {});
  }, [isBranchCoordsValid, parsedBranchLat, parsedBranchLng, nearestDraftConflict]);

  useEffect(() => {
    if (active !== "branches") {
      if (branchPreviewMapInstanceRef.current) {
        branchPreviewMapInstanceRef.current.remove();
        branchPreviewMapInstanceRef.current = null;
        branchPreviewLayerRef.current = null;
      }
      return;
    }

    if (branchLoading) return;
    if (!branchPreviewMapRef.current || branchPreviewMapInstanceRef.current) return;

    let isCancelled = false;

    const setupPreviewMap = async () => {
      const L = await getLeafletLib();
      if (isCancelled || !branchPreviewMapRef.current || branchPreviewMapInstanceRef.current) {
        return;
      }

      const map = L.map(branchPreviewMapRef.current).setView([47.9184, 106.9177], 11);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: branchMapAttribution,
      }).addTo(map);

      branchPreviewLayerRef.current = L.layerGroup().addTo(map);
      branchPreviewMapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 0);
    };

    setupPreviewMap().catch((error) => {
      console.error("Failed to initialize branch preview map", error);
    });

    return () => {
      isCancelled = true;
    };
  }, [active, branchLoading, branchMapAttribution]);

  useEffect(() => {
    if (!branchPreviewMapInstanceRef.current || !branchPreviewLayerRef.current) return;

    const syncPreviewMarkers = async () => {
      const L = await getLeafletLib();
      if (!branchPreviewMapInstanceRef.current || !branchPreviewLayerRef.current) return;

      const map = branchPreviewMapInstanceRef.current;
      const layer = branchPreviewLayerRef.current;
      layer.clearLayers();

      const bounds = L.latLngBounds([]);
      const activeId = selectedRegisteredBranch?.id || selectedRegisteredBranchId;

      allRegisteredBranchItems.forEach((item) => {
        if (item.lat === null || item.lng === null) return;

        const latLng: [number, number] = [item.lat, item.lng];
        const isActive = item.id === activeId;

        const marker = L.circleMarker(latLng, {
          radius: isActive ? 9 : 7,
          color: isActive ? "#7c3aed" : "#334155",
          weight: isActive ? 3 : 2,
          fillColor: isActive ? "#c4b5fd" : "#94a3b8",
          fillOpacity: isActive ? 0.95 : 0.8,
        });

        marker.bindTooltip(item.name, { direction: "top", offset: [0, -8] });
        marker.on("click", () => setSelectedRegisteredBranchId(item.id));
        marker.addTo(layer);

        L.circle(latLng, {
          radius: MIN_BRANCH_DISTANCE_METERS,
          color: isActive ? "#7c3aed" : "#64748b",
          weight: 1,
          fillColor: isActive ? "#c4b5fd" : "#cbd5e1",
          fillOpacity: isActive ? 0.12 : 0.06,
        }).addTo(layer);

        bounds.extend(latLng);
      });

      if (isBranchCoordsValid) {
        const draftLatLng: [number, number] = [parsedBranchLat, parsedBranchLng];
        const draftMarker = L.circleMarker(draftLatLng, {
          radius: 8,
          color: "#16a34a",
          weight: 2,
          fillColor: "#86efac",
          fillOpacity: 0.85,
        });
        draftMarker.bindTooltip("Шинэ байршлын draft", { direction: "top", offset: [0, -8] });
        draftMarker.addTo(layer);
        bounds.extend(draftLatLng);
      }

      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.2), { maxZoom: 14 });
      }
    };

    syncPreviewMarkers().catch(() => {});
  }, [
    allRegisteredBranchItems,
    isBranchCoordsValid,
    parsedBranchLat,
    parsedBranchLng,
    selectedRegisteredBranch,
    selectedRegisteredBranchId,
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Нэмэлт хэсгүүд</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Нүүр хуудасны агуулгыг удирдана
          </p>
        </div>
        {active === "cards" ? (
          <button
            onClick={handlePrint}
            disabled={!cardData}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 shadow-sm"
          >
            <Printer size={16} />
            Карт хэвлэх
          </button>
        ) : active === "banner" || active === "categories" ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saved ? (
              <CheckCircle2 size={16} />
            ) : (
              <Save size={16} />
            )}
            {saved ? "Хадгалагдлаа" : "Хадгалах"}
          </button>
        ) : null}
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-0 rounded-3xl border border-slate-100 shadow-sm overflow-hidden bg-white min-h-[600px]">
        {/* Left sidebar */}
        <aside className="w-56 shrink-0 border-r border-slate-100 bg-slate-50 flex flex-col pt-4 pb-6 gap-1 px-3">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key as SectionKey)}
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                active === key
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </aside>

        {/* Right content */}
        <div className="flex-1 p-8">
          {/* ── BANNER SECTION ── */}
          {active === "banner" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">
                  Промо баннерууд
                </h2>
                <p className="text-sm text-slate-400">
                  Нүүр хуудсанд харагдах слайдер баннер зургууд. Хамгийн ихдээ{" "}
                  {MAX_BANNERS} зураг оруулах боломжтой.
                </p>
              </div>

              {/* Banner list */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {banners.map((url, i) => (
                  <div
                    key={i}
                    className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group aspect-[2/1] md:aspect-[5/3] shadow-sm hover:shadow-md transition-all"
                  >
                    <Image
                      src={url}
                      alt={`Баннер ${i + 1}`}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized={url.startsWith("data:")}
                    />
                    
                    {/* Dark gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {/* Order Controls */}
                    <div className="absolute top-3 left-3 z-10 flex text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-xl overflow-hidden backdrop-blur-md border border-white/10">
                      <button
                        onClick={() => swapBanners(i, i - 1)}
                        disabled={i === 0}
                        className="p-1.5 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Зүүн тийш зөөх"
                      >
                        <MoveLeft size={16} />
                      </button>
                      <div className="w-px bg-white/20" />
                      <button
                        onClick={() => swapBanners(i, i + 1)}
                        disabled={i === banners.length - 1}
                        className="p-1.5 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Баруун тийш зөөх"
                      >
                        <MoveRight size={16} />
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeBanner(i)}
                      className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
                      title="Устгах"
                    >
                      <Trash2 size={15} />
                    </button>

                    {/* Slide Number */}
                    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-white/90 text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                        Слайд {i + 1}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Add banner button */}
                {banners.length < MAX_BANNERS && (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="relative w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 transition-all flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-violet-600 aspect-[2/1] md:aspect-[5/3] group shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ImagePlus size={24} className="text-violet-500" strokeWidth={2} />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-sm text-slate-700">Баннер нэмэх</p>
                      <p className="text-xs mt-1 text-slate-500">
                        {banners.length} / {MAX_BANNERS}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {banners.length > 0 && (
                <button
                  onClick={() => setBanners([])}
                  className="self-start inline-flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  <Trash2 size={14} />
                  Бүх баннер устгах
                </button>
              )}
            </div>
          )}

          {/* ── CATEGORIES SECTION ── */}
          {active === "categories" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">
                  Нүүр хуудасны ангилалууд
                </h2>
                <p className="text-sm text-slate-400">
                  Нүүр хуудасны ангилалын хэсэгт харагдах ангилалуудыг удирдана.
                </p>
              </div>

              {/* Add category input */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  placeholder="Ангилал нэмэх..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
                <button
                  onClick={addCategory}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
                >
                  <Plus size={16} />
                  Нэмэх
                </button>
              </div>

              {/* Category chips */}
              {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                  <Tag size={40} strokeWidth={1.5} />
                  <p className="mt-3 text-sm font-medium">
                    Ангилал байхгүй байна
                  </p>
                  <p className="text-xs mt-1 text-slate-300">
                    Дээд талын оруулах хэсэгт ангилал нэмнэ үү
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <div
                      key={cat}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 group"
                    >
                      <Tag size={13} className="text-violet-500" />
                      {cat}
                      <button
                        onClick={() => removeCategory(cat)}
                        className="p-0.5 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── BRANCHES SECTION ── */}
          {active === "branches" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">
                  Салбарын байршил
                </h2>
                <p className="text-sm text-slate-400">
                  Нүүр хуудасны хамгийн доод хэсэгт харагдах map-д салбарын байршлыг нэмнэ.
                </p>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Web дээр map харуулах</p>
                    <p className="text-xs text-slate-500">
                      Асаалттай үед web нүүр хуудсанд салбарын map харагдана.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleBranchMapOnWeb}
                    disabled={branchMapVisibilitySaving}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      showBranchMapOnWeb ? "bg-violet-600" : "bg-slate-300"
                    } disabled:opacity-60`}
                    aria-label="Web map visibility toggle"
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        showBranchMapOnWeb ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {branchLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Loader2 size={34} className="animate-spin" />
                  <p className="mt-3 text-sm">Байгууллага болон салбарын мэдээлэл ачаалж байна...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Байгууллага сонгох
                    </label>
                    <select
                      value={branchOrgId}
                      onChange={(e) => setBranchOrgId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    >
                      {branchPartners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    {selectedBranchOrg && (
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">
                          Салбар нэмэгдэх газар
                        </p>
                        <p className="mt-1 text-sm font-bold text-indigo-900 break-words">
                          {selectedBranchOrg.name}
                        </p>
                        <p className="text-xs text-indigo-600 break-all">@{selectedBranchOrg.slug}</p>
                      </div>
                    )}

                    <input
                      type="text"
                      value={branchForm.name}
                      onChange={(e) =>
                        setBranchForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Салбарын нэр"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                    <input
                      type="text"
                      value={branchForm.address}
                      onChange={(e) =>
                        setBranchForm((prev) => ({ ...prev, address: e.target.value }))
                      }
                      placeholder="Салбарын хаяг"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="any"
                        value={branchForm.lat}
                        onChange={(e) =>
                          setBranchForm((prev) => ({ ...prev, lat: e.target.value }))
                        }
                        placeholder="Өргөрөг (lat)"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      />
                      <input
                        type="number"
                        step="any"
                        value={branchForm.lng}
                        onChange={(e) =>
                          setBranchForm((prev) => ({ ...prev, lng: e.target.value }))
                        }
                        placeholder="Уртраг (lng)"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      />
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
                        <p className="text-xs font-semibold text-slate-600">Pin дээр дарж координат сонгох</p>
                        <span className="text-[11px] text-slate-500">Map дээр click хийнэ үү</span>
                      </div>
                      <div ref={branchMapPickerRef} className="h-56 w-full" />
                      <div className="px-3 py-2 border-t border-slate-200 bg-slate-50">
                        <p className="text-[11px] text-slate-600">
                          Map дээр 500м радиус автоматаар тэмдэглэгдэнэ.
                        </p>
                      </div>
                      {branchMapError && (
                        <p className="px-3 py-2 text-xs text-rose-600 border-t border-rose-100 bg-rose-50">
                          {branchMapError}
                        </p>
                      )}
                    </div>

                    {nearestDraftConflict && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        500м дотор "{nearestDraftConflict.item.name}" салбар байна ({Math.round(nearestDraftConflict.distanceMeters)}м).
                        Өөр цэг сонгоно уу.
                      </div>
                    )}

                    <button
                      onClick={handleCreateBranch}
                      disabled={branchSaving || !branchOrgId || !!nearestDraftConflict}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
                    >
                      {branchSaving ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Plus size={15} />
                      )}
                      {branchSaving ? "Нэмж байна..." : "Салбар нэмэх"}
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Хаана орж байгааг харах preview
                      </p>
                      {hasMapPreview && (
                        <a
                          href={`https://maps.google.com/?q=${previewLat},${previewLng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700"
                        >
                          <Navigation size={13} />
                          Google Maps
                        </a>
                      )}
                    </div>

                    {hasMapPreview ? (
                      <div>
                        <div
                          ref={branchPreviewMapRef}
                          className="h-56 w-full rounded-xl border border-slate-200"
                        />
                        {!isBranchCoordsValid && selectedRegisteredBranch && (
                          <p className="mt-2 text-xs text-slate-500">
                            Сонгосон хаяг: {selectedRegisteredBranch.name}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="h-56 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-center px-6">
                        <p className="text-sm text-slate-500">
                          Lat/Lng оруулах эсвэл доорх жагсаалтаас хаяг сонгоход map preview энд харагдана.
                        </p>
                      </div>
                    )}

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <div className="px-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Бүртгэгдсэн хаягууд ({filteredRegisteredBranchItems.length}/{allRegisteredBranchItems.length})
                        </p>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={branchSearchCity}
                            onChange={(e) => setBranchSearchCity(e.target.value)}
                            placeholder="Хотоор хайх"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          />
                          <input
                            type="text"
                            value={branchSearchDistrict}
                            onChange={(e) => setBranchSearchDistrict(e.target.value)}
                            placeholder="Дүүргээр хайх"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          />
                          <input
                            type="text"
                            value={branchSearchKhoroo}
                            onChange={(e) => setBranchSearchKhoroo(e.target.value)}
                            placeholder="Хороогоор хайх"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          />
                        </div>
                      </div>
                      <div className="mt-2 max-h-44 overflow-y-auto pr-1 space-y-2">
                        {filteredRegisteredBranchItems.length === 0 ? (
                          <p className="text-sm text-slate-500 px-1">Одоогоор салбарын хаяг бүртгэгдээгүй байна.</p>
                        ) : (
                          filteredRegisteredBranchItems.map((item) => {
                            const isActive =
                              item.id ===
                              (selectedRegisteredBranch?.id || selectedRegisteredBranchId);

                            return (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => setSelectedRegisteredBranchId(item.id)}
                              className={`w-full rounded-xl border p-3 text-left transition-colors ${
                                isActive
                                  ? "border-violet-300 bg-violet-50"
                                  : "border-slate-100 bg-white hover:border-slate-200"
                              }`}
                            >
                              <p className="text-sm font-semibold text-slate-800 break-words">{item.name}</p>
                              <p className="text-xs text-slate-500 mt-1 break-words">{item.address}</p>
                              <p className="text-[11px] text-indigo-600 mt-1 break-words">{item.organization.name}</p>
                              <p className="text-xs text-slate-400 mt-1">{item.lat}, {item.lng}</p>
                            </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CARDS SECTION ── */}
          {active === "cards" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">
                  Бизнесийн карт хэвлэх
                </h2>
                <p className="text-sm text-slate-400">
                  Гишүүн байгууллагын бизнес карт үүсгэж хэвлэнэ. QR код уншуулахад
                  байгууллагын профайл руу хөтлөнө.
                </p>
              </div>

              {cardPartners.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 size={40} strokeWidth={1.5} className="animate-spin text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-400">
                    Байгууллагуудыг татаж байна...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  {/* Left: controls */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Байгууллага сонгох
                      </label>
                      <select
                        value={selectedPartnerId}
                        onChange={(e) => setSelectedPartnerId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                      >
                        {cardPartners.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        Өнгөний хоршил
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {SCHEME_ORDER.map((key) => {
                          const s = CARD_COLOR_SCHEMES[key];
                          const isActive = cardScheme === key;
                          return (
                            <button
                              key={key}
                              onClick={() => setCardScheme(key)}
                              title={s.label}
                              className={`flex flex-col items-center gap-1.5 transition-all ${
                                isActive
                                  ? "scale-110"
                                  : "opacity-60 hover:opacity-100 hover:scale-105"
                              }`}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  width: 44,
                                  height: 44,
                                  borderRadius: 10,
                                  background: s.bg,
                                  border: isActive
                                    ? `3px solid ${s.accent}`
                                    : "2px solid #e5e7eb",
                                  boxShadow: isActive
                                    ? `0 0 0 3px ${s.accent}40`
                                    : undefined,
                                  position: "relative",
                                  overflow: "hidden",
                                }}
                              >
                                <span
                                  style={{
                                    position: "absolute",
                                    bottom: 0,
                                    right: 0,
                                    width: "55%",
                                    height: "55%",
                                    background: s.accent,
                                    borderTopLeftRadius: 5,
                                  }}
                                />
                              </span>
                              <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight max-w-[52px]">
                                {s.label.split(" ")[0]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {cardData && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600 space-y-1.5">
                        <p>
                          <span className="font-semibold text-slate-800">Нэр: </span>
                          {cardData.name}
                        </p>
                        {cardData.category && (
                          <p>
                            <span className="font-semibold text-slate-800">Ангилал: </span>
                            {cardData.category}
                          </p>
                        )}
                        {cardData.phone && (
                          <p>
                            <span className="font-semibold text-slate-800">Утас: </span>
                            {cardData.phone}
                          </p>
                        )}
                        {cardData.address && (
                          <p>
                            <span className="font-semibold text-slate-800">Хаяг: </span>
                            {cardData.address}
                          </p>
                        )}
                        <div className="pt-2 mt-2 border-t border-slate-200">
                          <p className="text-xs font-semibold text-slate-500 mb-1">
                            QR шалгах линк (хэвлэгдэхгүй)
                          </p>
                          <a
                            href={qrPreviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 break-all underline underline-offset-2"
                          >
                            {qrPreviewUrl}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: card preview */}
                  <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/70 p-6 flex flex-col gap-6 items-center justify-start pt-6">
                    {cardData ? (
                      <>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">
                            Нүүр тал
                          </p>
                          <BusinessCardFront data={cardData} scheme={cardScheme} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">
                            Ар тал
                          </p>
                          <BusinessCardBack
                            data={cardData}
                            scheme={cardScheme}
                            webBaseUrl={webBaseUrl}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                        <CreditCard size={48} strokeWidth={1.5} />
                        <p className="mt-3 text-sm font-medium text-slate-400">
                          Байгууллага сонгоно уу
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {cardData && (
                <div
                  id="card-print-area"
                  ref={printAreaRef}
                  style={{ display: "none" }}
                >
                  <div className="print-page print-page-front">
                    {printSlots.map((slot) => (
                      <div key={`front-${slot}`} className="print-card-slot">
                        <BusinessCardFront data={cardData} scheme={cardScheme} />
                      </div>
                    ))}
                  </div>

                  <div className="print-page print-page-back">
                    {backPrintSlots.map((slot) => (
                      <div key={`back-${slot}`} className="print-card-slot">
                        <BusinessCardBack
                          data={cardData}
                          scheme={cardScheme}
                          webBaseUrl={webBaseUrl}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── QR GENERATOR SECTION ── */}
          {active === "qr" && <QrGeneratorPanel showHeader={false} />}
        </div>
      </div>
    </div>
  );
}
