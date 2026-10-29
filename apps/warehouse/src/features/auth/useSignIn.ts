"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "./auth-service";

export function useSignIn(destination: string) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace(destination);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Сервертэй холбогдож чадсангүй.",
      );
    } finally {
      setLoading(false);
    }
  };
  return {
    email,
    setEmail,
    password,
    setPassword,
    error,
    loading,
    handleLogin,
  };
}
