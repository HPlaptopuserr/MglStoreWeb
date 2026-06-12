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
      title="Admin самбар түр алдаа гаргалаа"
      message="Удирдлагын хэсэг ачаалах үед алдаа гарлаа. Дахин оролдоод шалгана уу."
      onRetry={reset}
    />
  );
}
