"use client";

import { useState, type FormEvent } from "react";
import { CalendarDays } from "lucide-react";
import { API } from "@/lib/api";
import { StudyTeacherAvatar } from "./StudyTeacherAvatar";

export function StudyMentor({ bio, photo }: { bio: string; photo: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== "idle") return;
    const fields = new FormData(event.currentTarget);
    setStatus("sending");
    setError("");
    try {
      const res = await fetch(API + "/forms/study-mentor-meeting/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: Object.fromEntries(fields) }),
      });
      if (!res.ok) {
        const result: unknown = await res.json().catch(() => null);
        throw new Error(
          result &&
            typeof result === "object" &&
            "message" in result &&
            typeof result.message === "string"
            ? result.message
            : "Хүсэлт илгээж чадсангүй.",
        );
      }
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Холболтоо шалгана уу.");
      setStatus("idle");
    }
  }
  const field =
    "mt-1.5 block h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base";
  return (
    <div className="mx-auto max-w-xl space-y-5 pb-16">
      <header className="flex items-center gap-4 rounded-3xl bg-slate-900 px-5 py-7 text-white">
        <StudyTeacherAvatar
          teacher={{ name: "В. Есөнтөмөр", imageUrl: photo }}
          className="h-20 w-20 rounded-2xl text-2xl"
        />
        <div>
          <p className="text-sm text-sky-200">Бизнесийн ментор</p>
          <h2 className="mt-1 text-2xl font-bold">В. Есөнтөмөр</h2>
        </div>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold">Багшийн танилцуулга</h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
          {bio || "Багшийн танилцуулга удахгүй нэмэгдэнэ."}
        </p>
        <details className="mt-3 text-sm text-sky-700">
          <summary className="cursor-pointer">Эх сурвалж</summary>
          <ul className="mt-2 space-y-2 underline">
            <li>
              <a href="/mgl-club/mgl-club-introduction.pdf">
                MGL CLUB · Танилцуулга
              </a>
            </li>
            <li>
              <a href="https://business.mn/2024/11/01/ezneesee-gun-hamaaraltai-biznes-daraagiin-shatand-gardaggui/">
                Business.mn · 2024 оны уулзалт
              </a>
            </li>
            <li>
              <a href="https://www.24tsag.mn/a/46312">
                24цаг · 2013 оны сэтгүүлчид
              </a>
            </li>
          </ul>
        </details>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <CalendarDays size={20} />
          Уулзалтын цаг авах
        </h3>
        {status === "sent" ? (
          <p role="status" className="mt-3 text-emerald-800">
            Хүсэлтийг хүлээн авлаа. Цагийг таны утсаар баталгаажуулна.
          </p>
        ) : (
          <form
            onSubmit={submit}
            className="mt-4 grid gap-4 text-sm font-semibold"
          >
            <label>
              Таны нэр
              <input
                className={field}
                required
                maxLength={100}
                name="name"
                autoComplete="name"
              />
            </label>
            <label>
              Утасны дугаар
              <input
                className={field}
                required
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{8}"
                maxLength={8}
                name="phone"
                autoComplete="tel-national"
                placeholder="8 оронтой дугаар"
              />
            </label>
            <label>
              Хүссэн өдөр, цаг (Улаанбаатар)
              <input
                className={field}
                required
                name="requestedTime"
                type="datetime-local"
              />
            </label>
            {error && (
              <p role="alert" className="text-red-700">
                {error}
              </p>
            )}
            <button
              disabled={status === "sending"}
              className="min-h-12 rounded-xl bg-sky-700 px-4 font-semibold text-white disabled:opacity-60"
            >
              {status === "sending"
                ? "Илгээж байна…"
                : "Уулзалтын хүсэлт илгээх"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
