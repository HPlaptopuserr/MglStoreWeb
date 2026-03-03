"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "../../../components/templates/AuthLayout";
import { LoginForm } from "../../../components/organisms/LoginForm";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (email: string, password: string) => {
    setError("");
    setIsLoading(true);

    if (email === "admin@mglstore.mn" && password === "password") {
      localStorage.setItem("admin_token", "dummy-token");
      router.push("/dashboard");
    } else {
      setError("Нэвтрэх нэр эсвэл нууц үг буруу байна");
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <LoginForm
        onSubmit={handleLogin}
        isLoading={isLoading}
        error={error}
      />
    </AuthLayout>
  );
}
