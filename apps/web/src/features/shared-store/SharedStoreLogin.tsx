"use client";
import { useState } from "react";
import { LoginModal } from "@/components/organisms/auth/LoginModal";
import { useAuth } from "@/lib/auth-context";
export function SharedStoreLogin({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return (
    <LoginModal
      open
      onClose={onClose}
      isLoading={loading}
      error={error}
      onLogin={async (identifier, password, options) => {
        setLoading(true);
        setError("");
        try {
          const result = await login(identifier, password, options);
          if (!result?.requiresEmailOtp) onSuccess();
          return result;
        } catch (cause: unknown) {
          setError(
            cause instanceof Error ? cause.message : "Нэвтэрч чадсангүй.",
          );
        } finally {
          setLoading(false);
        }
      }}
      onRegister={async (name, identifier, password, options) => {
        setLoading(true);
        setError("");
        try {
          await register(name, identifier, password, options);
          onSuccess();
        } catch (cause: unknown) {
          setError(
            cause instanceof Error ? cause.message : "Бүртгэж чадсангүй.",
          );
        } finally {
          setLoading(false);
        }
      }}
    />
  );
}
