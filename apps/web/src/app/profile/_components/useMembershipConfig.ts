"use client";

import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import type { MembershipType } from "../../association/MembershipSelection";
import type { MembershipUpgradeCopy } from "./MembershipActivationPanel";

export type ProfileMembershipConfig = {
  membershipTypes?: MembershipType[];
  upgradeModal?: MembershipUpgradeCopy & {
    eyebrow?: string;
    title?: string;
  };
};

export function useMembershipConfig() {
  const [config, setConfig] = useState<ProfileMembershipConfig | null>(null);

  useEffect(() => {
    fetch(`${API}/association/config`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data === "object") {
          setConfig(data as ProfileMembershipConfig);
        }
      })
      .catch(() => {});
  }, []);

  return config;
}
