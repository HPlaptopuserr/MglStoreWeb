"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { SYSTEM_ROLE_META } from "./constants";
import { updateUserRole } from "./system-users.api";
import type { SystemUser } from "./types";

type RoleMenuProps = {
  user: SystemUser;
  onChanged: () => void;
};

export function RoleMenu({ user, onChanged }: RoleMenuProps) {
  const meta = SYSTEM_ROLE_META[user.role] ?? SYSTEM_ROLE_META.USER;
  const RoleIcon = meta.icon;
  const [changingRole, setChangingRole] = useState(false);
  const [open, setOpen] = useState(false);

  const handleRoleChange = async (newRole: string) => {
    if (newRole === user.role) {
      setOpen(false);
      return;
    }

    setChangingRole(true);
    setOpen(false);
    try {
      await updateUserRole(user.id, newRole);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Role солиход алдаа гарлаа");
    } finally {
      setChangingRole(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={changingRole}
        className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold transition-opacity hover:opacity-80 ${meta.bg} ${meta.color} ${changingRole ? "opacity-50" : ""}`}
        title="Role солих"
      >
        {changingRole ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RoleIcon className="h-3 w-3" />
        )}
        {meta.label}
        <ChevronDown className="ml-0.5 h-2.5 w-2.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {Object.entries(SYSTEM_ROLE_META).map(([key, roleMeta]) => {
              const Icon = roleMeta.icon;
              const isActive = key === user.role;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleRoleChange(key)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? `${roleMeta.bg} ${roleMeta.color}`
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {roleMeta.label}
                  {isActive && <CheckCircle2 className="ml-auto h-3 w-3" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
