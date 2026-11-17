"use client";
import { useSyncExternalStore } from "react";
import { parseClubWebsite, type MglClubMember } from "@mgl/types";
import { CompanyWebsite } from "./CompanyWebsite";
import {
  demoClubWebsite,
  demoSiteKey,
  withLocalWebsiteMedia,
} from "./website-template";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("company-site-preview", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("company-site-preview", callback);
  };
}
export function CompanyDemoWebsite({ member }: { member: MglClubMember }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(demoSiteKey(member.id, "published"));
      } catch {
        return null;
      }
    },
    () => null,
  );
  let site = demoClubWebsite(member);
  if (snapshot) {
    try {
      site = parseClubWebsite(JSON.parse(snapshot)) || site;
    } catch {
      /* Keep the default demonstration when browser data is invalid. */
    }
  }
  return (
    <CompanyWebsite
      member={member}
      site={withLocalWebsiteMedia(member, site)}
    />
  );
}
