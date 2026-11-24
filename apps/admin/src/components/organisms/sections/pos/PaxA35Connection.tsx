"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  ChevronDown,
  Copy,
  Download,
  Link2,
  Loader2,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { API } from "@/lib/api";
import {
  currentBridgeState,
  getBridgeStatus,
  issuePairingCode,
  pairingActivationLink,
  pairingSecondsRemaining,
  revokeBridge,
  type BridgeState,
  type BridgeStatus,
  type PairingCode,
} from "./pax-a35-connection";

type Props = {
  registerId: string;
  registerName: string;
  eligible: boolean;
  cardEnabled: boolean;
  cardProviderType: string | null;
  onConfigured: () => void;
};

const labels: Record<BridgeState, string> = {
  UNPAIRED: "Холбоогүй",
  PAIRING: "Код ашиглахыг хүлээж байна",
  CONNECTED: "Холбогдсон",
  TERMINAL_OFFLINE: "Кассын холболт ажиллаж байна · терминал холбоогүй",
  OFFLINE: "Холболтгүй",
  REVOKED: "Холбоос цуцлагдсан",
};
const button =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const spinner = "h-3.5 w-3.5 animate-spin motion-reduce:animate-none";
const messageOf = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "PAX A35 холбоосын үйлдэл амжилтгүй боллоо.";
const dateLabel = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("mn-MN", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "Asia/Ulaanbaatar",
      }).format(new Date(value))
    : "Мэдээлэл ирээгүй";

