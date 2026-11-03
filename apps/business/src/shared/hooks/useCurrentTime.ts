"use client";

import { useEffect, useState } from "react";

/** A hydration-safe clock for time-dependent labels, refreshed once per minute. */
export function useCurrentTime(): number | null {
  const [timestamp, setTimestamp] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setTimestamp(Date.now());
    const initial = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 60_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);

  return timestamp;
}
