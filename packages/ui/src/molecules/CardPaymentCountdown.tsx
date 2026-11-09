"use client";

import { useEffect, useState } from "react";
import { cardPaymentSecondsRemaining } from "@mgl/types";

export function CardPaymentCountdown({ deadline, className = "" }: {
  deadline: number;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 200);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [deadline]);
  const seconds = cardPaymentSecondsRemaining(deadline, now);
  return (
    <div className={className}>
      <p className="text-sm font-semibold">Хариу хүлээх хугацаа</p>
      <p role="timer" aria-live="off" aria-label={`${seconds} секунд үлдсэн`}
        className="mt-1 text-4xl font-bold tabular-nums">
        {seconds}<span className="ml-2 text-base font-semibold">сек</span>
      </p>
      {seconds === 0 && <p role="status" className="mt-2 text-sm">Хугацаа дууслаа. Төлбөрийн эцсийн хариуг шалгаж байна.</p>}
    </div>
  );
}
