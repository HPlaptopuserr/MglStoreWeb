"use client";

import { useState } from "react";
import {
  LoginModal,
  type LoginMarketingBanner,
} from "@/components/organisms/auth/LoginModal";
import { useAuth } from "@/lib/auth-context";

export default function CommunityAuthDialog({
  onClose,
  brandName,
  marketingBanner,
}: {
  onClose: () => void;
  brandName: string;
  marketingBanner: LoginMarketingBanner;
}) {
  const { login, register } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function perform<T>(operation: () => Promise<T>): Promise<T> {
    setPending(true);
    setError("");
    try {
      return await operation();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.",
      );
      throw cause;
    } finally {
      setPending(false);
    }
  }

  return (
    <LoginModal
      open
      brandName={brandName}
      appearance="club"
      onClose={() => {
        if (!pending) onClose();
      }}
      isLoading={pending}
      error={error}
      marketingBanner={marketingBanner}
      onLogin={(identifier, password, options) =>
        perform(() => login(identifier, password, options))
      }
      onRegister={async (fullName, identifier, password, options) => {
        await perform(() => register(fullName, identifier, password, options));
      }}
    />
  );
}
