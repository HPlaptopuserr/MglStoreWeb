"use client";

import { useRouter } from "next/navigation";
import { Warehouse } from "lucide-react";
import { ForgotPasswordFlow } from "@mgl/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden w-[480px] flex-col justify-between bg-[#0f172a] p-10 lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <Warehouse className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">MGL WMS</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">Warehouse Management System</p>
        </div>
        <div>
          <h2 className="text-3xl font-black leading-tight text-white">
            Нууц үг<br />сэргээх<br />
            <span className="text-blue-400">хэсэг</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            И-мэйл эсвэл утасны дугаараар баталгаажуулах код авч нууц үгээ шинэчилнэ үү.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-slate-400">Систем хэвийн ажиллаж байна</span>
          </div>
          <p className="text-[11px] text-slate-600">© {new Date().getFullYear()} MGL Store Platform</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <Warehouse className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">MGL WMS</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <ForgotPasswordFlow
              apiBase={API_URL}
              onDone={() => router.push("/login")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
