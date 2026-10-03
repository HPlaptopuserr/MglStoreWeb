"use client";

import { useState } from "react";
import { BusinessCapabilityEditor } from "./BusinessCapabilityEditor";
import {
  ROLE_LABEL,
  type BusinessAppMember,
  type BusinessAppFeatures,
} from "./mgl-business.model";

import { BUSINESS_CAPABILITY_OPTIONS as CAPABILITIES } from "@mgl/types";

export function BusinessMemberCapabilities({
  members,
  features,
  organizationId,
  disabled,
  onUpdated,
  onSavingChange,
}: {
  members: BusinessAppMember[];
  features: BusinessAppFeatures;
  organizationId: string;
  disabled: boolean;
  onUpdated: (memberId: string, capabilities: string[]) => void;
  onSavingChange: (saving: boolean) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const editing = members.find((member) => member.id === editingId);
  return (
    <section className="rounded-2xl border border-slate-200 p-5">
      <h3 className="text-lg font-bold text-slate-950">
        Ажилтанд оноосон аппын эрхүүд
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Байгууллагад нээсэн аппуудын хүрээнд ажилтанд эрх олгох, цуцлах. Албан
        тушаалын үндсэн эрхүүд тусдаа үйлчилнэ.
      </p>
      {disabled && (
        <p className="mt-3 text-sm text-amber-700">
          Ажилтны эрх өөрчлөхөөс өмнө байгууллагын тохиргоогоо хадгална уу.
        </p>
      )}
      {saved && (
        <p role="status" className="mt-3 text-sm text-emerald-700">
          Ажилтны эрх хадгалагдлаа.
        </p>
      )}
      {!members.length ? (
        <p className="mt-4 text-sm text-slate-500">Идэвхтэй ажилтан алга.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <caption className="sr-only">
              Байгууллагын ажилтнууд болон оноосон эрхүүд
            </caption>
            <thead className="border-b text-xs text-slate-500">
              <tr>
                <th scope="col" className="p-3">
                  Ажилтан
                </th>
                <th scope="col" className="p-3">
                  Албан тушаал
                </th>
                <th scope="col" className="p-3">
                  Оноосон эрх
                </th>
                <th scope="col" className="p-3">
                  <span className="sr-only">Үйлдэл</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <th scope="row" className="p-3 font-medium text-slate-900">
                    {member.fullName ||
                      member.email ||
                      member.phone ||
                      "Нэргүй ажилтан"}
                  </th>
                  <td className="p-3 text-slate-600">
                    {ROLE_LABEL[member.role] ?? member.role}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {member.role === "OWNER" ? (
                        <span className="text-emerald-700">
                          Байгууллагад нээсэн бүх апп
                        </span>
                      ) : member.capabilities === undefined ? (
                        <span className="text-slate-500">
                          Эрхийн мэдээлэл ирээгүй
                        </span>
                      ) : !member.capabilities.length ? (
                        <span className="text-slate-500">
                          Нэмэлт эрх оноогоогүй
                        </span>
                      ) : (
                        member.capabilities.map((capability) => {
                          const info = CAPABILITIES[capability];
                          const disabled = info && !features[info.feature];
                          return (
                            <span
                              key={capability}
                              className={`rounded-lg px-2 py-1 text-xs ${disabled ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700"}`}
                            >
                              {info?.label ?? capability}
                              {disabled ? " · Байгууллагад унтраалттай" : ""}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    {member.role !== "OWNER" && (
                      <button
                        type="button"
                        disabled={
                          disabled ||
                          editingId !== null ||
                          member.capabilities === undefined
                        }
                        aria-label={`${member.fullName || member.email || "Ажилтан"}: эрх өөрчлөх`}
                        onClick={() => {
                          setEditingId(member.id);
                          setSaved(false);
                        }}
                        className="whitespace-nowrap rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                      >
                        Эрх өөрчлөх
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && !disabled && (
        <BusinessCapabilityEditor
          key={editing.id}
          organizationId={organizationId}
          member={editing}
          features={features}
          onCancel={() => setEditingId(null)}
          onSaved={(capabilities) => {
            onUpdated(editing.id, capabilities);
            setEditingId(null);
            setSaved(true);
          }}
          onSavingChange={onSavingChange}
        />
      )}
    </section>
  );
}
