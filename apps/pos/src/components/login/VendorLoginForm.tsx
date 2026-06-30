"use client";

import { FormEvent, useState } from "react";
import { loginVendorUser } from "@/lib/vendor-auth";
import VendorPasswordToggle from "@/components/login/VendorPasswordToggle";

export default function VendorLoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("Нэвтрэх нэр болон нууц үгээ бүрэн оруулна уу.");
      return;
    }

    setIsLoading(true);
    try {
      await loginVendorUser(identifier, password);
      window.location.assign("/pos");
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
    <form className="mt-8 space-y-6" onSubmit={handleLogin}>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <p>{error}</p>
          <p className="mt-1 text-xs font-medium leading-5 text-red-600">
            Байгууллагын контакт утас/и-мэйл биш, admin дээрх “Vendor login
            account” хэсгийн login утас эсвэл и-мэйлийг ашиглана.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-bold text-amber-900">
          Нэвтрэх нэр нь байгууллагын утас биш
        </p>
        <p className="mt-1 text-xs font-medium leading-5 text-amber-800">
          Admin дээр partner detail доторх “Vendor login account” хэсэгт байгаа
          хэрэглэгчийн и-мэйл эсвэл утсаар нэвтэрнэ.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            className="mb-1 block text-sm font-medium text-slate-700"
            htmlFor="identifier"
          >
            Login хэрэглэгчийн и-мэйл эсвэл утас
          </label>
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition-colors focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500"
            placeholder="owner@company.mn эсвэл login утас"
            disabled={isLoading}
          />
          <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
            Жишээ нь байгууллагын контакт утас өөр байсан ч owner login утас
            тусдаа байж болно.
          </p>
        </div>

        <div>
          <div className="mb-1 flex justify-between">
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="password"
            >
              Нууц үг
            </label>
            <a
              href="/forgot-password"
              className="text-sm font-medium text-amber-600 transition-colors hover:text-amber-500"
            >
              Нууц үгээ мартсан?
            </a>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-slate-900 transition-colors focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500"
              placeholder="••••••••"
              disabled={isLoading}
            />
            <VendorPasswordToggle
              visible={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full justify-center rounded-xl border border-transparent bg-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Нэвтэрч байна..." : "Нэвтрэх"}
      </button>
    </form>
  );
}
