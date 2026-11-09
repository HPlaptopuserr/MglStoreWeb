"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { API } from "@/lib/api";
import {
  VerifyMnPanel,
  type VerifyMnSession,
} from "@/components/organisms/auth/VerifyMnPanel";
import { RegistrationForm } from "../_components/RegistrationForm";
import { RegistrationField } from "../_components/RegistrationField";
import styles from "../registration.module.css";

interface EditableResponse {
  id: string;
  data: Record<string, string>;
  editToken: string;
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function isSession(value: unknown): value is VerifyMnSession {
  return (
    record(value) &&
    [
      "sessionId",
      "phone",
      "shortcode",
      "text",
      "smsUri",
      "displayInstruction",
      "expiresAt",
    ].every((key) => typeof value[key] === "string") &&
    typeof value.expiresAt === "string" &&
    Number.isFinite(Date.parse(value.expiresAt))
  );
}
function isEditable(value: unknown): value is EditableResponse {
  return (
    record(value) &&
    typeof value.id === "string" &&
    typeof value.editToken === "string" &&
    record(value.data) &&
    Object.values(value.data).every((field) => typeof field === "string")
  );
}
async function request(
  path: string,
  body: Record<string, string>,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${API}/forms/2003/edit/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data: unknown = await response.json();
  if (!response.ok)
    throw new Error(
      record(data) && typeof data.message === "string"
        ? data.message
        : "Алдаа гарлаа. Дахин оролдоно уу.",
    );
  if (!record(data)) throw new Error("Серверээс буруу хариу ирлээ.");
  return data;
}
export function CommunityEditor() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <p role="status" className="p-8">
        Нэвтрэлтийг шалгаж байна…
      </p>
    );
  return <Editor key={user?.id || "anonymous"} authenticated={!!user} />;
}
function Editor({ authenticated }: { authenticated: boolean }) {
  const { authFetch } = useAuth();
  const [loadingMine, setLoadingMine] = useState(authenticated);
  const [reload, setReload] = useState(0);
  const [session, setSession] = useState<VerifyMnSession | null>(null);
  const [challengeToken, setChallengeToken] = useState("");
  const [responses, setResponses] = useState<EditableResponse[] | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!session) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session]);
  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    setLoadingMine(true);
    setError("");
    async function load() {
      try {
        const response = await authFetch(`${API}/forms/2003/edit/mine`, {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(20000),
          ]),
        });
        const data: unknown = await response.json();
        if (
          !response.ok ||
          !record(data) ||
          !Array.isArray(data.responses) ||
          !data.responses.every(isEditable)
        )
          throw new Error("Танилцуулгаа ачаалж чадсангүй. Дахин оролдоно уу.");
        if (!controller.signal.aborted) {
          setResponses(data.responses);
          setSelectedId(data.responses[0]?.id || "");
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Холболтоо шалгана уу.",
          );
      } finally {
        if (!controller.signal.aborted) setLoadingMine(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [authenticated, authFetch, reload]);
  const remaining = session
    ? Math.max(0, Math.ceil((Date.parse(session.expiresAt) - now) / 1000))
    : 0;
  const selected = responses?.find((response) => response.id === selectedId);
  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const phone = new FormData(event.currentTarget).get("phone");
    if (typeof phone !== "string") return;
    setPending(true);
    setError("");
    try {
      const data = await request("start", { phone });
      if (!isSession(data.session) || typeof data.challengeToken !== "string")
        throw new Error("Баталгаажуулалтын мэдээлэл буруу байна.");
      setSession(data.session);
      setChallengeToken(data.challengeToken);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Холболтоо шалгаад дахин оролдоно уу.",
      );
    } finally {
      setPending(false);
    }
  }
  async function verify() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const data = await request("verify", { challengeToken });
      if (!Array.isArray(data.responses) || !data.responses.every(isEditable))
        throw new Error("Танилцуулгын мэдээлэл буруу байна.");
      setResponses(data.responses);
      setSelectedId(data.responses[0]?.id || "");
      setSession(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Холболтоо шалгаад дахин оролдоно уу.",
      );
    } finally {
      setPending(false);
    }
  }
  function restart() {
    setSession(null);
    setResponses(null);
    setSelectedId("");
    setChallengeToken("");
    setError("");
  }
  return (
    <div className={styles.page}>
      <div className="mx-auto max-w-2xl space-y-6 py-10 sm:py-16">
        <header>
          <h1 className="text-3xl font-bold">Мэдээллээ засах</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {authenticated
              ? "Өөрийн танилцуулгаа шинэчилнэ үү."
              : "Бүртгэлд оруулсан утасны дугаараа баталгаажуулж, өөрийн танилцуулгаа шинэчилнэ үү."}
          </p>
        </header>
        {authenticated && loadingMine ? (
          <p role="status">Таны танилцуулгыг ачаалж байна…</p>
        ) : authenticated && error && responses === null ? (
          <div role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="mt-4 underline"
              onClick={() => setReload((value) => value + 1)}
            >
              Дахин оролдох
            </button>
          </div>
        ) : responses === null ? (
          <section className={styles.form} aria-label="Утасны баталгаажуулалт">
            {session ? (
              <VerifyMnPanel
                session={session}
                remainingSeconds={remaining}
                timeText={`${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
                loading={pending}
                error={error}
                onRestart={restart}
                onVerify={verify}
              />
            ) : (
              <form onSubmit={start} className="space-y-5">
                <RegistrationField
                  name="phone"
                  label="Бүртгэлтэй утасны дугаар"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  pattern="[0-9]{8}"
                  required
                />
                {error && (
                  <p role="alert" className="text-sm text-red-700">
                    {error}
                  </p>
                )}
                <button className={styles.submit} disabled={pending}>
                  {pending ? "Бэлдэж байна…" : "Утсаа баталгаажуулах"}
                </button>
              </form>
            )}
          </section>
        ) : responses.length === 0 ? (
          <section className={styles.form} role="status">
            <h2 className="text-xl font-bold">
              {authenticated
                ? "Таны танилцуулга одоогоор бүртгэгдээгүй байна."
                : "Энэ дугаараар танилцуулга олдсонгүй."}
            </h2>
            <Link className="mt-4 block underline" href="/2003/join">
              Шинээр нэгдэх
            </Link>
            {!authenticated && (
              <button
                type="button"
                className="mt-4 underline"
                onClick={restart}
              >
                Өөр дугаараар шалгах
              </button>
            )}
          </section>
        ) : (
          <>
            {!authenticated && (
              <button type="button" className="underline" onClick={restart}>
                Дахин баталгаажуулах / Өөр дугаар ашиглах
              </button>
            )}
            {responses.length > 1 && (
              <label className="block">
                Засах танилцуулга
                <select
                  className="mt-2 block w-full rounded-xl border bg-white p-3"
                  value={selectedId}
                  onChange={(event) => setSelectedId(event.target.value)}
                >
                  {responses.map((response, index) => (
                    <option key={response.id} value={response.id}>
                      {response.data.name} · {response.data.profession} (
                      {index + 1})
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selected && (
              <RegistrationForm
                key={selected.id}
                initialData={selected.data}
                editing={{ id: selected.id, token: selected.editToken }}
                onSaved={(data) =>
                  setResponses(
                    (previous) =>
                      previous?.map((row) =>
                        row.id === selected.id ? { ...row, data } : row,
                      ) ?? null,
                  )
                }
              />
            )}
          </>
        )}
        <Link className="block font-semibold underline" href="/2003">
          Хүрээлэл рүү буцах
        </Link>
      </div>
    </div>
  );
}
