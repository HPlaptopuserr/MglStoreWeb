"use client";

import { useEffect, useState } from "react";
import { mentorSlots } from "@mgl/types";
import { API } from "@/lib/api";

function today() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function MentorSlots({ refresh }: { refresh: number }) {
  const [day, setDay] = useState(today);
  const [retry, setRetry] = useState(0);
  const [selection, setSelection] = useState("");
  const [result, setResult] = useState<{
    key: string;
    available: string[];
    failed: boolean;
  }>();
  const key = day + "/" + refresh + "/" + retry;
  useEffect(() => {
    if (!day) return;
    const controller = new AbortController();
    async function load() {
      try {
        const res = await fetch(
          API +
            "/forms/study-mentor-meeting/availability?date=" +
            encodeURIComponent(day),
          { cache: "no-store", signal: controller.signal },
        );
        if (!res.ok) throw new Error();
        const body: unknown = await res.json();
        if (
          !body ||
          typeof body !== "object" ||
          !("available" in body) ||
          !Array.isArray(body.available) ||
          !body.available.every((t) => typeof t === "string")
        )
          throw new Error();
        if (!controller.signal.aborted)
          setResult({ key, available: body.available, failed: false });
      } catch {
        if (!controller.signal.aborted)
          setResult({ key, available: [], failed: true });
      }
    }
    void load();
    return () => controller.abort();
  }, [day, key]);
  const ready = result?.key === key && !result.failed;
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2">Уулзалтын өдөр, цаг</legend>
      <label className="text-sm">
        Өдөр (Улаанбаатар)
        <input
          required
          type="date"
          value={day}
          min={today()}
          onChange={(e) => {
            setDay(e.target.value);
            setSelection("");
          }}
          className="mt-1 block min-h-12 w-full rounded-xl border border-slate-300 px-3"
        />
      </label>
      {day &&
        (result?.key !== key ? (
          <p role="status">Цагийг шалгаж байна…</p>
        ) : result.failed ? (
          <button
            type="button"
            onClick={() => setRetry((n) => n + 1)}
            className="min-h-11 text-sky-700"
          >
            Цаг ачаалагдсангүй · Дахин оролдох
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {mentorSlots(day).map((time) => {
              const available = result.available.includes(time);
              return (
                <label
                  key={time}
                  className={`relative grid min-h-14 place-content-center rounded-lg border p-1 text-center focus-within:ring-2 ${!available ? "border-slate-200 bg-slate-100 text-slate-500" : selection === time ? "border-sky-700 bg-sky-700 text-white" : "border-sky-300 text-sky-800"}`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="requestedTime"
                    value={time}
                    required
                    disabled={!available}
                    checked={available && selection === time}
                    onChange={() => setSelection(time)}
                  />
                  {time.slice(11)}
                  <small>{available ? "Сул" : "Хаалттай"}</small>
                </label>
              );
            })}
          </div>
        ))}
      <button
        type="submit"
        disabled={!ready || !result?.available.includes(selection)}
        className="min-h-12 rounded-xl bg-sky-700 px-4 font-semibold text-white disabled:opacity-50"
      >
        Уулзалтын хүсэлт илгээх
      </button>
    </fieldset>
  );
}
