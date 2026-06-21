"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WheelEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API } from "@/lib/api";
import { CartDrawer } from "@/components/organisms/CartDrawer";
import { MobileBottomNav } from "@/components/organisms/layouts/MobileBottomNav";
import type { ReelItem } from "../_lib/reels.types";
import type { ReelsFeedMode } from "../_lib/reels.types";
import {
  filterReelsByMode,
  getFollowedReelOrgKeys,
  getReelsEmptyCopy,
  isLiveReel,
  saveFollowedReelOrgKeys,
} from "../_lib/reels.feed";
import {
  getLikedReelIds,
  saveLikedReelIds,
  setReelLike,
  trackReelInteraction,
} from "../_lib/reels.interactions";
import {
  buildOrganizationPreviews,
  getOrgKey,
  getOrgName,
  getReelBody,
  getReelTitle,
} from "../_lib/reels.utils";
import { OrganizationRail } from "./OrganizationRail";
import { DesktopStepControls } from "./ReelFeedControls";
import { ReelsEmptyState, ReelsLoadingState } from "./ReelsFeedStates";
import { ReelsHeader } from "./ReelsHeader";
import { ReelsNotice, type ReelsNoticeKind } from "./ReelsNotice";
import { ReelSlide } from "./ReelSlide";

const REELS_LIMIT = 30;
type NoticeState = { kind: ReelsNoticeKind; message: string } | null;