export function PaxA35Connection({
  registerId,
  registerName,
  eligible,
  cardEnabled,
  cardProviderType,
  onConfigured,
}: Props) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"issue" | "revoke" | null>(null);
  const [code, setCode] = useState<PairingCode | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now);
  const mounted = useRef(false);
  const version = useRef(0);
  const statusRequest = useRef<AbortController | null>(null);
  const mutationRequest = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    statusRequest.current?.abort();
    const controller = new AbortController();
    statusRequest.current = controller;
    const requestVersion = version.current;
    if (mounted.current) setLoading(true);
    try {
      const next = await getBridgeStatus(registerId, controller.signal);
      if (
        !mounted.current ||
        controller.signal.aborted ||
        requestVersion !== version.current
      )
        return;
      setStatus(next);
      setNow(Date.now());
      setError("");
      // The server clears the short-lived code on claim/revocation. Do not keep
      // showing a consumed capability just because this panel stayed open.
      setCode((current) =>
        current && current.expiresAt !== next.pairingExpiresAt ? null : current,
      );
    } catch (failure: unknown) {
      if (
        mounted.current &&
        !controller.signal.aborted &&
        requestVersion === version.current
      )
        setError(messageOf(failure));
    } finally {
      if (
        mounted.current &&
        !controller.signal.aborted &&
        requestVersion === version.current
      )
        setLoading(false);
    }
  }, [registerId]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      version.current += 1;
      statusRequest.current?.abort();
      mutationRequest.current?.abort();
    };
  }, [refresh]);

  useEffect(() => {
    if (!expanded || busy) return;
    const poll = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const interval = window.setInterval(poll, 15_000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [expanded, busy, refresh]);

  useEffect(() => {
    if (!code && !status?.lastSeenAt) return;
    const interval = window.setInterval(
      () => setNow(Date.now()),
      code && expanded ? 1000 : 15_000,
    );
    return () => window.clearInterval(interval);
  }, [code, expanded, status?.lastSeenAt]);

  const mutate = async (operation: "issue" | "revoke") => {
    if (busy || mutationRequest.current) return;
    if (
      operation === "issue" &&
      cardEnabled &&
      cardProviderType &&
      cardProviderType !== "ANDROID_PGW" &&
      !window.confirm(
        `${registerName} кассын ${cardProviderType} картын холболтыг PAX A35 / Android PGW болгож солих уу?`,
      )
    )
      return;
    if (
      operation === "revoke" &&
      !window.confirm(
        `${registerName} кассын PAX A35 холбоосыг цуцлах уу? Төхөөрөмж дахин кодоор холбогдох хүртэл API картын төлбөр авахгүй.`,
      )
    )
      return;
    statusRequest.current?.abort();
    const controller = new AbortController();
    mutationRequest.current = controller;
    const requestVersion = ++version.current;
    setBusy(operation);
    setLoading(false);
    setError("");
    setNotice("");
    try {
      if (operation === "issue") {
        const next = await issuePairingCode(registerId, controller.signal);
        if (
          !mounted.current ||
          controller.signal.aborted ||
          requestVersion !== version.current
        )
          return;
        setCode(next);
        setNow(Date.now());
        setNotice(
          "Нэг удаагийн код үүслээ. Кассын компьютер дээр ашиглана уу.",
        );
        onConfigured();
      } else {
        await revokeBridge(registerId, controller.signal);
        if (
          !mounted.current ||
          controller.signal.aborted ||
          requestVersion !== version.current
        )
          return;
        setCode(null);
        setNotice("PAX A35 холбоос цуцлагдлаа.");
      }
      await refresh();
    } catch (failure: unknown) {
      if (
        mounted.current &&
        !controller.signal.aborted &&
        requestVersion === version.current
      )
        setError(messageOf(failure));
    } finally {
      if (mutationRequest.current === controller)
        mutationRequest.current = null;
      if (mounted.current && requestVersion === version.current) setBusy(null);
    }
  };

  const seconds = code ? pairingSecondsRemaining(code.expiresAt, now) : 0;
  let activationLink = "";
  if (code) {
    try {
      activationLink = pairingActivationLink(API, code.code);
    } catch {
      /* Explain the unusable API URL below. */
    }
  }
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(activationLink);
      if (mounted.current) setNotice("Холбох холбоос хуулагдлаа.");
    } catch {
      if (mounted.current)
        setError(
          "Автоматаар хуулж чадсангүй. Доорх холбоосыг сонгоод гараар хуулна уу.",
        );
    }
  };
  const state = status ? currentBridgeState(status, now) : null;
  const blocked = Boolean(status?.hasUnresolvedOperation);
  const hasBinding = Boolean(status?.pairedAt && state !== "REVOKED");

  return (
    <section
      className="mt-3 rounded-xl border border-violet-100 bg-violet-50/40 p-3"
      aria-label={`${registerName} · PAX A35 холболт`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        disabled={Boolean(busy)}
        onClick={() => {
          setExpanded((value) => !value);
          if (!expanded) void refresh();
        }}
        className="flex w-full flex-wrap items-center gap-2 text-left text-xs font-bold text-violet-800 disabled:opacity-60"
      >
        <Link2 size={15} aria-hidden="true" /> PAX A35 холбох
        <span
          className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${state === "CONNECTED" ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-600"}`}
        >
          {loading && !status
            ? "Төлөв шалгаж байна…"
            : state
              ? labels[state]
              : "Төлөв тодорхойгүй"}
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`ml-auto ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <div
        id={panelId}
        hidden={!expanded}
        className="mt-3 space-y-3 text-xs text-slate-600"
      >
        {expanded && (
          <>
            {!eligible && (
              <p>
                Код үүсгэхийн өмнө дэлгүүрийн кассаа идэвхжүүлж, баталгаажуулна
                уу.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-100 bg-white p-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-700">
                  Анхны суулгалт · Windows 10/11
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Эхлээд кассын компьютерт суулгагчаа ажиллуулаад, дараа нь
                  доорх алхмаар холбоно.
                </p>
              </div>
              <a
                href="https://github.com/HPlaptopuserr/MglStoreWeb/releases/download/pax-a35-bridge-20261124-upgrade/MGL-POS-Bridge-android-pgw-Installer.exe"
                className={`${button} border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100`}
              >
                <Download size={14} aria-hidden="true" /> Windows суулгагч татах
              </a>
            </div>
            <ol className="list-decimal space-y-1.5 pl-5 leading-5">
              <li>
                Энд холбох код үүсгээд <strong>Холбох холбоос хуулах</strong>{" "}
                дарна.
              </li>
              <li>
                Кассын компьютерийн Desktop дээрх{" "}
                <strong>«PAX A35 Connect»</strong> (хуучин хувилбарт «PAX A35 холбох»){" "}
                дүрсийг нээнэ.
              </li>
              <li>Хуулсан холбоосоо оруулж баталгаажуулна.</li>
              <li>
                Энд <strong>«Холбогдсон»</strong> төлөв гарсныг шалгана.
              </li>
            </ol>
            <p className="text-[11px] text-slate-500">
              A35-ийг USB-ээр холбоод, банкны Android PGW програм болон
              шаардлагатай driver-ийг бэлэн болгоно.
            </p>
            {status && (
              <>
                <p className="text-[11px] text-slate-500">
                  Сүүлд мэдэгдсэн:{" "}
                  <span className="font-medium text-slate-700">
                    {dateLabel(status.lastSeenAt)}
                  </span>
                </p>
                <details className="rounded-xl bg-white p-3">
                  <summary className="cursor-pointer font-semibold text-slate-600">
                    Төхөөрөмжийн дэлгэрэнгүй
                  </summary>
                  <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-400">Terminal ID</dt>
                      <dd className="mt-0.5 break-all font-mono text-slate-700">
                        {status.terminalId || "Гүйлгээний дараа танигдана"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">COM порт</dt>
                      <dd className="mt-0.5 break-all font-mono text-slate-700">
                        {status.serialPath || "Мэдээлэл ирээгүй"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Bridge хувилбар</dt>
                      <dd className="mt-0.5 font-medium text-slate-700">
                        {status.bridgeVersion || "Мэдээлэл ирээгүй"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Анх холбогдсон</dt>
                      <dd className="mt-0.5 font-medium text-slate-700">
                        {dateLabel(status.pairedAt)}
                      </dd>
                    </div>
                  </dl>
                </details>
              </>
            )}
            {status?.lastError && (
              <p className="rounded-lg bg-amber-50 p-2 text-amber-800">
                {status.lastError}
              </p>
            )}
            {blocked && (
              <p className="rounded-lg bg-amber-50 p-2 text-amber-800">
                Шийдэгдээгүй төлбөр эсвэл терминалын үйлдэл байна. Эхлээд
                төлөвийг тулгаж шийдвэрлэнэ үү. Шинэ код болон холбоос цуцлах
                үйлдэл түгжигдсэн.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void mutate("issue")}
                disabled={!eligible || blocked || Boolean(busy) || loading}
                className={`${button} ${code ? "border-violet-200 bg-white text-violet-700 hover:bg-violet-50" : "border-violet-200 bg-violet-600 text-white hover:bg-violet-700"}`}
              >
                {busy === "issue" ? (
                  <Loader2 className={spinner} aria-hidden="true" />
                ) : (
                  <Link2 size={13} aria-hidden="true" />
                )}
                {hasBinding || code ? "Шинэ холбох код" : "Холбох код үүсгэх"}
              </button>
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={Boolean(busy) || loading}
                className={`${button} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
              >
                {loading ? (
                  <Loader2 className={spinner} aria-hidden="true" />
                ) : (
                  <RefreshCw size={13} aria-hidden="true" />
                )}{" "}
                Төлөв шинэчлэх
              </button>
              {(hasBinding || status?.pairingExpiresAt) && (
                <button
                  type="button"
                  onClick={() => void mutate("revoke")}
                  disabled={blocked || Boolean(busy) || loading}
                  className={`${button} border-rose-200 bg-white text-rose-700 hover:bg-rose-50`}
                >
                  {busy === "revoke" ? (
                    <Loader2 className={spinner} aria-hidden="true" />
                  ) : (
                    <Unplug size={13} aria-hidden="true" />
                  )}{" "}
                  Холбоос цуцлах
                </button>
              )}
            </div>
            {code && (
              <div className="space-y-2 rounded-xl border border-violet-200 bg-white p-3">
                {seconds > 0 ? (
                  <>
                    <p className="font-semibold text-violet-800">
                      Кассын компьютерт оруулах холбоос бэлэн боллоо.
                    </p>
                    <p>
                      Хүчинтэй хугацаа: {Math.floor(seconds / 60)}:
                      {String(seconds % 60).padStart(2, "0")} ·{" "}
                      {dateLabel(code.expiresAt)}
                    </p>
                    {activationLink ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void copyLink()}
                          className={`${button} border-violet-200 bg-violet-600 text-white hover:bg-violet-700`}
                        >
                          <Copy size={13} aria-hidden="true" /> Холбох холбоос
                          хуулах
                        </button>
                        <label
                          htmlFor={`${panelId}-link`}
                          className="block text-slate-500"
                        >
                          Кассын компьютерт оруулах холбоос
                        </label>
                        <input
                          id={`${panelId}-link`}
                          value={activationLink}
                          readOnly
                          className="w-full rounded-lg border border-slate-200 px-2 py-2 font-mono text-[11px] text-slate-600"
                          onFocus={(event) => event.currentTarget.select()}
                        />
                      </>
                    ) : (
                      <p className="text-rose-700">
                        Холбох холбоос үүсгэж чадсангүй. Admin-ийн API хаягийг
                        шалгана уу.
                      </p>
                    )}
                    <details className="rounded-lg border border-slate-100 p-2">
                      <summary className="cursor-pointer text-slate-500">
                        Нэг удаагийн код харах
                      </summary>
                      <label
                        htmlFor={`${panelId}-code`}
                        className="mt-2 block text-slate-500"
                      >
                        Холбох код
                      </label>
                      <input
                        id={`${panelId}-code`}
                        value={code.code}
                        readOnly
                        className="mt-1 w-full rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 font-mono text-base font-bold tracking-wider text-violet-800"
                        onFocus={(event) => event.currentTarget.select()}
                      />
                    </details>
                    <p className="text-[11px] text-slate-400">
                      Холбоосыг зөвхөн тухайн кассын хариуцсан ажилтанд өгнө.
                      Нэг удаа ашиглагдана.
                    </p>
                  </>
                ) : (
                  <p className="font-medium text-amber-800">
                    Кодын хугацаа дууссан. Шинэ холбох код үүсгэнэ үү.
                  </p>
                )}
              </div>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-rose-50 p-2 text-rose-700"
              >
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="text-violet-700">
                {notice}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
