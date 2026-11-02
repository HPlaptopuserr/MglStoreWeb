"use client";

import { useState } from "react";
import { LoginModal } from "@/components/organisms/auth/LoginModal";
import { useAuth } from "@/lib/auth-context";

export default function ClubAuthDialog({ onClose }: { onClose: () => void }) {
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
      brandName="MGL Club"
      appearance="club"
      onClose={() => {
        if (!pending) onClose();
      }}
      isLoading={pending}
      error={error}
      marketingBanner={{
        eyebrow: "MGL CLUB",
        title: "Таны бизнесийн шинэ хүрээлэл",
        quote: "Танилцъя. Холбогдъё. Хамтдаа өсөцгөөе.",
        author: "MGL CLUB",
        role: "Бизнесийн хамтын нийгэмлэг",
        href: "/mgl-club",
        cta: "Клубийн гишүүдийг харах",
      }}
      onLogin={(identifier, password, options) =>
        perform(() => login(identifier, password, options))
      }
      onRegister={async (fullName, identifier, password, options) => {
        await perform(() => register(fullName, identifier, password, options));
      }}
    />
  );
}
