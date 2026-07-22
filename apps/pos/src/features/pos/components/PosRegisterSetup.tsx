"use client";

import { AlertTriangle, Info, Loader2, Monitor, Settings, X } from "lucide-react";
import type { ReactNode } from "react";
import type { Branch } from "../api/register";
import type { RegisterConfig } from "../types/pos.types";

type SetupTab = "new" | "existing";

type SetupBannerProps = {
  onOpen: () => void;
};

export function PosRegisterSetupBanner({ onOpen }: SetupBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertTriangle size={16} className="shrink-0 text-amber-600" />
      <p className="flex-1 text-sm font-medium text-amber-800">
        POS бүртгэгдээгүй байна.
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="flex h-8 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-sm font-semibold text-white hover:bg-amber-600"
      >
        <Settings size={13} />
        Бүртгэх
      </button>
    </div>
  );
}

type PickerProps = {
  registers: RegisterConfig[];
  onClose: () => void;
  onSelect: (register: RegisterConfig) => void;
};

export function PosRegisterPicker({
  registers,
  onClose,
  onSelect,
}: PickerProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Monitor size={15} className="text-violet-600" />
          POS кассаа сонгох
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          <X size={16} />
        </button>
      </div>
      <div className="space-y-2 px-5 py-4">
        <p className="mb-3 text-xs text-slate-500">
          Таны байгууллагад бүртгэгдсэн {registers.length} POS касс байна.
          Нэгийг сонгоно уу.
        </p>
        {registers.map((register) => (
          <button
            key={register.id}
            type="button"
            onClick={() => onSelect(register)}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-violet-400 hover:bg-violet-50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Monitor size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">
                {register.name}
              </p>
              <p className="text-xs text-slate-500">{register.branch?.name}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-1">
              {register.cardEnabled ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Карт
                </span>
              ) : null}
              {register.qpayEnabled ? (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                  QPay
                </span>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

type SetupPanelProps = {
  registerConfig: RegisterConfig | null;
  setupTab: SetupTab;
  setupName: string;
  setupBranches: Branch[];
  setupBranchId: string;
  setupRegistering: boolean;
  setupError: string;
  setupExistingId: string;
  onClose: () => void;
  onChangeTab: (tab: SetupTab) => void;
  onClearError: () => void;
  onChangeName: (value: string) => void;
  onChangeBranchId: (value: string) => void;
  onChangeExistingId: (value: string) => void;
  onCreate: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
};

export function PosRegisterSetupPanel({
  registerConfig,
  setupTab,
  setupName,
  setupBranches,
  setupBranchId,
  setupRegistering,
  setupError,
  setupExistingId,
  onClose,
  onChangeTab,
  onClearError,
  onChangeName,
  onChangeBranchId,
  onChangeExistingId,
  onCreate,
  onConnect,
  onDisconnect,
}: SetupPanelProps) {
  const vendorPortalUrl =
    process.env.NEXT_PUBLIC_VENDOR_PORTAL_URL || "https://vendor.mglstore.mn";

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Monitor size={15} className="text-violet-600" />
          POS тохируулах
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex border-b border-slate-100">
        <SetupTabButton
          active={setupTab === "new"}
          onClick={() => {
            onChangeTab("new");
            onClearError();
          }}
        >
          Шинэ register үүсгэх
        </SetupTabButton>
        <SetupTabButton
          active={setupTab === "existing"}
          onClick={() => {
            onChangeTab("existing");
            onClearError();
          }}
        >
          Байгаа ID оруулах
        </SetupTabButton>
      </div>

      <div className="space-y-3 px-5 py-4">
        {setupError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {setupError}
          </div>
        ) : null}

        {setupTab === "new" ? (
          <NewRegisterForm
            setupName={setupName}
            branches={setupBranches}
            branchId={setupBranchId}
            submitting={setupRegistering}
            onChangeName={onChangeName}
            onChangeBranchId={onChangeBranchId}
            onCreate={onCreate}
          />
        ) : (
          <ExistingRegisterForm
            value={setupExistingId}
            submitting={setupRegistering}
            onChange={onChangeExistingId}
            onConnect={onConnect}
          />
        )}

        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Info size={13} className="shrink-0 text-slate-400" />
            <span>QPay төлбөр:</span>
            {registerConfig?.effectiveQpayEnabled ? (
              <span className="font-semibold text-emerald-600">Идэвхтэй</span>
            ) : (
              <span className="font-semibold text-amber-600">Тохируулаагүй</span>
            )}
          </div>
          <a
            href={`${vendorPortalUrl}/profile?tab=qpay`}
            className="shrink-0 text-xs font-semibold text-violet-600 hover:underline"
          >
            QPay тохиргоо →
          </a>
        </div>

        {registerConfig ? (
          <button
            type="button"
            onClick={onDisconnect}
            className="text-xs text-rose-500 hover:underline"
          >
            Одоогийн холболтыг салгах ({registerConfig.name})
          </button>
        ) : null}
      </div>
    </div>
  );
}

type PendingBannerProps = {
  registerConfig: RegisterConfig;
  onOpenSettings: () => void;
};

export function PosRegisterPendingBanner({
  registerConfig,
  onOpenSettings,
}: PendingBannerProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex min-w-0 items-start gap-2 text-sm text-amber-800">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
        <div className="min-w-0">
          <p className="font-semibold">
            {registerConfig.name}
            <span className="font-normal text-amber-600">
              {" "}
              · {registerConfig.branch.name}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-amber-700">
            Admin батлахыг хүлээж байна. ID-г Admin-д дамжуулна уу:
          </p>
          <p className="mt-1 break-all rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs text-amber-900 select-all">
            {registerConfig.id}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenSettings}
        className="mt-0.5 shrink-0 text-slate-400 hover:text-slate-600"
      >
        <Settings size={14} />
      </button>
    </div>
  );
}

function SetupTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? "border-b-2 border-violet-500 bg-violet-50 text-violet-700"
          : "text-slate-500 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function NewRegisterForm({
  setupName,
  branches,
  branchId,
  submitting,
  onChangeName,
  onChangeBranchId,
  onCreate,
}: {
  setupName: string;
  branches: Branch[];
  branchId: string;
  submitting: boolean;
  onChangeName: (value: string) => void;
  onChangeBranchId: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Энэ кассын нэрийг оруулна уу. Шинэ register үүсгэгдэн Admin батлалт
        хүлээнэ.
      </p>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500">Нэр</label>
        <input
          value={setupName}
          onChange={(event) => onChangeName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCreate();
          }}
          placeholder="Касс 1"
          className="h-9 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500">Салбар</label>
        {branches.length === 0 ? (
          <p className="text-xs text-amber-600">
            Салбар олдсонгүй. Эхлээд салбар бүртгэнэ үү.
          </p>
        ) : (
          <select
            value={branchId}
            onChange={(event) => onChangeBranchId(event.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <button
        type="button"
        onClick={onCreate}
        disabled={submitting || !setupName.trim() || !branchId}
        className="flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Monitor size={14} />
        )}
        Register үүсгэх
      </button>
    </div>
  );
}

function ExistingRegisterForm({
  value,
  submitting,
  onChange,
  onConnect,
}: {
  value: string;
  submitting: boolean;
  onChange: (value: string) => void;
  onConnect: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Өмнө нь Admin-аас авсан Register UUID-г оруулна уу.
      </p>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onConnect();
          }}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="h-9 flex-1 rounded-xl border border-slate-200 px-3 font-mono text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
        <button
          type="button"
          onClick={onConnect}
          disabled={submitting || !value.trim()}
          className="h-9 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            "Холбох"
          )}
        </button>
      </div>
    </div>
  );
}
