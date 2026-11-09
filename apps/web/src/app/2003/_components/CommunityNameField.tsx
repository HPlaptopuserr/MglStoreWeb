"use client";

import { UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { RegistrationField } from "./RegistrationField";

export function CommunityNameField({
  defaultValue = "",
  editing = false,
}: {
  defaultValue?: string;
  editing?: boolean;
}) {
  const { user, loading } = useAuth();
  const accountName = user?.fullName?.trim();
  if (loading)
    return (
      <p role="status" className="text-sm text-slate-500">
        Бүртгэлийн мэдээллийг ачаалж байна…
      </p>
    );
  if (!editing && accountName)
    return (
      <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-800">
          <UserRound size={20} aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs text-slate-500">Танилцуулга нийтлэх нэр</p>
          <p className="mt-1 font-semibold text-blue-950">{accountName}</p>
        </div>
        <input type="hidden" name="name" value={accountName} />
      </div>
    );
  return (
    <RegistrationField
      name="name"
      label="Овог, нэр"
      defaultValue={defaultValue || accountName || ""}
      placeholder="Таны овог, нэр"
      autoComplete="name"
      required
    />
  );
}
