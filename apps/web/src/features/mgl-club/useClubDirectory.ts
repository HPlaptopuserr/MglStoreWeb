"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MglClubDirectoryPage,
  MglClubMember,
  MglClubServiceGroup,
} from "@mgl/types";
import { API } from "@/lib/api";
export function useClubDirectory(
  query: string,
  sector: string,
  city: string,
  scope = "services",
  enabled = true,
) {
  const [members, setMembers] = useState<MglClubMember[]>([]);
  const [services, setServices] = useState<MglClubServiceGroup[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(
    async (after?: string) => {
      controller.current?.abort();
      const request = new AbortController();
      controller.current = request;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          scope,
          sector,
          city,
          ...(after ? { cursor: after } : {}),
        });
        const response = await fetch(
          `${API}/forms/mgl-club/members?${params}`,
          { signal: request.signal },
        );
        if (!response.ok)
          throw new Error(
            "Гишүүдийн мэдээллийг ачаалж чадсангүй. Дахин оролдоно уу.",
          );
        const page: MglClubDirectoryPage = await response.json();
        if (request.signal.aborted) return;
        setMembers((previous) =>
          after ? [...previous, ...page.members] : page.members,
        );
        setCursor(page.nextCursor);
        setServices(page.services ?? []);
      } catch (cause) {
        if (!request.signal.aborted)
          setError(
            cause instanceof TypeError
              ? "Мэдээлэлтэй холбогдож чадсангүй. Дахин оролдоно уу."
              : cause instanceof Error
                ? cause.message
                : "Холболтын алдаа гарлаа.",
          );
      } finally {
        if (!request.signal.aborted) setLoading(false);
      }
    },
    [query, sector, city, scope],
  );
  useEffect(() => {
    if (!enabled) return;
    controller.current?.abort();
    setLoading(true);
    setMembers([]);
    setServices([]);
    setCursor(null);
    setError("");
    const refreshPublished = () => setRetry((value) => value + 1);
    const refreshVisible = () => {
      if (!document.hidden) void load();
    };
    const refreshOtherTab = (event: StorageEvent) => {
      if (event.key === "mgl-club-company-published") refreshPublished();
    };
    window.addEventListener("mgl-club-company-published", refreshPublished);
    window.addEventListener("storage", refreshOtherTab);
    document.addEventListener("visibilitychange", refreshVisible);
    const timer = window.setTimeout(() => {
      void load();
    }, 300);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(
        "mgl-club-company-published",
        refreshPublished,
      );
      window.removeEventListener("storage", refreshOtherTab);
      document.removeEventListener("visibilitychange", refreshVisible);
      controller.current?.abort();
    };
  }, [load, retry, enabled]);
  return {
    members,
    services,
    loading,
    error,
    cursor,
    loadMore: () => {
      if (cursor && !loading) void load(cursor);
    },
    retry: () => setRetry((value) => value + 1),
  };
}
