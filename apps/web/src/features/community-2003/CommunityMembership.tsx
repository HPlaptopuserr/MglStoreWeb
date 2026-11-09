"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth-context";
import { API } from "@/lib/api";

interface Membership {
  joined: boolean;
  checking: boolean;
  markJoined: (memberId?: string) => void;
  memberId?: string;
  memberIds?: string[];
  clearMembership: (memberId?: string) => void;
}
const Context = createContext<Membership | null>(null);

export function CommunityMembership({ children }: { children: ReactNode }) {
  const { user, loading, authFetch } = useAuth();
  const scope = `${process.env.NODE_ENV === "development" ? "mgl-2003-demo-joined" : "mgl-2003-joined"}:${user?.id || "anonymous"}`;
  const [state, setState] = useState<{
    scope: string;
    joined: boolean;
    checking: boolean;
    memberId?: string;
    memberIds?: string[];
  }>({ scope: "", joined: false, checking: true });
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (loading) return;
    const controller = new AbortController();
    requestRef.current = controller;
    let remembered = false;
    let memberId: string | undefined;
    let memberIds: string[] = [];
    try {
      const stored = localStorage.getItem(scope);
      remembered = !!stored;
      if (stored && stored !== "yes") {
        try {
          const parsed: unknown = JSON.parse(stored);
          if (
            Array.isArray(parsed) &&
            parsed.every((id) => typeof id === "string")
          )
            memberIds = parsed;
          else memberIds = [stored];
        } catch {
          memberIds = [stored];
        }
      }
      memberId = memberIds.at(-1);
    } catch {
      /* Browser storage may be unavailable. */
    }
    setState({
      scope,
      joined: remembered,
      checking: !!user && process.env.NODE_ENV !== "development",
      memberId,
      memberIds,
    });
    if (user && process.env.NODE_ENV !== "development") {
      void (async () => {
        try {
          const response = await authFetch(`${API}/forms/2003/edit/mine`, {
            cache: "no-store",
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(15000),
            ]),
          });
          const body: unknown = await response.json();
          if (
            !response.ok ||
            typeof body !== "object" ||
            body === null ||
            !("responses" in body) ||
            !Array.isArray(body.responses)
          )
            throw new Error("Invalid membership response");
          if (!controller.signal.aborted)
            setState({
              scope,
              joined: body.responses.length > 0,
              checking: false,
            });
        } catch {
          if (!controller.signal.aborted)
            setState({ scope, joined: remembered, checking: false });
        }
      })();
    }
    return () => controller.abort();
  }, [scope, user, loading, authFetch]);
  function markJoined(memberId?: string) {
    requestRef.current?.abort();
    const memberIds = memberId
      ? [...new Set([...(state.memberIds || []), memberId])]
      : state.memberIds;
    try {
      localStorage.setItem(
        scope,
        memberIds?.length ? JSON.stringify(memberIds) : "yes",
      );
    } catch {
      /* Keep the current session state. */
    }
    setState({ scope, joined: true, checking: false, memberId, memberIds });
  }
  function clearMembership(memberId?: string) {
    requestRef.current?.abort();
    const memberIds = memberId
      ? (state.memberIds || []).filter((id) => id !== memberId)
      : [];
    try {
      if (memberIds.length)
        localStorage.setItem(scope, JSON.stringify(memberIds));
      else localStorage.removeItem(scope);
    } catch {
      /* Keep session state consistent. */
    }
    setState({
      scope,
      joined: memberIds.length > 0,
      checking: false,
      memberId: memberIds.at(-1),
      memberIds,
    });
  }
  return (
    <Context.Provider
      value={{
        joined: state.scope === scope && state.joined,
        checking: loading || state.scope !== scope || state.checking,
        markJoined,
        clearMembership,
        memberId: state.scope === scope ? state.memberId : undefined,
        memberIds: state.scope === scope ? state.memberIds : [],
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useCommunityMembership() {
  const value = useContext(Context);
  if (!value) throw new Error("CommunityMembership is required");
  return value;
}
export function CommunityJoinLink({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const { joined } = useCommunityMembership();
  return (
    <Link
      className={className}
      href={joined ? "/2003/mine" : "/2003/join?new=1"}
    >
      {joined ? "Миний жагсаалт" : children || "Нэгдэх"}
    </Link>
  );
}
export function RegistrationGate({
  children,
  createNew = false,
}: {
  children: ReactNode;
  createNew?: boolean;
}) {
  const { joined, checking } = useCommunityMembership();
  if (checking)
    return (
      <p role="status" className="p-8">
        Таны бүртгэлийг шалгаж байна…
      </p>
    );
  if (joined && !createNew)
    return (
      <section className="mx-auto max-w-xl space-y-5 p-8">
        <h1 className="text-2xl font-bold">Та хүрээлэлд нэгдсэн байна.</h1>
        <p>Өмнө оруулсан мэдээллээ нээж засна уу.</p>
        <Link
          href="/2003/mine"
          className="inline-block rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white"
        >
          Мэдээллээ засах
        </Link>
      </section>
    );
  return children;
}
