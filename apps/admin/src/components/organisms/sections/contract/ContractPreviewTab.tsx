"use client";

import React, { useRef, useState } from "react";
import { CheckCircle2, Eraser, Loader2, PenTool } from "lucide-react";
import type { ContractSettings } from "./contract.types";

export function ContractPreviewTab({
  settings,
}: {
  settings: ContractSettings;
}) {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [memberData, setMemberData] = useState<Record<string, string>>({});
  const [memberSignature, setMemberSignature] = useState("");
  const [memberHasSignature, setMemberHasSignature] = useState(false);
  const memberSigRef = useRef<HTMLCanvasElement>(null);
  const memberSigDrawing = useRef(false);

  const memberSigGetPos = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = memberSigRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
  };

  const memberSigInitCtx = () => {
    const ctx = memberSigRef.current?.getContext("2d");
    if (ctx) {
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1e4e8c";
    }
    return ctx;
  };

  const memberSigStart = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    e.preventDefault();
    const ctx = memberSigInitCtx();
    if (!ctx) return;
    const { x, y } = memberSigGetPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    memberSigDrawing.current = true;
  };

  const memberSigMove = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    e.preventDefault();
    if (!memberSigDrawing.current) return;
    const ctx = memberSigRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = memberSigGetPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setMemberHasSignature(true);
  };

  const memberSigEnd = () => {
    memberSigDrawing.current = false;
    if (memberSigRef.current) {
      setMemberSignature(memberSigRef.current.toDataURL("image/png"));
    }
  };

  const memberSigClear = () => {
    const canvas = memberSigRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setMemberHasSignature(false);
    setMemberSignature("");
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-2xl shadow-sm border border-neutral-100">
        <CheckCircle2 className="w-20 h-20 text-green-500" />
        <h2 className="text-2xl font-semibold text-neutral-800">
          Гэрээ амжилттай баталгаажлаа
        </h2>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-4 px-6 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 font-medium"
        >
          Буцах
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden w-full max-w-4xl mx-auto">
      <div className="p-8 md:p-12 text-sm leading-relaxed text-black font-serif border-b border-neutral-200">
        <div className="text-center font-bold text-lg mb-1 leading-snug text-[#1e4e8c]">
          {settings.headerTitle ? (
            <>
              {settings.headerTitle}
              <br />
              {settings.headerSubtitle && (
                <span className="font-normal text-sm italic text-neutral-600">
                  {settings.headerSubtitle}
                </span>
              )}
            </>
          ) : (
            <>
              МОНГОЛ ЭЗЭНТЭЙ ЖИЖИГ ДУНД БИЗНЕС
              <br />
              ЭРХЛЭГЧДИЙН НЭГДСЭН ХОЛБОО
              <br />
              <span className="font-normal text-sm italic text-neutral-600">
                Mongolian SME United Association
              </span>
            </>
          )}
        </div>
        <div className="border-b-2 border-[#1e4e8c] my-4"></div>
        <div className="text-center font-bold text-[#1e4e8c] mb-4 text-base">
          {settings.headerContractTitle ||
            "УДИРДАХ ЗӨВЛӨЛИЙН ГИШҮҮНЧЛЭЛИЙН ГЭРЭЭ"}
        </div>
        {settings.contentIsHtml ? (
          <div
            className="mt-6 contract-html-content
              [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-neutral-300 [&_td]:p-2 [&_th]:border [&_th]:border-neutral-300 [&_th]:p-2 [&_th]:bg-neutral-100"
            dangerouslySetInnerHTML={{ __html: settings.content }}
          />
        ) : (
          <div className="whitespace-pre-wrap mt-6">{settings.content}</div>
        )}

        <div className="mt-8 overflow-hidden">
          <table className="w-full border-collapse border border-[#b4c6e7] text-sm">
            <thead>
              <tr>
                <th className="border border-[#b4c6e7] bg-[#f8f9fc] p-4 text-center w-1/2">
                  <div className="text-[#1e4e8c] font-bold text-base mb-1">
                    ХОЛБОО
                  </div>
                  <div className="text-[#c00000] font-normal">
                    {settings.orgName || "Байгууллагын нэр"}
                  </div>
                </th>
                <th className="border border-[#b4c6e7] bg-[#f8f9fc] p-4 text-center w-1/2">
                  <div className="text-[#1e4e8c] font-bold text-base mb-1">
                    ГИШҮҮН
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-[#b4c6e7] p-4 bg-[#f8f9fc] align-top">
                  <div className="border-b-2 border-[#1e4e8c] h-16 mb-1 flex items-end justify-center">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/4/41/Signature_of_John_Hancock.svg"
                      alt=""
                      className="h-12 opacity-40 mix-blend-multiply"
                    />
                  </div>
                  <div className="text-xs text-[#c00000] mb-1">
                    Гарын үсэг / Албан тушаал
                  </div>
                  <div className="border-b-2 border-[#1e4e8c] h-8 mt-3 mb-1 flex items-end justify-center">
                    <span className="text-sm font-medium">
                      {settings.presidentName || "Овог нэр"}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 mb-1">Овог нэр</div>
                  <div className="border-b-2 border-[#1e4e8c] h-8 mt-3 mb-1 flex items-end justify-center">
                    <span className="text-sm font-medium text-[#c00000]">
                      {settings.presidentTitle || "Албан тушаал"}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500">Албан тушаал</div>
                </td>
                <td className="border border-[#b4c6e7] p-4 bg-[#f8f9fc] align-top">
                  <div className="flex flex-col gap-3">
                    {settings.memberFields &&
                      settings.memberFields
                        .filter((f: any) => f.enabled)
                        .map((field: any) => (
                          <div key={field.key} className="flex flex-col">
                            <label className="text-xs text-neutral-600 mb-1.5 font-medium">
                              {field.label}
                              {field.required && (
                                <span className="text-red-500 ml-0.5">*</span>
                              )}
                            </label>
                            <input
                              type="text"
                              placeholder={`${field.label}ыг оруулна уу`}
                              value={memberData[field.key] || ""}
                              onChange={(e) =>
                                setMemberData((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                              className="border-b-2 border-[#1e4e8c] px-1 py-1.5 text-sm bg-transparent focus:outline-none focus:bg-blue-50/20 rounded-sm transition-colors"
                            />
                          </div>
                        ))}
                    <div className="flex flex-col mt-2">
                      <label className="text-xs text-[#c00000] font-medium mb-1.5">
                        Гарын үсэг
                      </label>
                      <div
                        className="border-2 border-dashed border-[#1e4e8c]/40 rounded-lg bg-blue-50/20 relative"
                        style={{ height: 80 }}
                      >
                        <canvas
                          ref={memberSigRef}
                          width={400}
                          height={80}
                          className="absolute inset-0 w-full h-full touch-none"
                          style={{ cursor: "crosshair" }}
                          onMouseDown={memberSigStart}
                          onMouseMove={memberSigMove}
                          onMouseUp={memberSigEnd}
                          onMouseLeave={memberSigEnd}
                          onTouchStart={memberSigStart}
                          onTouchMove={memberSigMove}
                          onTouchEnd={memberSigEnd}
                        />
                        {!memberHasSignature && (
                          <div className="absolute inset-0 flex items-center justify-center gap-2 text-blue-300/70 pointer-events-none text-xs">
                            <PenTool className="w-4 h-4" /> Гарын үсэг зурна уу
                          </div>
                        )}
                        {memberHasSignature && (
                          <button
                            type="button"
                            onClick={memberSigClear}
                            className="absolute top-1 right-1 px-2 py-0.5 bg-white border border-neutral-200 rounded text-xs text-neutral-400 hover:text-red-500 z-10"
                          >
                            <Eraser className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="border-b-2 border-[#1e4e8c] h-8 mt-3 mb-1"></div>
                    <div className="text-xs text-neutral-500 mb-1">
                      Овог нэр
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-6 bg-neutral-50 flex flex-col md:flex-row items-center justify-between gap-6">
        <label className="flex items-start gap-3 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-5 h-5 mt-0.5 text-blue-600 rounded border-gray-300"
          />
          <span className="text-sm text-neutral-600">
            Би дээрх гэрээний нөхцөлүүдийг уншиж танилцсан бөгөөд бүрэн хүлээн
            зөвшөөрч байна.
          </span>
        </label>
        <button
          disabled={!agreed || submitting || !memberSignature}
          title={
            !memberSignature ? "Гарын үсэг зураагүйгээр хадгалах боломжгүй" : ""
          }
          onClick={() => {
            setSubmitting(true);
            setTimeout(() => {
              setSubmitting(false);
              setSubmitted(true);
            }, 1500);
          }}
          className="w-full md:w-auto px-8 py-3.5 bg-[#1e4e8c] text-white rounded-xl font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Боловсруулж байна...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" /> Гэрээг баталгаажуулах
            </>
          )}
        </button>
      </div>
    </div>
  );
}
