"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { parseBuildingInquiry } from "@mgl/types/building-inquiry";
import { BuildingDialog } from "../management/BuildingDialog";
import "./unit-inquiry.css";

interface UnitInquiryButtonProps {
  projectId: string;
  unitId: string;
  context: string;
  preview: boolean;
}

export function UnitInquiryButton(props: UnitInquiryButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="unit-inquiry-trigger"
        onClick={() => setOpen(true)}
      >
        <Send size={16} /> Захиалгын мэдээлэл илгээх
      </button>
      {open && <UnitInquiryForm {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function UnitInquiryForm({
  projectId,
  unitId,
  context,
  preview,
  onClose,
}: UnitInquiryButtonProps & { onClose: () => void }) {
  const requestId = useRef("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || sent) return;
    setError("");
    const fields = new FormData(event.currentTarget);
    let input;
    try {
      requestId.current ||= crypto.randomUUID();
      input = parseBuildingInquiry({
        id: requestId.current,
        unitId,
        name: fields.get("name"),
        phone: fields.get("phone"),
        question: fields.get("question"),
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Мэдээллээ шалгана уу.",
      );
      return;
    }
    setPending(true);
    try {
      const response = await fetch(
        `/api/building/${preview ? "admin/" : ""}projects/${encodeURIComponent(projectId)}/inquiries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: AbortSignal.timeout(20000),
        },
      );
      const data: unknown = await response.json();
      if (!response.ok)
        throw new Error(
          data &&
            typeof data === "object" &&
            "message" in data &&
            typeof data.message === "string"
            ? data.message
            : "Хүсэлт илгээгдсэнгүй. Дахин оролдоно уу.",
        );
      setSent(true);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name !== "TimeoutError"
          ? cause.message
          : "Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <BuildingDialog
      title="Захиалгын мэдээлэл илгээх"
      subtitle={context}
      onClose={() => {
        if (!pending) onClose();
      }}
      footer={
        <button
          type="button"
          className="unit-inquiry-close"
          disabled={pending}
          onClick={onClose}
        >
          {sent ? "Хаах" : "Болих"}
        </button>
      }
    >
      {sent ? (
        <div className="unit-inquiry-success" role="status">
          <CheckCircle2 size={40} />
          <h3>Хүсэлтийг хүлээн авлаа</h3>
          <p>Борлуулалтын ажилтан таны оруулсан утасны дугаараар холбогдоно.</p>
        </div>
      ) : (
        <form className="unit-inquiry-form" onSubmit={submit}>
          <p>
            Мэдээллээ үлдээгээрэй. Бид таны сонгосон байрны талаар холбогдож
            хариулна.
          </p>
          <fieldset disabled={pending}>
            <label htmlFor="inquiry-name">
              Таны нэр
              <input
                id="inquiry-name"
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                placeholder="Нэрээ оруулна уу"
              />
            </label>
            <label htmlFor="inquiry-phone">
              Утасны дугаар
              <input
                id="inquiry-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                maxLength={20}
                placeholder="Жишээ: 99112233"
              />
            </label>
            <label htmlFor="inquiry-question">
              Асуулт, нэмэлт мэдээлэл (заавал биш)
              <textarea
                id="inquiry-question"
                name="question"
                rows={4}
                maxLength={2000}
                placeholder="Төлбөрийн нөхцөл, байр үзэх цаг зэрэг асуултаа бичээрэй"
              />
            </label>
          </fieldset>
          {error && (
            <p className="unit-inquiry-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="unit-inquiry-submit"
            type="submit"
            disabled={pending}
          >
            {pending ? (
              <LoaderCircle className="unit-inquiry-spinner" size={17} />
            ) : (
              <Send size={17} />
            )}
            {pending ? "Илгээж байна…" : "Мэдээлэл илгээх"}
          </button>
        </form>
      )}
    </BuildingDialog>
  );
}
