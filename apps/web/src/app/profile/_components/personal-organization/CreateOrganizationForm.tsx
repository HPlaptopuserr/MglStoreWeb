"use client";

import { CheckCircle2, Loader2, Plus, ShieldCheck } from "lucide-react";
import { FormField } from "./FormField";
import { InviteeSelector } from "./InviteeSelector";
import type { usePersonalOrganizationOnboarding } from "./usePersonalOrganizationOnboarding";

type CreateOrganizationFormProps = Pick<
  ReturnType<typeof usePersonalOrganizationOnboarding>,
  | "businessCategory"
  | "changeInviteeQuery"
  | "errors"
  | "formValid"
  | "hasPending"
  | "inviteeError"
  | "inviteeLoading"
  | "inviteeQuery"
  | "inviteeUsers"
  | "nameAvailable"
  | "nameChecking"
  | "organizationName"
  | "selectedInvitee"
  | "selectInvitee"
  | "setBusinessCategory"
  | "setOrganizationName"
  | "submit"
  | "submitError"
  | "submitting"
  | "success"
>;

function nameHelper(nameChecking: boolean, nameAvailable: boolean | null) {
  if (nameChecking) return "Нэр давхцал шалгаж байна...";
  if (nameAvailable) return "Энэ нэрээр бүртгүүлэх боломжтой.";
  return "Зөвхөн монгол кирилл үсэг, зай, цэг, зураас ашиглана.";
}

export function CreateOrganizationForm(props: CreateOrganizationFormProps) {
  return (
    <form onSubmit={props.submit} className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
      <div className="space-y-4">
        <FormField
          id="personal-org-name"
          label="Байгууллагын нэр"
          error={props.errors.organizationName}
          helper={nameHelper(props.nameChecking, props.nameAvailable)}
        >
          <input
            id="personal-org-name"
            value={props.organizationName}
            disabled={props.hasPending}
            onChange={(event) => props.setOrganizationName(event.target.value)}
            placeholder="Жишээ: Тэнгэр Хүнс ХХК"
            aria-invalid={Boolean(props.errors.organizationName)}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
          />
        </FormField>

        <FormField
          id="personal-org-category"
          label="Үйл ажиллагааны чиглэл"
          error={props.errors.businessCategory}
          helper="Жишээ: хүнс үйлдвэрлэл, худалдаа, үйлчилгээ"
        >
          <input
            id="personal-org-category"
            value={props.businessCategory}
            disabled={props.hasPending}
            onChange={(event) => props.setBusinessCategory(event.target.value)}
            placeholder="Үйл ажиллагааны чиглэлээ оруулна уу"
            aria-invalid={Boolean(props.errors.businessCategory)}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
          />
        </FormField>
      </div>

      <FormField
        id="personal-org-invitee"
        label="Баталгаажуулах хоёр дахь хүн"
        error={props.errors.invitee}
        helper="Өөрийн account-ыг сонгох боломжгүй."
      >
        <InviteeSelector
          query={props.inviteeQuery}
          users={props.inviteeUsers}
          selectedUser={props.selectedInvitee}
          loading={props.inviteeLoading}
          error={props.inviteeError}
          onQueryChange={props.changeInviteeQuery}
          onSelect={props.selectInvitee}
        />
      </FormField>

      <div className="lg:col-span-2">
        {props.submitError ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {props.submitError}
          </div>
        ) : null}
        {props.success ? (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {props.success}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Backend validation болон duplicate хамгаалалт идэвхтэй.
          </div>
          <button
            type="submit"
            disabled={props.submitting || props.hasPending || !props.formValid}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {props.submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Байгууллага үүсгэх
          </button>
        </div>
      </div>
    </form>
  );
}
