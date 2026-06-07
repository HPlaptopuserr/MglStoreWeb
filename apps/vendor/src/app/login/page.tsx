"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";
const url = process.env.NEXT_PUBLIC_URL || "https://mglstore.mn";

export default function VendorLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!identifier || !password) {
      setError("Нэвтрэх нэр болон нууц үгээ бүрэн оруулна уу.");
      setIsLoading(false);
      return;
    }

    const isPhone = /^[0-9+\-\s()]{7,15}$/.test(identifier.trim());

    try {
      const res = await fetch(`${API_URL}/auth/vendor/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isPhone
            ? { phone: identifier.trim(), password }
            : { email: identifier.trim().toLowerCase(), password },
        ),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Нэвтрэх үед алдаа гарлаа");

      // Check if user has an org membership (orgRole from login response)
      if (!data.user.orgRole && !data.user.organizationId)
        throw new Error("Байгууллагад бүртгэлтэй хэрэглэгч биш байна");

      localStorage.setItem("vendor_token", data.accessToken);
      localStorage.setItem("vendor_user", JSON.stringify(data.user));

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
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Panel: Branding & Trust Metrics (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white flex-col justify-between p-16 relative overflow-hidden">
        {/* Abstract background shape for premium feel */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full fill-current text-amber-500"
          >
            <polygon points="0,100 100,0 100,100" />
          </svg>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">
            MGL<span className="text-amber-500">STORE</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md">
            Үндэсний үйлдвэрлэгч, нийлүүлэгчдийн нэгдсэн экосистем. Монголдоо
            мөнгөө үлдээх хөдөлгөөнд нэгдээрэй.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center space-x-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur-sm">
            <div className="bg-amber-500/20 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-400">Сүлжээний өсөлт</p>
              <p className="text-xl font-bold">240+ Харилцагч байгууллага</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Системд нэвтрэх
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Admin-аас үүсгэсэн owner эсвэл ажилтны login эрхээр нэвтэрнэ.
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                <p>{error}</p>
                <p className="mt-1 text-xs font-medium leading-5 text-red-600">
                  Байгууллагын контакт утас/и-мэйл биш, admin дээрх “Vendor login account” хэсгийн login утас эсвэл и-мэйлийг ашиглана.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-bold text-amber-900">
                Нэвтрэх нэр нь байгууллагын утас биш
              </p>
              <p className="mt-1 text-xs font-medium leading-5 text-amber-800">
                Admin дээр partner detail доторх “Vendor login account” хэсэгт байгаа хэрэглэгчийн и-мэйл эсвэл утсаар нэвтэрнэ.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium text-slate-700 mb-1"
                  htmlFor="identifier"
                >
                  Login хэрэглэгчийн и-мэйл эсвэл утас
                </label>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors bg-slate-50 focus:bg-white text-slate-900"
                  placeholder="owner@company.mn эсвэл login утас"
                  disabled={isLoading}
                />
                <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                  Жишээ нь байгууллагын контакт утас 89123581 байлаа ч owner login утас өөр байж болно.
                </p>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label
                    className="block text-sm font-medium text-slate-700"
                    htmlFor="password"
                  >
                    Нууц үг
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-sm text-amber-600 hover:text-amber-500 font-medium transition-colors"
                  >
                    Нууц үгээ мартсан?
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors bg-slate-50 focus:bg-white text-slate-900"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                "Нэвтрэх"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Байгууллагаар бүртгүүлэх хүсэлтэй бол{" "}
            <a
              href={`${url}/company/partnership#partnership-form`}
              className="font-bold text-slate-900 hover:text-amber-600 transition-colors"
            >
              энд дарна уу
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
