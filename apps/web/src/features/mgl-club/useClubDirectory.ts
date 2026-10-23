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
            cause instanceof Error ? cause.message : "Холболтын алдаа гарлаа.",
          );
      } finally {
        if (!request.signal.aborted) setLoading(false);
      }
    },
    [query, sector, city, scope],
  );
  useEffect(() => {
    controller.current?.abort();
    setLoading(true);
    setMembers([]);
    setServices([]);
    setCursor(null);
    setError("");
    const timer = window.setTimeout(() => {
      void load();
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.current?.abort();
    };
  }, [load, retry]);
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
