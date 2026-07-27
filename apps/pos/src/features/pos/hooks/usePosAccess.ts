"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API, API_BASE } from "@/lib/api";
import {
  isFeatureEnabled,
  MULTI_PRICE_SALES_FEATURE_KEY,
  POS_FEATURE_KEY,
} from "@/lib/vendor-features";

type PosAccessStatus = "checking" | "enabled" | "disabled";

type VendorUserStorage = {
  organizationId?: string;
};

type AuthMeResponse = {
  organizationId?: string;
};

function readStoredVendorUser(): VendorUserStorage {
  try {
    const raw = localStorage.getItem("vendor_user");
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as VendorUserStorage;
  } catch {
    return {};
  }
}

export function usePosAccess() {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState("");
  const [status, setStatus] = useState<PosAccessStatus>("checking");
  const [message, setMessage] = useState("POS кассын эрх шалгаж байна...");
  const [multiPriceEnabled, setMultiPriceEnabled] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("vendor_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    const storedUser = readStoredVendorUser();
    if (storedUser.organizationId) {
      setOrganizationId(storedUser.organizationId);
      return;
    }

    fetch(`${API_BASE}/auth/me`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Session expired");
        const me = (await res.json()) as AuthMeResponse;
        if (!me.organizationId) throw new Error("Organization missing");
        if (cancelled) return;
        localStorage.setItem(
          "vendor_user",
          JSON.stringify({ ...storedUser, ...me }),
        );
        setOrganizationId(me.organizationId);
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem("vendor_token");
        localStorage.removeItem("vendor_user");
        router.replace("/login");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;

    setStatus("checking");
    setMessage("POS кассын эрх шалгаж байна...");

    fetch(`${API}/site-settings`, { cache: "no-store" })
      .then(async (res) => {
        const settings = res.ok
          ? ((await res.json()) as Record<string, unknown>)
          : {};
        if (cancelled) return;
        setMultiPriceEnabled(
          isFeatureEnabled(
            settings,
            MULTI_PRICE_SALES_FEATURE_KEY,
            organizationId,
          ),
        );

        if (isFeatureEnabled(settings, POS_FEATURE_KEY, organizationId)) {
          setStatus("enabled");
          return;
        }

        setMessage(
          "Танай байгууллагад POS кассын эрх идэвхжээгүй байна. Admin дээр pos-enabled feature-г асаана уу.",
        );
        setStatus("disabled");
      })
      .catch(() => {
        if (cancelled) return;
        setMessage(
          "POS эрх шалгах үед API-тай холбогдож чадсангүй. API server ажиллаж байгаа эсэхийг шалгана уу.",
        );
        setStatus("disabled");
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return {
    organizationId,
    posAccess: status,
    posAccessMessage: message,
    posEnabled: status === "enabled",
    multiPriceEnabled,
  };
}
