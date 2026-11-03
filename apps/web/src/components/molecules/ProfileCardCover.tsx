import Image from "next/image";
import type { ReactNode } from "react";

export const PROFILE_CARD_GRADIENTS = [
  "from-amber-400 via-orange-400 to-orange-500",
  "from-violet-400 via-fuchsia-500 to-purple-600",
  "from-emerald-400 via-teal-400 to-cyan-500",
  "from-sky-400 via-blue-500 to-indigo-600",
  "from-rose-400 via-pink-500 to-red-500",
  "from-lime-400 via-green-500 to-emerald-600",
] as const;

interface ProfileCardCoverProps {
  name: string;
  gradient?: string;
  variant?: "colorful" | "muted";
  avatarUrl?: string;
  label: ReactNode;
  badge?: ReactNode;
}

export function ProfileCardCover({
  name,
  gradient = PROFILE_CARD_GRADIENTS[0],
  variant = "colorful",
  avatarUrl,
  label,
  badge,
}: ProfileCardCoverProps) {
  const muted = variant === "muted";
  return (
    <div
      className={
        muted
          ? "relative h-[112px] shrink-0 border-b border-[#e1e8df] bg-[#eef2eb]"
          : `relative h-[140px] shrink-0 bg-gradient-to-br ${gradient}`
      }
    >
      {!muted && (
        <>
          <div
            aria-hidden="true"
            className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-4 right-5 h-14 w-14 rounded-full bg-white/10"
          />
        </>
      )}
      <span
        className={`absolute left-5 top-4 rounded-full px-3 py-1.5 text-[11px] font-semibold ${muted ? "bg-white/70 text-[#526450]" : "bg-white/20 text-white backdrop-blur-md"}`}
      >
        {label}
      </span>
      {badge && (
        <span
          className={`absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${muted ? "border border-[#dce5d8] text-[#6c7c65]" : "bg-black/20 text-white backdrop-blur-md"}`}
        >
          {badge}
        </span>
      )}
      <div className="absolute -bottom-9 left-6">
        {!muted && (
          <div
            aria-hidden="true"
            className={`absolute inset-0 scale-110 rounded-full bg-gradient-to-br ${gradient} opacity-40 blur-lg`}
          />
        )}
        <div
          className={`relative size-[76px] overflow-hidden rounded-2xl border-4 border-white bg-white ${muted ? "shadow-sm" : "shadow-xl shadow-slate-950/15"}`}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              fill
              sizes="76px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className={`flex h-full w-full items-center justify-center ${muted ? "bg-[#dfe8d9]" : `bg-gradient-to-br ${gradient}`}`}
            >
              <span
                className={`text-3xl font-bold ${muted ? "text-[#496044]" : "text-white"}`}
              >
                {name.charAt(0).toLocaleUpperCase("mn-MN")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
