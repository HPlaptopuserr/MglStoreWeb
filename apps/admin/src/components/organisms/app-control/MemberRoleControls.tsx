"use client";

import { UserCog } from "lucide-react";
import { ROLE_LABEL, ROLE_OPTIONS, type BusinessAppMember, type BusinessAppRole } from "./mgl-business.model";

export function MemberRoleControls({
  members,
  savingRoleUserId,
  onRoleChange,
}: {
  members: BusinessAppMember[];
  savingRoleUserId: string | null;
  onRoleChange: (member: BusinessAppMember, role: BusinessAppRole) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Ажилчдын app role
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-950">
            CEO, Manager, Staff эрх оноох
          </h3>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
            Энэ role нь MGL Business app дээр navbar, task оноох, ажилтан
            удирдах боломжийг тодорхойлно.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600">
          <UserCog size={14} />
          {members.length} ажилтан
        </span>
      </div>

      {members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm font-bold text-slate-500">
          Энэ байгууллагад app login эрхтэй ажилтан алга байна.
        </div>
      ) : (
        <div className="grid gap-3">
          {members.map((member) => {
            const locked = member.role === "OWNER" || Boolean(member.isPrimary);
            const displayName = member.fullName || member.email || "Ажилтан";
            return (
              <div
                key={member.userId}
                className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-3 md:grid-cols-[minmax(0,1fr)_220px]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
                    {displayName.trim().charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      {displayName}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                      {member.email || member.phone || "Login мэдээлэл алга"}
                    </p>
                  </div>
                </div>

                <label className="grid gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    App role
                  </span>
                  <select
                    value={member.role}
                    disabled={locked || savingRoleUserId === member.userId}
                    onChange={(event) =>
                      onRoleChange(
                        member,
                        event.target.value as BusinessAppRole,
                      )
                    }
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="OWNER">{ROLE_LABEL.OWNER}</option>
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] font-semibold leading-4 text-slate-400">
                    {locked
                      ? "Owner-ийг өөр ажилтны dropdown-оос шилжүүлнэ."
                      : ROLE_OPTIONS.find((role) => role.value === member.role)
                          ?.description || ROLE_LABEL[member.role]}
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

