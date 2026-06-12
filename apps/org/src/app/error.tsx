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
      title="Org portal түр алдаа гаргалаа"
      message="Байгууллагын удирдлагын хэсэг ачаалах үед алдаа гарлаа. Дахин оролдоно уу."
      onRetry={reset}
    />
  );
}
