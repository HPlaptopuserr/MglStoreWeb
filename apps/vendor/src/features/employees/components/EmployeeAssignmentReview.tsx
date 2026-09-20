import type { Ref } from "react";
import {
  Check,
  CheckCircle2,
  KeyRound,
  Monitor,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import type { PersonalAccount } from "../store-employee.model";
import { EmployeeAvatar } from "./EmployeePrimitives";

interface EmployeeAssignmentReviewProps {
  account: PersonalAccount;
  heading: Ref<HTMLHeadingElement>;
}

export function EmployeeAssignmentReview({
  account,
  heading,
}: EmployeeAssignmentReviewProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3
          ref={heading}
          tabIndex={-1}
          className="mb-2 text-sm font-semibold text-slate-800 outline-none"
        >
          Сонгосон хэрэглэгч
        </h3>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
          <EmployeeAvatar name={account.fullName || account.email} />
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-semibold">
              {account.fullName || "Нэр бүртгээгүй"}
            </p>
            <p className="mt-1 break-all text-xs text-slate-500">
              {account.email}
            </p>
            {account.phone && (
              <p className="mt-1 text-xs text-slate-500">{account.phone}</p>
            )}
          </div>
          <CheckCircle2
            className="size-5 shrink-0 text-emerald-500"
            aria-hidden="true"
          />
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">
          Оноох ажил, хандах эрх
        </h3>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-100 p-2.5 text-blue-600">
              <Monitor className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">Кассын ажилтан</p>
              <p className="mt-1 text-xs text-slate-500">
                Зөвхөн энэ дэлгүүрт үйлчилнэ
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-3 border-t border-blue-100 pt-4 text-sm text-slate-700">
            <li className="flex items-center gap-2.5">
              <Check className="size-4 text-blue-600" aria-hidden="true" />
              POS кассаар борлуулалт хийх
            </li>
            <li className="flex items-center gap-2.5">
              <PackageCheck
                className="size-4 text-blue-600"
                aria-hidden="true"
              />
              Барааны үлдэгдэл харах
            </li>
            <li className="flex items-start gap-2.5 text-xs leading-5 text-slate-500">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              Дэлгүүрийн тохиргоо, ажилтны эрхийг удирдах боломжгүй.
            </li>
          </ul>
        </div>
      </div>
      <p className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        <KeyRound
          className="mt-0.5 size-4 shrink-0 text-slate-400"
          aria-hidden="true"
        />
        Ажилтан өөрийн MGL Store бүртгэлээр нэвтэрнэ. Нэр, утас, нууц үгийг нь
        дахин оруулах шаардлагагүй.
      </p>
    </div>
  );
}
