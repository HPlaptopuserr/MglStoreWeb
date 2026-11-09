"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, Check, LoaderCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { API } from "@/lib/api";
import { BusinessChoice } from "./BusinessChoice";
import { CommunityPhotoField } from "./CommunityPhotoField";
import styles from "../registration.module.css";
import { RegistrationField } from "./RegistrationField";

export function RegistrationForm({
  initialData = {},
  editing,
  onSaved,
}: {
  initialData?: Record<string, string>;
  editing?: { id: string; token: string };
  onSaved?: (data: Record<string, string>) => void;
}) {
  const { authFetch } = useAuth();
  const [values, setValues] = useState(initialData);
  const [photoUrl, setPhotoUrl] = useState(initialData.photoUrl || "");
  const [photoPending, setPhotoPending] = useState(false);
  const [business, setBusiness] = useState(initialData.business || "");
  const [pending, setPending] = useState(false);
  const [published, setPublished] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || photoPending) return;
    const data: Record<string, string> = {};
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string") data[key] = value;
    }
    setPending(true);
    setError("");
    try {
      const response = await (editing ? fetch : authFetch)(
        editing
          ? `${API}/forms/2003/edit/${editing.id}`
          : `${API}/forms/2003/responses`,
        {
          method: editing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...(editing ? { Authorization: `Bearer ${editing.token}` } : {}),
          },
          body: JSON.stringify({ data }),
          signal: AbortSignal.timeout(20000),
        },
      );
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Засах эрх дууссан. Профайл руу буцаж танилцуулгаа дахин нээнэ үү."
            : response.status === 410
              ? "Бүртгэл хаагдсан байна."
              : response.status === 429
                ? "Түр хүлээгээд дахин оролдоно уу."
                : "Илгээхэд алдаа гарлаа. Мэдээллээ шалгаад дахин оролдоно уу.",
        );
      setValues(data);
      onSaved?.(data);
      setPublished(data.publishConsent === "yes");
      setSubmitted(true);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name === "Error"
          ? cause.message
          : "Холболт тасарлаа. Интернэтээ шалгаад дахин оролдоно уу.",
      );
    } finally {
      setPending(false);
    }
  }

  if (submitted)
    return (
      <section role="status" className={`${styles.form} ${styles.success}`}>
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Check size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          {editing ? "Өөрчлөлт хадгалагдлаа!" : "Бүртгэл амжилттай!"}
        </h2>
        <p className="mt-3 leading-7 text-slate-500">
          Мэдээллээ хуваалцсанд баярлалаа.
          <br />
          {published
            ? "Таны танилцуулга хүрээллийн нүүр хуудсанд нийтлэгдлээ."
            : "Таны хариултыг хүлээн авлаа. Нийтлэх зөвшөөрөл өгөөгүй тул нүүр хуудсанд харагдахгүй."}
        </p>
        {editing && (
          <button
            type="button"
            className={styles.submit}
            onClick={() => setSubmitted(false)}
          >
            Үргэлжлүүлэн засах
          </button>
        )}
        {!editing && (
          <Link
            href="/2003/edit"
            className="mt-6 block font-semibold text-blue-800 hover:underline"
          >
            Мэдээллээ засах
          </Link>
        )}
        <Link
          href="/2003"
          className="mt-8 inline-flex items-center gap-2 font-semibold text-blue-800 hover:underline"
        >
          Хүрээлэл рүү буцах <ArrowRight size={18} />
        </Link>
      </section>
    );

  return (
    <form onSubmit={submit} id="registration" className={styles.form}>
      <fieldset disabled={pending || photoPending} className="space-y-8">
        <div className={styles.formHeading}>
          <p className={styles.formEyebrow}>
            <span /> ТАНЫ ТАНИЛЦУУЛГА{" "}
            <span className={styles.formNumber}>/ 2003</span>
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Сайн байна уу 👋
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Таныг илүү сайн таних хэдхэн асуулт.
          </p>
        </div>
        <CommunityPhotoField
          value={photoUrl}
          onChange={setPhotoUrl}
          onBusy={setPhotoPending}
        />
        <div className={styles.sectionTitle}>
          <span>01</span>
          <h3>Хувийн мэдээлэл</h3>
          <small>* Заавал бөглөнө</small>
        </div>
        <div className={styles.fields}>
          <RegistrationField
            name="name"
            defaultValue={values.name || ""}
            label="Овог, нэр"
            placeholder="Таны овог, нэр"
            autoComplete="name"
            required
          />
          <RegistrationField
            name="profession"
            defaultValue={values.profession || ""}
            label="Мэргэжил"
            placeholder="Жишээ: Инженер"
            required
          />
          <RegistrationField
            name="city"
            defaultValue={values.city || ""}
            label="Хот, байршил"
            placeholder="Жишээ: Улаанбаатар"
          />
          <RegistrationField
            name="phone"
            defaultValue={values.phone || ""}
            label="Утасны дугаар"
            placeholder="8 оронтой дугаар"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            pattern="[0-9]{8}"
            title="8 оронтой утасны дугаар оруулна уу"
            required
          />
        </div>
        <fieldset className="border-t border-slate-100 pt-6">
          <legend className="sr-only">Бизнесийн мэдээлэл</legend>
          <div className={styles.sectionTitle}>
            <span>02</span>
            <h3>Ажил & бизнес</h3>
          </div>
          <p
            id="business-label"
            className="mt-5 text-sm font-medium text-slate-700"
          >
            Та бизнес эрхэлдэг үү? <span className="text-orange-600">*</span>
          </p>
          <BusinessChoice value={business} onChange={setBusiness} />
          {business === "yes" && (
            <div className="mt-5 grid gap-5 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2">
              <RegistrationField
                name="businessName"
                defaultValue={values.businessName || ""}
                label="Бизнес / байгууллагын нэр"
                placeholder="Бизнесийн нэр"
                autoComplete="organization"
              />
              <RegistrationField
                name="industry"
                defaultValue={values.industry || ""}
                label="Үйл ажиллагааны чиглэл"
                placeholder="Жишээ: Худалдаа, барилга, IT"
                required
              />
            </div>
          )}
        </fieldset>
        <label
          className="block text-sm font-medium text-slate-700"
          htmlFor="notes"
        >
          Нэмэлт мэдээлэл{" "}
          <span className="font-normal text-slate-400">(заавал биш)</span>
          <textarea
            id="notes"
            defaultValue={values.notes || ""}
            name="notes"
            rows={3}
            maxLength={1000}
            placeholder="Өөрийн тухай, хамтран ажиллах сонирхлоо хуваалцаарай…"
            className="mt-2 block w-full resize-y rounded-xl border border-slate-200 p-4 text-base outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          />
        </label>
        <label className={styles.consent}>
          <input
            type="checkbox"
            defaultChecked={values.consent === "yes"}
            name="consent"
            value="yes"
            required
            className="mt-1 size-4 shrink-0 accent-orange-600"
          />
          Миний өгсөн мэдээллийг энэхүү бүртгэл болон надтай холбоо барих
          зорилгоор ашиглахыг зөвшөөрч байна.
        </label>
        <label className={styles.consent}>
          <input
            type="checkbox"
            defaultChecked={values.publishConsent === "yes"}
            name="publishConsent"
            value="yes"
            className="mt-1 size-4 shrink-0 accent-orange-600"
          />
          Миний нэр, зураг, утасны дугаар, мэргэжил, байршил, бизнес болон
          нэмэлт мэдээллийг 2003 хүрээллийн нүүр хуудсанд нийтэд харуулахыг
          зөвшөөрч байна.
        </label>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <button disabled={pending} type="submit" className={styles.submit}>
          {pending ? (
            <>
              <LoaderCircle className="motion-safe:animate-spin" size={20} />
              Илгээж байна…
            </>
          ) : (
            <>
              {editing ? "Өөрчлөлт хадгалах" : "Бүртгэл илгээх"}{" "}
              <ArrowRight size={20} />
            </>
          )}
        </button>
        <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={16} />
          Зөвхөн нийтлэх зөвшөөрөлтэй танилцуулга нүүр хуудсанд харагдана.
        </p>
      </fieldset>
    </form>
  );
}
