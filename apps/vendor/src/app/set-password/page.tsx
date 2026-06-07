"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

function SetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    email?: string;
    organizationName?: string;
  }>({});

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError("Token олдсонгүй");
        setIsValidating(false);
        return;
      }

      try {
        const res = await fetch(
          `${API_URL}/api/vendor-setup/validate?token=${token}`,
        );
        const data = await res.json();

        if (data.valid) {
          setTokenValid(true);
          setUserInfo({
            email: data.email,
            organizationName: data.organizationName,
          });
        } else {
          setError(data.error || "Token буруу байна");
        }
      } catch (err) {
        setError("Серверт холбогдоход алдаа гарлаа");
      } finally {
        setIsValidating(false);
      }
    }

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Бүх талбарыг бөглөнө үү");
      return;
    }

    if (password.length < 8) {
      setError("Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой");
      return;
    }

    if (password !== confirmPassword) {
      setError("Нууц үг таарахгүй байна");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/vendor-setup/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError(data.message || "Алдаа гарлаа");
      }
    } catch (err) {
      setError("Серверт холбогдоход алдаа гарлаа");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Шалгаж байна...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid && !isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="bg-red-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Урилга буруу эсвэл хугацаа дууссан
          </h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <p className="text-sm text-slate-500 mb-6">
            Хэрэв танд асуудал байвал admin-тай холбогдоно уу.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-3 px-4 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition-colors"
          >
            Нэвтрэх хуудас руу буцах
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Нууц үг амжилттай тохируулагдлаа!
          </h1>
          <p className="text-slate-600 mb-6">
            Та одоо {userInfo.email} имэйлээр нэвтэрч орж болно.
          </p>
          <p className="text-sm text-slate-500">
            Нэвтрэх хуудас руу автоматаар шилжих болно...
          </p>
        </div>
      </div>
    );
  }

  // Set password form
  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white flex-col justify-between p-16 relative overflow-hidden">
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
            Тавтай морил, {userInfo.organizationName || "Түнш"}!
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-3">
              Таны хүсэлт зөвшөөрөгдлөө
            </h3>
            <p className="text-slate-400 text-sm">
              Нууц үгээ тохируулсны дараа та vendor dashboard руу нэвтэрч орж,
              бүтээгдэхүүн нэмэх, захиалга удирдах боломжтой болно.
            </p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="bg-amber-500/20 p-2 rounded-lg">
                <svg
                  className="w-5 h-5 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Аюулгүй нууц үг</p>
                <p className="text-xs text-slate-400">
                  Хамгийн багадаа 8 тэмдэгт
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Set Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-800">
              Нууц үг тохируулах
            </h2>
            <p className="text-slate-500 mt-2">
              {userInfo.email} имэйлийн нууц үг үүсгэнэ үү
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Password input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Нууц үг
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Хамгийн багадаа 8 тэмдэгт"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Нууц үг давтах
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Нууц үгээ дахин оруулна уу"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
              />
            </div>

            {/* Password strength indicator */}
            {password && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= (i + 1) * 3
                          ? password.length >= 12
                            ? "bg-green-500"
                            : password.length >= 8
                              ? "bg-amber-500"
                              : "bg-red-500"
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
                <p
                  className={`text-xs ${
                    password.length >= 12
                      ? "text-green-600"
                      : password.length >= 8
                        ? "text-amber-600"
                        : "text-red-600"
                  }`}
                >
                  {password.length >= 12
                    ? "Хүчтэй нууц үг"
                    : password.length >= 8
                      ? "Дунд зэргийн нууц үг"
                      : "Нууц үг хэт богино"}
                </p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || password.length < 8}
              className="w-full py-3 px-4 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Хадгалж байна...
                </>
              ) : (
                "Нууц үг тохируулах"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}
