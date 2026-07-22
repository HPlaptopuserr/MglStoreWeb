"use client";

import { useEffect, useState } from "react";
import {
  Building,
  Download,
  Eye,
  FileText,
  Link as LinkIcon,
  Loader2,
  X,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import type { ContractSettings } from "./contract.types";

export function ContractDetailModal({
  contractId,
  onClose,
  settings,
}: {
  contractId: string;
  onClose: () => void;
  settings: ContractSettings;
}) {
  const [detail, setDetail] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  useEffect(() => {
    adminFetch(`${API}/contracts/${contractId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setDetail(d.contract);
          // If template → fetch submissions
          if (d.contract.isTemplate) {
            setLoadingSubs(true);
            adminFetch(`${API}/contracts/${contractId}/submissions`)
              .then((r2) => r2.json())
              .then((d2) => {
                if (d2.success) setSubmissions(d2.submissions);
              })
              .catch(() => {})
              .finally(() => setLoadingSubs(false));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contractId]);

  const member = detail?.memberData as any;
  const feePlanLabel = (key: string | null) => {
    const storedPlans: any[] =
      (detail?.headerData as any)?.feePlans ?? settings.feePlans;
    const p = storedPlans.find((f: any) => f.key === key);
    return p
      ? `${p.label} — ${Number(p.price).toLocaleString()}₮`
      : (key ?? "—");
  };
  const base = process.env.NEXT_PUBLIC_WEB_URL || "https://mglstore.mn";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex justify-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-[#1e4e8c]">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-white" />
            <div>
              <h2 className="font-bold text-white text-lg">
                {member?.name || "Гэрээний дэлгэрэнгүй"}
              </h2>
              <p className="text-blue-200 text-xs">
                MGL-{contractId.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        ) : !detail ? (
          <div className="flex-1 flex items-center justify-center text-neutral-500">
            Мэдээлэл олдсонгүй
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {/* Status + actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {detail.status === "SIGNED" && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                    ✓ Баталгаажсан
                  </span>
                )}
                {detail.status === "PENDING" && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                    ⏳ Хүлээгдэж буй
                  </span>
                )}
                {detail.isPaid && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    Төлбөртэй
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {detail.status === "SIGNED" && (
                  <button
                    onClick={() =>
                      window.open(
                        `${base}/contract/sign/${contractId}?print=1`,
                        "_blank",
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" /> PDF татах
                  </button>
                )}
                {detail.status === "PENDING" && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${base}/contract/sign/${contractId}`,
                      );
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
                  >
                    <LinkIcon className="w-4 h-4" /> Линк хуулах
                  </button>
                )}
              </div>
            </div>

            {/* Contract meta */}
            <div className="grid grid-cols-2 gap-3">
              {[
                [
                  "Гэрээний дугаар",
                  `MGL-${contractId.slice(0, 8).toUpperCase()}`,
                ],
                ["Хураамж", feePlanLabel(detail.feePlan)],
                [
                  "Баталгаажсан огноо",
                  detail.signedAt
                    ? new Date(detail.signedAt).toLocaleString("mn-MN")
                    : "—",
                ],
                [
                  "Гэрээний хугацаа",
                  settings.feePlans.find((f: any) => f.key === detail.feePlan)
                    ?.label ?? "—",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="bg-neutral-50 border border-neutral-100 rounded-xl p-4"
                >
                  <div className="text-xs text-neutral-500 mb-1">{label}</div>
                  <div className="font-semibold text-neutral-800 text-sm">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Member info */}
            {member && (
              <div className="bg-white border border-[#b4c6e7] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#f0f4ff] border-b border-[#b4c6e7] flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#1e4e8c]" />
                  <span className="font-semibold text-[#1e4e8c] text-sm">
                    Гишүүн байгууллагын мэдээлэл
                  </span>
                </div>
                <div className="divide-y divide-neutral-100">
                  {(
                    [
                      ["Байгууллагын нэр", member.name],
                      ["Регистрийн дугаар", member.register],
                      ["Үйл ажиллагааны чиглэл", member.field],
                      ["Хаяг", member.address],
                      ["Утас", member.phone],
                      ["И-мэйл", member.email],
                      ["Вэбсайт", member.website],
                      ["Нэр", member.director],
                    ] as [string, string][]
                  )
                    .filter(([, v]) => v)
                    .map(([label, value]) => (
                      <div key={label} className="flex px-4 py-2.5 gap-4">
                        <span className="text-xs text-neutral-500 w-40 flex-shrink-0 pt-0.5">
                          {label}
                        </span>
                        <span className="text-sm text-neutral-800 font-medium">
                          {value}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Signatures — only for non-template submissions */}
            {!detail.isTemplate && (
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-[#b4c6e7] rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-[#f0f4ff] border-b border-[#b4c6e7] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1e4e8c]">
                      ХОЛБООНЫ ГАРЫН ҮСЭГ
                    </span>
                    {detail.adminSignature && (
                      <a
                        href={detail.adminSignature}
                        download="admin-signature.png"
                        className="text-xs text-[#1e4e8c] hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> PNG
                      </a>
                    )}
                  </div>
                  <div className="p-3 bg-neutral-50 h-24 flex items-center justify-center">
                    {detail.adminSignature ? (
                      <img
                        src={detail.adminSignature}
                        alt="Admin гарын үсэг"
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                      />
                    ) : (
                      <span className="text-xs text-neutral-400">Байхгүй</span>
                    )}
                  </div>
                  {detail.adminTitle && (
                    <div className="px-3 py-2 text-xs text-center text-[#c00000] border-t border-[#b4c6e7]">
                      {detail.adminTitle}
                    </div>
                  )}
                </div>
                <div className="border border-[#b4c6e7] rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-[#f0f4ff] border-b border-[#b4c6e7] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1e4e8c]">
                      ГИШҮҮНИЙ ГАРЫН ҮСЭГ
                    </span>
                    {detail.memberSignature && (
                      <a
                        href={detail.memberSignature}
                        download={`signature-${member?.name || contractId}.png`}
                        className="text-xs text-[#1e4e8c] hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> PNG
                      </a>
                    )}
                  </div>
                  <div className="p-3 bg-neutral-50 h-24 flex items-center justify-center">
                    {detail.memberSignature ? (
                      <img
                        src={detail.memberSignature}
                        alt="Member гарын үсэг"
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                      />
                    ) : (
                      <span className="text-xs text-neutral-400">
                        {detail.status === "PENDING"
                          ? "Гарын үсэг зураагүй"
                          : "Байхгүй"}
                      </span>
                    )}
                  </div>
                  {member?.director && (
                    <div className="px-3 py-2 text-xs text-center text-neutral-600 border-t border-[#b4c6e7]">
                      {member.director}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submissions list — shown when viewing a template */}
            {detail.isTemplate && (
              <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                  <span className="font-semibold text-neutral-800 text-sm">
                    Бөглөсөн гишүүд
                  </span>
                  <div className="flex gap-3 text-xs">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                      {submissions.filter((s) => s.status === "SIGNED").length}{" "}
                      баталгаажсан
                    </span>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                      {submissions.filter((s) => s.status === "PENDING").length}{" "}
                      хүлээгдэж буй
                    </span>
                  </div>
                </div>
                {loadingSubs ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="py-8 text-center text-neutral-400 text-sm">
                    Одоогоор бөглөсөн хүн байхгүй байна.
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {submissions.map((s) => (
                      <div key={s.id}>
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
                          onClick={() =>
                            setExpandedSub(expandedSub === s.id ? null : s.id)
                          }
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === "SIGNED" ? "bg-green-500" : "bg-amber-400"}`}
                            />
                            <div>
                              <div className="font-medium text-neutral-800 text-sm">
                                {(s.memberData as any)?.name || "Тодорхойгүй"}
                              </div>
                              <div className="text-xs text-neutral-400">
                                {s.date}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {s.status === "SIGNED" ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                Баталгаажсан
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                Хүлээгдэж буй
                              </span>
                            )}
                            <Eye className="w-3.5 h-3.5 text-neutral-400" />
                          </div>
                        </button>
                        {expandedSub === s.id && (
                          <div className="px-4 pb-3 bg-neutral-50/50 border-t border-neutral-100">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 text-xs">
                              {(
                                [
                                  [
                                    "Байгууллагын нэр",
                                    (s.memberData as any)?.name,
                                  ],
                                  ["Регистр", (s.memberData as any)?.register],
                                  ["Утас", (s.memberData as any)?.phone],
                                  ["И-мэйл", (s.memberData as any)?.email],
                                  ["Хаяг", (s.memberData as any)?.address],
                                  [
                                    "Үйл ажиллагаа",
                                    (s.memberData as any)?.field,
                                  ],
                                ] as [string, string][]
                              )
                                .filter(([, v]) => v)
                                .map(([label, value]) => (
                                  <div key={label}>
                                    <span className="text-neutral-400">
                                      {label}:{" "}
                                    </span>
                                    <span className="font-medium text-neutral-700">
                                      {value}
                                    </span>
                                  </div>
                                ))}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => {
                                  const base =
                                    process.env.NEXT_PUBLIC_WEB_URL ||
                                    "http://localhost:3001";
                                  window.open(
                                    `${base}/contract/sign/${s.id}?print=1`,
                                    "_blank",
                                  );
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" /> PDF
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── History tab ─────────────────────────────────────────────────────────────
