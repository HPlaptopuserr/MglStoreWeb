"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  getMglClubCurrentYear,
  MGL_CLUB_LOCATIONS,
  MGL_CLUB_SECTORS,
  mglClubFields,
  parseMglClubProfile,
  type MglClubField,
  type MglClubMember,
  type MglClubProfile,
} from "@mgl/types";
import { API, authFetch } from "@/lib/api";
import { ClubLogoField } from "./ClubLogoField";
import { CompanyLogo } from "./CompanyLogo";
import {
  companyProfileChanged,
  editableCompanyProfile,
} from "./company-admin-state";
import styles from "./company-admin.module.css";

interface ProfileState {
  member: MglClubMember;
  version: number;
}
interface Props {
  company: MglClubMember;
  onSaved: (member: MglClubMember) => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}
const groups: {
  title: string;
  help: string;
  fields: readonly MglClubField[];
}[] = [
  {
    title: "Байгууллагын мэдээлэл",
    help: "Гишүүдийн жагсаалтад харагдах үндсэн мэдээлэл.",
    fields: [
      "businessName",
      "sector",
      "city",
      "description",
      "offers",
      "needs",
    ],
  },
  {
    title: "Холбоо барих",
    help: "Харилцагч тантай холбогдоход ашиглах мэдээлэл.",
    fields: [
      "name",
      "role",
      "phone",
      "website",
      "address",
      "workingHours",
      "serviceArea",
    ],
  },
  {
    title: "Нэмэлт мэдээлэл",
    help: "Мэдээлэл байхгүй бол эдгээр талбарыг хоосон үлдээж болно.",
    fields: ["foundedYear", "teamSize"],
  },
];
const labels: Partial<Record<MglClubField, string>> = {
  name: "Холбоо барих хүний нэр",
  offers: "Бүтээгдэхүүн, үйлчилгээний товч тайлбар",
  needs: "Хайж буй хамтрагч, бараа, үйлчилгээ",
  website: "Вэб сайт эсвэл Facebook хуудас",
};
function numericFieldError(id: MglClubField, value: string): string {
  if (!value) return "";
  if (
    id === "foundedYear" &&
    (!/^\d{4}$/.test(value) ||
      Number(value) < 1900 ||
      Number(value) > getMglClubCurrentYear())
  )
    return `Үйл ажиллагаа эхэлсэн оныг 1900–${getMglClubCurrentYear()} хооронд бичнэ үү.`;
  if (
    id === "teamSize" &&
    (!/^[1-9]\d{0,5}$/.test(value) || Number(value) > 100000)
  )
    return "Ажилтны тоог 1–100000 хооронд бүхэл тоогоор бичнэ үү.";
  return "";
}
function responseMessage(status: number, fallback: string) {
  if (status === 401)
    return "Нэвтрэх хугацаа дууссан байна. Миний клуб хэсгээс дахин нэвтэрнэ үү.";
  if (status === 403) return "Энэ мэдээллийг зөвхөн систем админ засна.";
  return fallback;
}
export function CompanyProfileEditor({
  company,
  onSaved,
  onDirtyChange,
  onBusyChange,
}: Props) {
  const [current, setCurrent] = useState<ProfileState | null>(null);
  const [draft, setDraft] = useState<MglClubProfile>(() =>
    editableCompanyProfile(company),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const [retry, setRetry] = useState(0);
  const dirty =
    !!current &&
    companyProfileChanged(draft, editableCompanyProfile(current.member));
  const busy = saving || logoBusy;
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      setConflict(false);
      setNotice("");
      try {
        const response = await authFetch(
          `${API}/forms/mgl-club/my-companies/${company.id}/profile`,
          { signal: controller.signal },
        );
        const data: ProfileState & { message?: string } = await response.json();
        if (!response.ok)
          throw new Error(
            responseMessage(
              response.status,
              data.message || "Мэдээллийг ачаалж чадсангүй.",
            ),
          );
        if (controller.signal.aborted) return;
        setCurrent(data);
        setDraft(editableCompanyProfile(data.member));
      } catch (cause: unknown) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Мэдээллийг ачаалж чадсангүй.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [company.id, retry]);
  function update(field: MglClubField, value: string) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setNotice("");
  }
  function resetDraft() {
    if (busy || !current) return;
    if (dirty && !window.confirm("Хадгалаагүй өөрчлөлтөө буцаах уу?")) return;
    setDraft(editableCompanyProfile(current.member));
    setError("");
    setNotice("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current || busy || !dirty) return;
    const profile = parseMglClubProfile(draft);
    if (!profile) {
      setError(
        "Заавал бөглөх мэдээлэл, 8 оронтой утас болон холбоосоо шалгана уу.",
      );
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    setConflict(false);
    try {
      const response = await authFetch(
        `${API}/forms/mgl-club/my-companies/${company.id}/profile`,
        {
          method: "PATCH",
          body: JSON.stringify({ data: profile, version: current.version }),
        },
      );
      const result: ProfileState & { message?: string } = await response.json();
      if (!response.ok) {
        if (response.status === 409) setConflict(true);
        throw new Error(
          responseMessage(
            response.status,
            response.status === 409
              ? "Мэдээллийг өөр цонхноос шинэчилсэн байна. Таны бичсэн өөрчлөлт хадгалагдаагүй, энэ цонхонд хэвээр байна."
              : result.message ||
                  "Хадгалж чадсангүй. Таны бичсэн мэдээлэл хэвээр байна.",
          ),
        );
      }
      setCurrent(result);
      setDraft(editableCompanyProfile(result.member));
      onSaved(result.member);
      setNotice(
        "Байгууллагын мэдээллийг хадгалж, нийтийн жагсаалтад шинэчиллээ.",
      );
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Холболтын алдаа гарлаа. Дахин оролдоно уу.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <div className={styles.panel} role="status">
        Байгууллагын мэдээллийг ачаалж байна…
      </div>
    );
  if (!current)
    return (
      <div className={styles.panel}>
        <p role="alert">{error}</p>
        <button type="button" onClick={() => setRetry((value) => value + 1)}>
          Дахин ачаалах
        </button>
      </div>
    );
  return (
    <div className={styles.profileLayout}>
      <form className={styles.profileForm} onSubmit={save} aria-busy={busy}>
        <div className={styles.panelIntro}>
          <h2>Үндсэн мэдээлэл</h2>
          <p>
            Хадгалсан мэдээлэл гишүүдийн жагсаалт болон холбоо барих хэсэгт
            нийтэд шууд харагдана.
          </p>
        </div>
        <fieldset disabled={saving} className={styles.logoFieldset}>
          <legend>Лого</legend>
          <ClubLogoField
            id="admin-company-logo"
            value={draft.logoUrl || ""}
            required={false}
            disabled={saving}
            onBusy={setLogoBusy}
            onChange={(url) => {
              setDraft((previous) => ({ ...previous, logoUrl: url }));
              setNotice("");
            }}
          />
        </fieldset>
        {groups.map((group) => (
          <fieldset
            key={group.title}
            disabled={busy}
            className={styles.fieldGroup}
          >
            <legend>{group.title}</legend>
            <p>{group.help}</p>
            <div className={styles.fields}>
              {group.fields.map((id) => {
                const field = mglClubFields.find((item) => item.id === id);
                if (!field) return null;
                const multiline = [
                  "description",
                  "offers",
                  "needs",
                  "address",
                ].includes(id);
                const controlId = `company-profile-${id}`;
                const helpId = `${controlId}-help`;
                const help =
                  id === "offers"
                    ? "Жагсаалт дээр цэгцтэй харагдуулахын тулд 1–2 өгүүлбэр бичээрэй. Дэлгэрэнгүй зураг, тайлбарыг вэб танилцуулгад оруулна."
                    : id === "website"
                      ? "https://-ээр эхэлсэн бүтэн холбоос оруулна. Жишээ: https://example.mn"
                      : id === "phone"
                        ? "Зөвхөн 8 оронтой утасны дугаар."
                        : id === "foundedYear"
                          ? `1900–${getMglClubCurrentYear()} оны хооронд. Мэдэхгүй бол хоосон үлдээнэ.`
                          : id === "teamSize"
                            ? "1–100000 хооронд бүхэл тоо. Мэдээлэл байхгүй бол хоосон үлдээнэ."
                            : "";
                return (
                  <label
                    key={id}
                    htmlFor={controlId}
                    className={multiline ? styles.fullWidth : undefined}
                  >
                    <span>
                      {labels[id] || field.label}
                      {field.required && <span aria-hidden="true"> *</span>}
                    </span>
                    {id === "sector" || id === "city" ? (
                      <select
                        id={controlId}
                        value={draft[id]}
                        required={field.required}
                        onChange={(event) => update(id, event.target.value)}
                      >
                        {(id === "sector"
                          ? MGL_CLUB_SECTORS
                          : MGL_CLUB_LOCATIONS
                        ).map((value) => (
                          <option value={value} key={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    ) : multiline ? (
                      <textarea
                        id={controlId}
                        rows={id === "description" ? 4 : 3}
                        value={draft[id]}
                        required={field.required}
                        maxLength={field.maxLength}
                        onChange={(event) => update(id, event.target.value)}
                        aria-describedby={help ? helpId : undefined}
                      />
                    ) : (
                      <input
                        id={controlId}
                        value={draft[id]}
                        required={field.required}
                        maxLength={field.maxLength}
                        type={
                          id === "phone"
                            ? "tel"
                            : id === "website"
                              ? "url"
                              : id === "foundedYear" || id === "teamSize"
                                ? "number"
                                : "text"
                        }
                        min={
                          id === "foundedYear"
                            ? 1900
                            : id === "teamSize"
                              ? 1
                              : undefined
                        }
                        max={
                          id === "foundedYear"
                            ? getMglClubCurrentYear()
                            : id === "teamSize"
                              ? 100000
                              : undefined
                        }
                        step={
                          id === "foundedYear" || id === "teamSize"
                            ? 1
                            : undefined
                        }
                        inputMode={
                          ["phone", "teamSize", "foundedYear"].includes(id)
                            ? "numeric"
                            : undefined
                        }
                        pattern={
                          id === "phone"
                            ? "[0-9]{8}"
                            : id === "foundedYear"
                              ? "[0-9]{4}"
                              : id === "teamSize"
                                ? "[1-9][0-9]{0,5}"
                                : undefined
                        }
                        placeholder={
                          id === "website"
                            ? "https://"
                            : id === "foundedYear"
                              ? String(getMglClubCurrentYear())
                              : undefined
                        }
                        onChange={(event) => {
                          event.currentTarget.setCustomValidity(
                            numericFieldError(id, event.currentTarget.value),
                          );
                          update(id, event.target.value);
                        }}
                        aria-describedby={help ? helpId : undefined}
                      />
                    )}
                    {help && <small id={helpId}>{help}</small>}
                    {multiline && (
                      <small className={styles.counter}>
                        {draft[id].length} / {field.maxLength}
                      </small>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
        {error && (
          <div className={styles.error} role="alert">
            <p>{error}</p>
            {conflict && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Энэ цонхны хадгалаагүй засварыг орхиод сүүлийн мэдээллийг ачаалах уу?",
                    )
                  ) {
                    setRetry((value) => value + 1);
                  }
                }}
              >
                Сүүлийн хувилбарыг ачаалах
              </button>
            )}
          </div>
        )}
        {notice && (
          <p className={styles.success} role="status">
            {notice}
          </p>
        )}
        <div className={styles.saveBar}>
          <span role="status">
            {logoBusy
              ? "Лого оруулж байна…"
              : dirty
                ? "Хадгалаагүй өөрчлөлт байна"
                : "Мэдээлэл хадгалагдсан"}
          </span>
          <div>
            <button
              type="button"
              disabled={busy || !dirty}
              onClick={resetDraft}
            >
              Өөрчлөлт буцаах
            </button>
            <button
              className={styles.primary}
              type="submit"
              disabled={busy || !dirty}
            >
              {saving ? "Хадгалж байна…" : "Мэдээлэл хадгалах"}
            </button>
          </div>
        </div>
      </form>
      <aside className={styles.preview} aria-label="Гишүүдийн жагсаалтын жишээ">
        <span className={styles.eyebrow}>Жагсаалтад ингэж харагдана</span>
        <div className={styles.previewLogo}>
          <CompanyLogo
            name={draft.businessName || "Байгууллага"}
            url={draft.logoUrl}
          />
        </div>
        <h3>{draft.businessName || "Байгууллагын нэр"}</h3>
        <span>
          {draft.sector} · {draft.city}
        </span>
        <p>{draft.offers || "Үйлчилгээний товч тайлбар"}</p>
        <strong>{draft.phone || "Утасны дугаар"}</strong>
        <small>
          Дээрх жишээ нь бичиж буй мэдээллийг харуулна. Хадгалсны дараа нийтэд
          шинэчлэгдэнэ.
        </small>
      </aside>
    </div>
  );
}
