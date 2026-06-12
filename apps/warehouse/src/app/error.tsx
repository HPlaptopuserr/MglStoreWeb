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
      title="Агуулахын систем түр алдаа гаргалаа"
      message="Агуулахын хэсэг ачаалах үед алдаа гарлаа. Дахин оролдоно уу."
      onRetry={reset}
    />
  );
}
