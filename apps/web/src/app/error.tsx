"use client";

import { MglSystemErrorScreen } from "@mgl/ui";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <MglSystemErrorScreen
      title="Дэлгүүр түр алдаа гаргалаа"
      message="Хуудас ачаалах үед алдаа гарлаа. Дахин оролдоод үргэлжлүүлнэ үү."
      onRetry={reset}
    />
  );
}
