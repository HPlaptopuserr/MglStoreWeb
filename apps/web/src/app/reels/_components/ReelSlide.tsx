"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent, TouchEvent } from "react";
import {
  Building2,
  Check,
  Eye,
  Heart,
  MessageCircle,
  Plus,
  Send,
  Store,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { ReelItem } from "../_lib/reels.types";
import {
  compactCount,
  getOrgName,
  getReelBody,
  getReelTitle,
  mediaUrl,
} from "../_lib/reels.utils";
import { OrgAvatar, OrgIdentity } from "./OrgAvatar";
import { ReelCommercePanel } from "./ReelCommercePanel";
import { ReelActionButton } from "./ReelActionButton";

type ReelSlideProps = {
  item: ReelItem;
  active: boolean;
  liked: boolean;
  muted: boolean;
  followed: boolean;
  onAddLike: (item: ReelItem) => void;
  onComment: (item: ReelItem) => void;
  onFollow: (item: ReelItem) => void;
  onLike: (item: ReelItem) => void;
  onShare: (item: ReelItem) => void;
  onViewInfo: (item: ReelItem) => void;
  onToggleMute: () => void;
};

export function ReelSlide({
  item,
  active,
  liked,
  muted,
  followed,
  onAddLike,
  onComment,
  onFollow,
  onLike,
  onShare,
  onViewInfo,
  onToggleMute,
}: ReelSlideProps) {
  const title = getReelTitle(item);
  const body = getReelBody(item);
  const orgName = getOrgName(item);
  const orgSlug = item.organization?.slug;
  const orgLogo = mediaUrl(item.organization?.logoUrl);
  const backdropVideoRef = useRef<HTMLVideoElement | null>(null);
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const lastTouchAtRef = useRef(0);
  const [heartBurstKey, setHeartBurstKey] = useState(0);
  const [heartBurstPosition, setHeartBurstPosition] = useState({
    x: 50,
    y: 50,
  });

  useEffect(() => {
    const videos = [backdropVideoRef.current, mainVideoRef.current].filter(
      Boolean,
    );
    videos.forEach((video) => {
      if (!video) return;
      if (active) {
        video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
  }, [active]);

  const triggerHeartBurst = (clientX?: number, clientY?: number) => {
    const rect = mainVideoRef.current?.parentElement?.getBoundingClientRect();
    if (rect && typeof clientX === "number" && typeof clientY === "number") {
      const safeX = Math.min(
        Math.max(clientX - rect.left, rect.width * 0.18),
        rect.width * 0.82,
      );
      const safeY = Math.min(
        Math.max(clientY - rect.top, rect.height * 0.18),
        rect.height * 0.76,
      );
      setHeartBurstPosition({
        x: (safeX / rect.width) * 100,
        y: (safeY / rect.height) * 100,
      });
    }
    setHeartBurstKey((key) => key + 1);
  };

  const handleDoubleLike = (clientX?: number, clientY?: number) => {
    triggerHeartBurst(clientX, clientY);
    onAddLike(item);
  };

  const handleCardDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("button,a")) return;
    handleDoubleLike(event.clientX, event.clientY);
  };

  const handleCardTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("button,a")) return;

    const now = Date.now();
    if (now - lastTouchAtRef.current < 280) {
      event.preventDefault();
      const touch = event.changedTouches[0];
      handleDoubleLike(touch?.clientX, touch?.clientY);
      lastTouchAtRef.current = 0;
      return;
    }
    lastTouchAtRef.current = now;
  };

  return (
    <section className="relative flex h-full snap-start snap-always items-center justify-center overflow-hidden px-0 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(48px,env(safe-area-inset-top))] sm:px-5 sm:pt-[max(64px,env(safe-area-inset-top))] md:h-dvh">
      <video
        ref={backdropVideoRef}
        src={mediaUrl(item.videoUrl)}
        poster={mediaUrl(item.thumbnailUrl) || undefined}
        autoPlay={active}
        muted
        loop
        playsInline
        preload={active ? "auto" : "metadata"}
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl"
      />

      <div
        className="relative h-full w-full max-w-[520px] overflow-hidden bg-black shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/10 sm:h-[calc(100dvh-92px)] sm:rounded-[34px]"
        onDoubleClick={handleCardDoubleClick}
        onTouchEnd={handleCardTouchEnd}
      >
        <video
          ref={mainVideoRef}
          src={mediaUrl(item.videoUrl)}
          poster={mediaUrl(item.thumbnailUrl) || undefined}
          autoPlay={active}
          muted={muted}
          loop
          playsInline
          controls={false}
          preload={active ? "auto" : "metadata"}
          className="h-full w-full bg-black object-cover"
        />

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.52)_0%,rgba(0,0,0,0.06)_28%,rgba(0,0,0,0.10)_55%,rgba(0,0,0,0.82)_100%)]" />

        {heartBurstKey > 0 && (
          <div
            key={heartBurstKey}
            className="pointer-events-none absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-visible"
            style={{
              left: `${heartBurstPosition.x}%`,
              top: `${heartBurstPosition.y}%`,
            }}
          >
            <div className="reel-heart-burst">
              <span className="reel-heart-ring" />
              <span className="reel-heart-glow" />
              <Heart className="reel-heart-main h-[7.2rem] w-[7.2rem] fill-white text-white sm:h-[8.1rem] sm:w-[8.1rem]" />
              {Array.from({ length: 6 }).map((_, index) => (
                <Heart
                  key={index}
                  className={`reel-heart-particle reel-heart-particle-${index + 1} h-5 w-5 fill-white text-white`}
                />
              ))}
              {Array.from({ length: 8 }).map((_, index) => (
                <span
                  key={index}
                  className={`reel-heart-spark reel-heart-spark-${index + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3 sm:left-5 sm:right-5">
          <OrgIdentity name={orgName} logoUrl={orgLogo} slug={orgSlug} />
          <button
            type="button"
            onClick={onToggleMute}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white ring-1 ring-white/10 backdrop-blur-xl sm:h-10 sm:w-10"
            aria-label={muted ? "Дуу нээх" : "Дуу хаах"}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        <div className="absolute bottom-5 left-4 right-[88px] sm:bottom-6 sm:left-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/16 px-3 py-1.5 text-[11px] font-black text-white ring-1 ring-white/10 backdrop-blur-xl">
              <Building2 size={13} />
              Shop reel
            </span>
            {item.product && (
              <span className="inline-flex max-w-[170px] items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-[11px] font-black text-white shadow-lg shadow-orange-500/20">
                <Store size={13} />
                <span className="truncate">Шууд худалдан авах</span>
              </span>
            )}
          </div>
          <p className="line-clamp-2 text-2xl font-black leading-7 tracking-tight text-white drop-shadow-lg sm:text-3xl sm:leading-8">
            {title}
          </p>
          {body && (
            <p className="mt-2 line-clamp-3 text-sm font-semibold leading-5 text-white/82 drop-shadow">
              {body}
            </p>
          )}
          <ReelCommercePanel item={item} orgSlug={orgSlug} />
        </div>

        <div className="absolute bottom-5 right-3 flex flex-col items-center gap-2 sm:bottom-6 sm:right-5 sm:gap-3">
          <button
            type="button"
            onClick={() => onFollow(item)}
            className="group relative mb-0.5 flex h-10 w-10 items-center justify-center sm:mb-1 sm:h-14 sm:w-14"
            aria-label={followed ? "Дагахаа болих" : "Байгууллага дагах"}
          >
            <OrgAvatar
              name={orgName}
              logoUrl={orgLogo}
              sizeClass="h-9 w-9 sm:h-12 sm:w-12"
            />
            <span
              className={`absolute -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full text-white ring-2 ring-black transition group-hover:scale-110 sm:h-5 sm:w-5 ${
                followed ? "bg-emerald-500" : "bg-orange-500"
              }`}
            >
              {followed ? (
                <Check
                  size={11}
                  strokeWidth={3}
                  className="sm:h-[13px] sm:w-[13px]"
                />
              ) : (
                <Plus
                  size={11}
                  strokeWidth={3}
                  className="sm:h-[13px] sm:w-[13px]"
                />
              )}
            </span>
          </button>
          <ReelActionButton
            icon={Heart}
            label={compactCount(item.likeCount)}
            active={liked}
            ariaLabel={liked ? "Like хийгдсэн" : "Like хийх"}
            onClick={() => onLike(item)}
          />
          <ReelActionButton
            icon={MessageCircle}
            label={compactCount(item.commentCount)}
            ariaLabel="Сэтгэгдэл"
            onClick={() => onComment(item)}
          />
          <ReelActionButton
            icon={Send}
            label={compactCount(item.shareCount)}
            ariaLabel="Илгээх"
            onClick={() => onShare(item)}
          />
          <ReelActionButton
            icon={Eye}
            label={compactCount(item.viewCount)}
            ariaLabel="Үзэлт"
            onClick={() => onViewInfo(item)}
          />
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[conic-gradient(from_180deg,#f97316,#111827,#0ea5e9,#f97316)] p-0.5 shadow-xl sm:mt-1 sm:h-11 sm:w-11 sm:p-1">
            <div className="h-full w-full rounded-full bg-black" />
          </div>
        </div>
      </div>
    </section>
  );
}
