"use client";
import { useEffect, useState } from "react";
import { DEMO_STATE } from "./demo-data";
import { isDemoState, type DemoState, type Member } from "./model";
const KEY = "mgl-2003-community-demo-v1";
export function useDemoDirectory(demo = true) {
  const [data, setData] = useState<DemoState>(
    demo ? DEMO_STATE : { members: [], requests: [] },
  );
  const [ready, setReady] = useState(!demo);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!demo) return;
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
  }, [demo]);
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
    data,
    ready,
    error,
    reset: () => save(DEMO_STATE),
    addMember: (member: Member) =>
      save({ ...data, members: [...data.members, member] }),
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
