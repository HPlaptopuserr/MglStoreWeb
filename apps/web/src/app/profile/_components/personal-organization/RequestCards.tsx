"use client";

import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import type {
  PendingPersonalOrganization,
  PersonalOrganizationInvitation,
} from "./types";

type PendingOrganizationCardProps = {
  organization: PendingPersonalOrganization;
};

type InvitationCardProps = {
  invitation: PersonalOrganizationInvitation;
  busy: boolean;
  onRespond: (id: string, action: "approve" | "reject") => void;
};

export function PendingOrganizationCard({ organization }: PendingOrganizationCardProps) {
  const invitation = organization.invitation;

  return (
    <article className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <Clock3 className="h-4 w-4" />
            Баталгаажуулалт хүлээгдэж байна
          </div>
          <h3 className="mt-2 text-lg font-bold text-slate-950">
            {organization.name}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {organization.businessCategory || "Үйл ажиллагааны чиглэл оруулаагүй"}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700 shadow-sm">
          Pending
        </span>
      </div>
      <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm text-slate-600">
        {invitation ? (
          <>
            <p className="font-semibold text-slate-800">
              Уригдсан: {invitation.inviteeName || invitation.inviteeEmail || invitation.inviteePhone || "Хэрэглэгч"}
            </p>
            <p className="mt-1">
              Төлөв:{" "}
              <span className="font-semibold text-amber-700">
                {invitation.status === "REJECTED" ? "Татгалзсан" : "Хариу хүлээгдэж байна"}
              </span>
            </p>
            {invitation.rejectedReason ? (
              <p className="mt-2 text-rose-600">{invitation.rejectedReason}</p>
            ) : null}
          </>
        ) : (
          "Баталгаажуулах урилга бүртгэгдээгүй байна."
        )}
      </div>
    </article>
  );
}

export function InvitationCard({ invitation, busy, onRespond }: InvitationCardProps) {
  return (
    <article className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            Байгууллага баталгаажуулах хүсэлт
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">
            {invitation.organizationName}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {invitation.businessCategory || "Үйл ажиллагааны чиглэл"} •{" "}
            {invitation.ownerName || invitation.ownerEmail || "Үүсгэгч хэрэглэгч"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onRespond(invitation.id, "reject")}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Татгалзах
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onRespond(invitation.id, "approve")}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Батлах
          </button>
        </div>
      </div>
    </article>
  );
}
