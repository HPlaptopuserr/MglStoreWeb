"use client";
import { QRCodeSVG } from "qrcode.react";
import { Gift, Search, CheckCircle2, QrCode, RefreshCw } from "lucide-react";
import type {
  CheckoutLoyaltyState,
  CheckoutLoyaltyRedeemSession,
} from "./PosCheckoutView";

export function CheckoutLoyaltyPanel({
  disabled,
  effectiveRedeemPoints,
  estimatedEarnPoints,
  loyalty,
  loyaltyRedeemLoading,
  loyaltyRedeemSession,
  maxRedeemPoints,
  onContinue,
  onClearLoyaltyRedeemSession,
  onLookupLoyalty,
  onLoyaltyChange,
  onRefreshLoyaltyRedeemSession,
  onRequestLoyaltyRedeemQr,
  projectedBalance,
  statusMessage,
  statusTone = "idle",
}: {
  disabled?: boolean;
  effectiveRedeemPoints: number;
  estimatedEarnPoints: number;
  loyalty: CheckoutLoyaltyState;
  loyaltyRedeemLoading: boolean;
  loyaltyRedeemSession?: CheckoutLoyaltyRedeemSession | null;
  maxRedeemPoints: number;
  onContinue: () => void;
  onClearLoyaltyRedeemSession: () => void;
  onLookupLoyalty: () => void;
  onLoyaltyChange: (next: CheckoutLoyaltyState) => void;
  onRefreshLoyaltyRedeemSession: () => void | Promise<void>;
  onRequestLoyaltyRedeemQr: (redeemPoints: number) => void | Promise<void>;
  projectedBalance: number;
  statusMessage?: string;
  statusTone?: "idle" | "success" | "not-found";
}) {
  const requiresPhone = loyalty.mode !== "NONE";
  const phoneReady = loyalty.phone.replace(/\D/g, "").length >= 6;
  const redeemConfirmed =
    loyalty.mode !== "REDEEM" ||
    (loyaltyRedeemSession?.status === "CONFIRMED" &&
      loyaltyRedeemSession.requestedPoints === effectiveRedeemPoints);
  const canContinue =
    !disabled &&
    !loyalty.lookupLoading &&
    (!requiresPhone || (phoneReady && loyalty.found && redeemConfirmed));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 max-[760px]:p-3">
      <div className="flex items-start justify-between gap-3 pr-12">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-700 max-[760px]:h-10 max-[760px]:w-10">
            <Gift size={22} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-slate-950 max-[760px]:text-base">
              M Point урамшуулал
            </p>
            <p className="line-clamp-1 text-sm font-semibold text-slate-500 max-[760px]:text-xs">
              {(loyalty.earnRate * 100).toLocaleString("mn-MN", {
                maximumFractionDigits: 2,
              })}
              % буцаан олголт
            </p>
          </div>
        </div>
        {loyalty.membershipBadge !== "NONE" && (
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${
              loyalty.membershipBadge === "MEMBER"
                ? "bg-emerald-400/15 text-emerald-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {loyalty.membershipBadge === "MEMBER" ? "Гишүүн" : "Стандарт"}
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-3 min-[760px]:grid-cols-[minmax(0,1fr)_148px]">
        <input
          value={loyalty.phone}
          onChange={(event) => {
            onClearLoyaltyRedeemSession();
            onLoyaltyChange({
              ...loyalty,
              phone: event.target.value.replace(/\D/g, "").slice(0, 12),
              lookupError: "",
              found: false,
              customerName: null,
              balance: 0,
              membershipBadge: "NONE",
              redeemPoints: 0,
            });
          }}
          placeholder="Хэрэглэгчийн утас"
          className="h-12 min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition focus:border-amber-400 max-[760px]:h-11 max-[760px]:text-sm"
        />
        <button
          type="button"
          onClick={onLookupLoyalty}
          disabled={
            disabled ||
            loyalty.lookupLoading ||
            loyalty.phone.replace(/\D/g, "").length < 6
          }
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 max-[760px]:h-11 max-[760px]:text-xs"
        >
          <Search size={16} />
          Шалгах
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 rounded-xl bg-slate-50 p-1 text-sm font-black text-slate-500 max-[760px]:text-xs">
        {[
          { key: "EARN", label: "Цуглуулах" },
          { key: "REDEEM", label: "Хасуулах" },
          { key: "NONE", label: "Алгасах" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              const nextMode = item.key as CheckoutLoyaltyState["mode"];
              const nextRedeemPoints =
                nextMode === "REDEEM"
                  ? Math.max(
                      0,
                      Math.min(
                        maxRedeemPoints,
                        loyalty.redeemPoints || maxRedeemPoints,
                      ),
                    )
                  : 0;
              if (nextMode !== "REDEEM") {
                onClearLoyaltyRedeemSession();
              }
              onLoyaltyChange({
                ...loyalty,
                mode: nextMode,
                redeemPoints: nextRedeemPoints,
              });
              if (
                nextMode === "REDEEM" &&
                loyalty.found &&
                nextRedeemPoints > 0
              ) {
                void onRequestLoyaltyRedeemQr(nextRedeemPoints);
              }
            }}
            className={`truncate rounded-lg px-3 py-3 transition max-[760px]:px-2 max-[760px]:py-2 ${
              loyalty.mode === item.key
                ? "bg-blue-600 text-white"
                : "hover:text-slate-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loyalty.lookupError && (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-800 max-[760px]:text-xs">
          {loyalty.lookupError}
        </p>
      )}
      {requiresPhone &&
        phoneReady &&
        !loyalty.found &&
        !loyalty.lookupLoading &&
        !loyalty.lookupError && (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-blue-600/10 px-3 py-2 text-sm font-semibold text-amber-900 max-[760px]:text-xs">
            Эхлээд Шалгах дарж M Point хэрэглэгчээ баталгаажуулна уу.
          </p>
        )}

      <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600 min-[760px]:grid-cols-4 max-[760px]:text-xs">
        <div className="min-w-0 rounded-xl bg-slate-50 px-4 py-3 max-[760px]:px-3 max-[760px]:py-2">
          <p className="truncate text-[10px] uppercase tracking-widest text-slate-500">
            Хэрэглэгч
          </p>
          <p className="mt-1 truncate text-slate-800">
            {loyalty.found
              ? loyalty.customerName || loyalty.phone
              : "Шалгаагүй"}
          </p>
        </div>
        <div className="min-w-0 rounded-xl bg-slate-50 px-4 py-3 max-[760px]:px-3 max-[760px]:py-2">
          <p className="truncate text-[10px] uppercase tracking-widest text-slate-500">
            Одоогийн үлдэгдэл
          </p>
          <p className="mt-1 text-slate-800">
            {loyalty.balance.toLocaleString("mn-MN")} M
          </p>
        </div>
        <div className="min-w-0 rounded-xl bg-slate-50 px-4 py-3 max-[760px]:px-3 max-[760px]:py-2">
          <p className="truncate text-[10px] uppercase tracking-widest text-slate-500">
            Энэ худалдан авалт
          </p>
          <p className="mt-1 text-blue-700">
            +{estimatedEarnPoints.toLocaleString("mn-MN")} M
          </p>
        </div>
        <div className="min-w-0 rounded-xl bg-slate-50 px-4 py-3 max-[760px]:px-3 max-[760px]:py-2">
          <p className="truncate text-[10px] uppercase tracking-widest text-slate-500">
            Дараах үлдэгдэл
          </p>
          <p className="mt-1 text-emerald-700">
            {projectedBalance.toLocaleString("mn-MN")} M
            {loyalty.mode === "REDEEM" && effectiveRedeemPoints > 0 ? (
              <span className="ml-1 text-slate-500">
                (-{effectiveRedeemPoints.toLocaleString("mn-MN")})
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {loyalty.mode === "REDEEM" && (
        <div className="mt-4 grid gap-2 min-[760px]:grid-cols-[1fr_auto]">
          <input
            value={loyalty.redeemPoints || ""}
            onChange={(event) => {
              onClearLoyaltyRedeemSession();
              onLoyaltyChange({
                ...loyalty,
                redeemPoints: Math.max(
                  0,
                  Math.min(
                    maxRedeemPoints,
                    Math.floor(Number(event.target.value) || 0),
                  ),
                ),
              });
            }}
            placeholder="Хасуулах M Point"
            className="h-12 min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition focus:border-amber-400 max-[760px]:h-11 max-[760px]:text-sm"
          />
          <button
            type="button"
            onClick={() => {
              onClearLoyaltyRedeemSession();
              onLoyaltyChange({ ...loyalty, redeemPoints: maxRedeemPoints });
            }}
            disabled={maxRedeemPoints <= 0}
            className="h-12 rounded-xl border border-slate-300 px-5 text-sm font-black text-slate-700 hover:border-amber-400 disabled:opacity-40 max-[760px]:h-11 max-[760px]:text-xs"
          >
            Бүгд
          </button>
        </div>
      )}

      {loyalty.mode === "REDEEM" && (
        <div className="mt-4 rounded-2xl border border-amber-500/30 bg-blue-600/10 p-4">
          <div className="flex flex-col gap-4 min-[760px]:flex-row min-[760px]:items-center">
            {loyaltyRedeemSession?.qrPayload ? (
              <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-xl bg-white p-3">
                <QRCodeSVG
                  value={loyaltyRedeemSession.qrPayload}
                  size={156}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#000000"
                  includeMargin
                />
              </div>
            ) : (
              <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-xs font-semibold text-slate-500">
                QR үүсгээгүй
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-slate-950">
                  M Point app баталгаажуулалт
                </p>
                {loyaltyRedeemSession?.status === "CONFIRMED" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-black text-emerald-700">
                    <CheckCircle2 size={14} />
                    Баталгаажсан
                  </span>
                )}
                {loyaltyRedeemSession?.status === "PENDING" && (
                  <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-black text-amber-800">
                    App уншуулж байна
                  </span>
                )}
                {loyaltyRedeemSession &&
                  ["EXPIRED", "CANCELLED", "CONSUMED"].includes(
                    loyaltyRedeemSession.status,
                  ) && (
                    <span className="rounded-full bg-rose-400/15 px-2.5 py-1 text-xs font-black text-rose-800">
                      Дахин QR үүсгэнэ
                    </span>
                  )}
              </div>
              {statusMessage && (
                <div
                  className={`mt-3 rounded-xl border px-3 py-2 text-xs font-bold ${
                    statusTone === "success"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-800"
                      : statusTone === "not-found"
                        ? "border-rose-400/30 bg-rose-400/10 text-rose-800"
                        : "border-slate-300 bg-slate-50 text-slate-700"
                  }`}
                >
                  {statusMessage}
                </div>
              )}
              <p className="mt-2 text-sm font-semibold leading-5 text-slate-600">
                Хэрэглэгч MGL app-аараа QR уншуулаад{" "}
                {effectiveRedeemPoints.toLocaleString("mn-MN")} M Point
                ашиглахыг батална.
              </p>
              {loyaltyRedeemSession?.expiresAt && (
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Дуусах:{" "}
                  {new Date(loyaltyRedeemSession.expiresAt).toLocaleTimeString(
                    "mn-MN",
                    { hour: "2-digit", minute: "2-digit" },
                  )}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void onRequestLoyaltyRedeemQr(effectiveRedeemPoints)
                  }
                  disabled={
                    disabled ||
                    loyaltyRedeemLoading ||
                    !loyalty.found ||
                    effectiveRedeemPoints <= 0 ||
                    loyaltyRedeemSession?.status === "CONFIRMED"
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <QrCode size={15} />
                  {loyaltyRedeemLoading ? "QR үүсгэж байна..." : "QR үүсгэх"}
                </button>
                <button
                  type="button"
                  onClick={() => void onRefreshLoyaltyRedeemSession()}
                  disabled={
                    disabled || loyaltyRedeemLoading || !loyaltyRedeemSession
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-black text-slate-800 transition hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RefreshCw size={15} />
                  Төлөв шалгах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="rounded-2xl bg-blue-600 px-8 py-3.5 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 max-[760px]:w-full"
        >
          Үргэлжлүүлэх
        </button>
      </div>
    </div>
  );
}
