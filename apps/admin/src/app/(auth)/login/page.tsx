"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "../../../components/templates/AuthLayout";
import { LoginForm } from "../../../components/organisms/LoginForm";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (email: string, password: string) => {
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Нэвтрэх үед алдаа гарлаа");
      }

      localStorage.setItem("admin_token", data.accessToken);
      localStorage.setItem("admin_user", JSON.stringify(data.user));

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Нэвтрэх нэр эсвэл нууц үг буруу байна",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <LoginForm onSubmit={handleLogin} isLoading={isLoading} error={error} />
    </AuthLayout>
  );
}
