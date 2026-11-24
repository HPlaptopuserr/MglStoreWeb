"use client";

import { useEffect, useState } from "react";
import type { RegisterConfig } from "@mgl/types";
import {
  fetchOrgRegisters,
  getPosRegisterIdKey,
  POS_REGISTER_ID_KEY,
} from "../api/register";
import { parseVendorSessionUser } from "../../session/vendor-session.model";
import {
  VENDOR_TOKEN_KEY,
  VENDOR_USER_KEY,
} from "../../../lib/vendor-session-storage";
import {
  UsbBridgeDownloadSection,
  USB_BRIDGE_INSTALLER_URL,
} from "./UsbBridgeDownloadSection";

type DownloadContext = {
  organizationId: string;
  registers: RegisterConfig[];
  selectedRegisterId: string | null;
};

export function UsbBridgeDownload() {
  const [context, setContext] = useState<DownloadContext | null>(null);

  useEffect(() => {
    if (!USB_BRIDGE_INSTALLER_URL) return;
    let cancelled = false;
    const token = localStorage.getItem(VENDOR_TOKEN_KEY);

    async function load() {
      try {
        const storedUser: unknown = JSON.parse(
          localStorage.getItem(VENDOR_USER_KEY) || "null",
        );
        const { organizationId } = parseVendorSessionUser(storedUser);
        if (!token || !organizationId) return;
        const registers = await fetchOrgRegisters();
        if (cancelled || localStorage.getItem(VENDOR_TOKEN_KEY) !== token)
          return;
        setContext({
          organizationId,
          registers,
          selectedRegisterId:
            localStorage.getItem(getPosRegisterIdKey(organizationId)) ||
            localStorage.getItem(POS_REGISTER_ID_KEY),
        });
      } catch {
        // Keep the optional download hidden when the current till cannot be verified.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!context) return null;
  return (
    <UsbBridgeDownloadSection
      {...context}
      installerUrl={USB_BRIDGE_INSTALLER_URL}
    />
  );
}