export function ReelsPageClient() {
  const [items, setItems] = useState<ReelItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [feedMode, setFeedMode] = useState<ReelsFeedMode>("reels");
  const [followedOrgKeys, setFollowedOrgKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState<NoticeState>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const initialScrollDoneRef = useRef(false);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelLockRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewedIdsRef = useRef<Set<string>>(new Set());
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setLikedIds(getLikedReelIds());
    setFollowedOrgKeys(getFollowedReelOrgKeys());
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      if (wheelLockRef.current) clearTimeout(wheelLockRef.current);
    };
  }, []);

  const showNotice = useCallback((kind: ReelsNoticeKind, message: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice({ kind, message });
    noticeTimerRef.current = setTimeout(() => setNotice(null), 2200);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API}/reels?limit=${REELS_LIMIT}`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        if (!cancelled) {
          const nextItems: ReelItem[] = Array.isArray(data?.items)
            ? data.items
            : [];
          setItems(nextItems);
          const targetReelId =
            typeof window === "undefined"
              ? ""
              : new URLSearchParams(window.location.search).get("reel");
          const targetIndex = nextItems.findIndex(
            (item) => item.id === targetReelId,
          );
          if (targetIndex >= 0) setActiveIndex(targetIndex);
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(
    () => filterReelsByMode(items, feedMode, followedOrgKeys),
    [feedMode, followedOrgKeys, items],
  );
  const active = useMemo(
    () =>
      filteredItems[
        Math.min(activeIndex, Math.max(0, filteredItems.length - 1))
      ],
    [activeIndex, filteredItems],
  );
  const organizations = useMemo(
    () => buildOrganizationPreviews(filteredItems),
    [filteredItems],
  );
  const feedCounts = useMemo(
    () => ({
      reels: items.length,
      following: items.filter((item) => followedOrgKeys.has(getOrgKey(item)))
        .length,
      live: items.filter(isLiveReel).length,
    }),
    [followedOrgKeys, items],
  );
  const emptyCopy = useMemo(() => getReelsEmptyCopy(feedMode), [feedMode]);

  const updateReelCount = useCallback(
    (
      id: string,
      field: "commentCount" | "likeCount" | "shareCount" | "viewCount",
      delta: number,
    ) => {
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                [field]: Math.max(0, Number(item[field] || 0) + delta),
              }
            : item,
        ),
      );
    },
    [],
  );

  const setReelCount = useCallback(
    (
      id: string,
      field: "commentCount" | "likeCount" | "shareCount" | "viewCount",
      value: number,
    ) => {
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, [field]: Math.max(0, Number(value || 0)) }
            : item,
        ),
      );
    },
    [],
  );

  useEffect(() => {
    if (!active?.id || viewedIdsRef.current.has(active.id)) return;
    viewedIdsRef.current.add(active.id);
    updateReelCount(active.id, "viewCount", 1);
    trackReelInteraction(active.id, "VIEW").catch(() => undefined);
  }, [active?.id, updateReelCount]);

  useEffect(() => {
    if (activeIndex < filteredItems.length) return;
    setActiveIndex(Math.max(0, filteredItems.length - 1));
  }, [activeIndex, filteredItems.length]);

  useEffect(() => {
    if (loading || initialScrollDoneRef.current || activeIndex <= 0) return;
    initialScrollDoneRef.current = true;
    requestAnimationFrame(() => {
      feedRef.current?.children[activeIndex]?.scrollIntoView({
        block: "start",
      });
    });
  }, [activeIndex, loading]);

  const scrollToIndex = (index: number) => {
    const next = Math.min(
      Math.max(index, 0),
      Math.max(filteredItems.length - 1, 0),
    );
    setActiveIndex(next);
    feedRef.current?.children[next]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (filteredItems.length <= 1) return;

    const intent = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      ? event.deltaY
      : event.deltaX;
    if (Math.abs(intent) < 12) return;

    event.preventDefault();
    if (wheelLockRef.current) return;

    scrollToIndex(activeIndex + (intent > 0 ? 1 : -1));
    wheelLockRef.current = setTimeout(() => {
      wheelLockRef.current = null;
    }, 520);
  };

  const handleModeChange = (mode: ReelsFeedMode) => {
    setFeedMode(mode);
    setActiveIndex(0);
    requestAnimationFrame(() => {
      feedRef.current?.children[0]?.scrollIntoView({ block: "start" });
    });
  };

  const syncLikeState = async (item: ReelItem, nextLikedState: boolean) => {
    const wasLiked = likedIds.has(item.id);
    if (wasLiked === nextLikedState) return;

    const nextLiked = new Set(likedIds);
    if (nextLikedState) {
      nextLiked.add(item.id);
    } else {
      nextLiked.delete(item.id);
    }
    setLikedIds(nextLiked);
    saveLikedReelIds(nextLiked);
    updateReelCount(item.id, "likeCount", nextLikedState ? 1 : -1);

    const result = await setReelLike(item.id, nextLikedState).catch(() => ({
      ok: false,
      liked: wasLiked,
      likeCount: Number(item.likeCount || 0),
    }));

    if (result.ok) {
      const syncedLiked = new Set(nextLiked);
      if (result.liked) {
        syncedLiked.add(item.id);
      } else {
        syncedLiked.delete(item.id);
      }
      setLikedIds(syncedLiked);
      saveLikedReelIds(syncedLiked);
      setReelCount(item.id, "likeCount", result.likeCount);
      return;
    }

    const rollbackLiked = new Set(likedIds);
    setLikedIds(rollbackLiked);
    saveLikedReelIds(rollbackLiked);
    setReelCount(item.id, "likeCount", Number(item.likeCount || 0));
    showNotice("error", "Like шинэчлэхэд алдаа гарлаа");
  };

  const handleLike = (item: ReelItem) => {
    syncLikeState(item, !likedIds.has(item.id));
  };

  const handleAddLike = (item: ReelItem) => {
    syncLikeState(item, true);
  };

  const handleFollow = (item: ReelItem) => {
    const orgKey = getOrgKey(item);
    const nextFollowed = new Set(followedOrgKeys);
    const willFollow = !nextFollowed.has(orgKey);

    if (willFollow) {
      nextFollowed.add(orgKey);
      showNotice("success", `${getOrgName(item)} дагалаа`);
      trackReelInteraction(item.id, "FOLLOW_CLICK", {
        organization: orgKey,
      }).catch(() => undefined);
    } else {
      nextFollowed.delete(orgKey);
      showNotice("info", `${getOrgName(item)}-г following-оос хаслаа`);
      if (feedMode === "following" && nextFollowed.size === 0) {
        setFeedMode("reels");
        setActiveIndex(0);
      }
    }

    setFollowedOrgKeys(nextFollowed);
    saveFollowedReelOrgKeys(nextFollowed);
  };

  const handleShare = async (item: ReelItem) => {
    const url =
      typeof window === "undefined"
        ? "/reels"
        : `${window.location.origin}/reels?reel=${item.id}`;
    const title = getReelTitle(item);
    const text = `${getOrgName(item)} - ${getReelBody(item) || title}`;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        showNotice("success", "Илгээгдлээ");
      } else {
        await navigator.clipboard.writeText(url);
        showNotice("success", "Reel link хуулагдлаа");
      }
      updateReelCount(item.id, "shareCount", 1);
      trackReelInteraction(item.id, "SHARE", { url }).catch(() => undefined);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showNotice("error", "Илгээхэд алдаа гарлаа");
    }
  };

  const handleComment = (item: ReelItem) => {
    showNotice("info", `${getReelTitle(item)} дээр comment удахгүй нэмэгдэнэ`);
  };

  const handleViewInfo = () => {
    showNotice("info", "Үзэлт автоматаар бүртгэгддэг");
  };

  const handleBack = () => {
    const returnTo = searchParams.get("returnTo");
    if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
      router.push(returnTo);
      return;
    }

    if (typeof document !== "undefined" && document.referrer) {
      try {
        const referrer = new URL(document.referrer);
        if (
          referrer.origin === window.location.origin &&
          referrer.pathname !== window.location.pathname
        ) {
          router.back();
          return;
        }
      } catch {
        // Fall through to the safe in-app fallback.
      }
    }

    router.push("/organizations");
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-black pb-[calc(50px+env(safe-area-inset-bottom,0px))] text-white md:pb-0">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(249,115,22,0.22),transparent_28%),radial-gradient(circle_at_88%_100%,rgba(14,165,233,0.12),transparent_26%)]" />

      <ReelsHeader
        activeMode={feedMode}
        counts={feedCounts}
        onBack={handleBack}
        onModeChange={handleModeChange}
        reelCount={filteredItems.length}
      />

      {loading ? (
        <ReelsLoadingState />
      ) : !active ? (
        <ReelsEmptyState
          description={emptyCopy.description}
          title={emptyCopy.title}
        />
      ) : (
        <>
          <div
            ref={feedRef}
            className="relative z-10 h-[calc(100dvh-50px-env(safe-area-inset-bottom,0px))] snap-y snap-mandatory overflow-y-auto scroll-smooth scrollbar-hide md:h-dvh"
            onWheel={handleWheel}
            onScroll={(event) => {
              const height = event.currentTarget.clientHeight || 1;
              setActiveIndex(
                Math.round(event.currentTarget.scrollTop / height),
              );
            }}
          >
            {filteredItems.map((item, index) => (
              <ReelSlide
                key={item.id}
                item={item}
                active={index === activeIndex}
                followed={followedOrgKeys.has(getOrgKey(item))}
                liked={likedIds.has(item.id)}
                muted={muted}
                onAddLike={handleAddLike}
                onComment={handleComment}
                onFollow={handleFollow}
                onLike={handleLike}
                onShare={handleShare}
                onViewInfo={handleViewInfo}
                onToggleMute={() => setMuted((current) => !current)}
              />
            ))}
          </div>

          <DesktopStepControls
            activeIndex={activeIndex}
            itemCount={filteredItems.length}
            onStep={scrollToIndex}
          />
          <OrganizationRail organizations={organizations} />
        </>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      {notice && <ReelsNotice kind={notice.kind} message={notice.message} />}
      <MobileBottomNav
        onCartOpen={() => setCartOpen(true)}
        onAuthOpen={() => router.push("/login")}
        onSearchOpen={() => router.push("/products")}
      />
    </div>
  );
}
