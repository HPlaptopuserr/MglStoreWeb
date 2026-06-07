"use client";

import { useRouter } from "next/navigation";
import { ForgotPasswordFlow } from "@mgl/ui";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

export default function VendorForgotPasswordPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex bg-slate-50">
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white flex-col justify-between p-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full fill-current text-amber-500">
            <polygon points="0,100 100,0 100,100" />
          </svg>
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">
            MGL<span className="text-amber-500">STORE</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md">
            Үндэсний үйлдвэрлэгч, нийлүүлэгчдийн нэгдсэн экосистем.
          </p>
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black leading-tight">
            Нууц үг<br />сэргээх<br />
            <span className="text-amber-500">хэсэг</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            И-мэйл эсвэл утасны дугаараар баталгаажуулах код авч нууц үгээ шинэчилнэ үү.
          </p>
        </div>
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-slate-400">Систем хэвийн ажиллаж байна</span>
          </div>
          <p className="text-[11px] text-slate-600">© {new Date().getFullYear()} MGL Store Platform</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-10">
          <ForgotPasswordFlow
            apiBase={API_URL}
            authPathPrefix="/auth/vendor"
            onDone={() => router.push("/login")}
          />
        </div>
      </div>
    </div>
  );
}
