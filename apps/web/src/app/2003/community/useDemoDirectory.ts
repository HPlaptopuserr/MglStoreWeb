"use client";
import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { DEMO_STATE } from "./demo-data";
import { isDemoState, type DemoState, type Member } from "./model";
const KEY = "mgl-2003-community-demo-v1";
export function useDemoDirectory(demo = true) {
  const [data, setData] = useState<DemoState>(
    demo ? DEMO_STATE : { members: [], requests: [] },
  );
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!demo) {
      const controller = new AbortController();
      setReady(false);
      setError("");
      async function load() {
        try {
          const response = await fetch(`${API}/forms/2003/members`, {
            cache: "no-store",
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(20000),
            ]),
          });
          if (!response.ok) throw new Error("Directory request failed");
          const result: unknown = await response.json();
          if (!isDemoState(result))
            throw new Error("Invalid directory response");
          if (!controller.signal.aborted) setData(result);
        } catch {
          if (!controller.signal.aborted)
            setError("Танилцуулгуудыг ачаалж чадсангүй. Дахин оролдоно уу.");
        } finally {
          if (!controller.signal.aborted) setReady(true);
        }
      }
      void load();
      return () => controller.abort();
    }
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isDemoState(parsed))
          setData({
            ...parsed,
            members: parsed.members.map((member) => {
              const example = DEMO_STATE.members.find(
                (item) => item.id === member.id,
              );
              return member.activity || !example
                ? member
                : {
                    ...member,
                    activity: example.activity,
                    role: example.role,
                    bio: example.bio,
                  };
            }),
          });
        else
          setError(
            "Хадгалсан туршилтын мэдээлэл буруу байна. Анхны жишээг харууллаа.",
          );
      }
    } catch {
      setError("Хадгалсан жишээг уншиж чадсангүй. Анхны мэдээллийг харууллаа.");
    }
    setReady(true);
  }, [demo, revision]);
  function save(next: DemoState) {
    if (!demo) return;
    setData(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setError("");
    } catch {
      setError(
        "Энэ браузерт хадгалж чадсангүй. Хуудас хаахад өөрчлөлт арилна.",
      );
    }
  }
  return {
    retry: () => setRevision((value) => value + 1),
    data,
    ready,
    error,
    reset: () => save(DEMO_STATE),
    addMember: (member: Member) =>
      save({
        ...data,
        members: data.members.some((item) => item.id === member.id)
          ? data.members.map((item) => (item.id === member.id ? member : item))
          : [...data.members, member],
      }),
    removeMember: (id: string) =>
      save({
        ...data,
        members: data.members.filter((member) => member.id !== id),
        requests: data.requests.filter((request) => request.memberId !== id),
      }),
    toggleRequest: (id: string) =>
      save({
        ...data,
        requests: data.requests.map((request) =>
          request.id === id
            ? { ...request, resolved: !request.resolved }
            : request,
        ),
      }),
  };
}
