"use client";
import { ClubGoldPayment } from "./ClubGoldPayment";
import { CompanySiteUrlField } from "./CompanySiteUrlField";
import Link from "next/link";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2, Eye, Save } from "lucide-react";
import {
  CLUB_SECTION_TYPES,
  createClubSection,
  parseClubWebsite,
  type ClubSectionType,
  type ClubWebsite,
  type ClubWebsiteAccess,
  type ClubWebsiteSection,
  type MglClubMember,
} from "@mgl/types";
import { API, authFetch } from "@/lib/api";
import type { ClubWebsiteState } from "./CompanySiteBuilder";
import { CompanyWebsite } from "./CompanyWebsite";
import { WebsiteImageField } from "./WebsiteImageField";
import {
  companyWebsiteTemplates,
  makeCompanyWebsiteTemplate,
  type CompanyWebsiteTemplateId,
} from "./company-website-templates";
import { WebsiteAccessSummary } from "./CompanyWebsiteAccessPanel";
import { demoSiteKey } from "./website-template";
import styles from "./site-builder.module.css";
const labels: Record<ClubSectionType, string> = {
  hero: "Нүүр зураг, уриа",
  split: "Зураг + танилцуулга",
  services: "Бүтээгдэхүүн, үйлчилгээ",
  stats: "Тоон үзүүлэлт",
  gallery: "Зургийн цомог",
  news: "Мэдээ, нийтлэл",
  contact: "Холбоо барих",
};
export function CompanySiteEditor({
  member,
  initial,
  demo,
}: {
  member: MglClubMember;
  initial: ClubWebsiteState;
  demo: boolean;
}) {
  const [site, setSite] = useState<ClubWebsite>(initial.draft),
    [version, setVersion] = useState(initial.version),
    [saved, setSaved] = useState(JSON.stringify(initial.draft));
  const [selected, setSelected] = useState(initial.draft.sections[0].id),
    [preview, setPreview] = useState(false),
    [pending, setPending] = useState(false),
    [uploads, setUploads] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [access, setAccess] = useState<ClubWebsiteAccess | null>(
    initial.access || null,
  );
  const [accessChecking, setAccessChecking] = useState(false);
  const refreshAccess = useCallback(async () => {
    setAccessChecking(true);
    try {
      const response = await authFetch(
        `${API}/forms/mgl-club/my-companies/${member.id}/website-access`,
      );
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Систем админ эрхээр дахин нэвтэрнэ үү."
            : "Алтан гишүүнчлэлийн эрхийг шалгаж чадсангүй.",
        );
      const result: ClubWebsiteAccess = await response.json();
      setAccess(result);
      setError("");
    } catch (cause: unknown) {
      setAccess(null);
      setError(
        cause instanceof Error ? cause.message : "Холболтын алдаа гарлаа.",
      );
    } finally {
      setAccessChecking(false);
    }
  }, [member.id]);
  useEffect(() => {
    if (!initial.access) void refreshAccess();
  }, [initial.access, refreshAccess]);
  const eligible = access?.eligible === true;
  useEffect(() => {
    if (!access?.eligible || !access.expiresAt) return;
    const expires = new Date(access.expiresAt).getTime();
    const expire = () =>
      setAccess((previous) =>
        previous
          ? {
              ...previous,
              eligible: false,
              status: "expired",
              message:
                "Алтан гишүүнчлэлийн хугацаа дууссан байна. Дахин идэвхжүүлсний дараа засвараа хадгална уу.",
            }
          : previous,
      );
    if (!Number.isFinite(expires)) {
      expire();
      return;
    }
    let timer: number | undefined;
    function checkExpiry() {
      const delay = expires - Date.now();
      if (delay <= 0) expire();
      else
        timer = window.setTimeout(checkExpiry, Math.min(delay, 2_147_483_647));
    }
    checkExpiry();
    return () => window.clearTimeout(timer);
  }, [access]);
  const active =
    site.sections.find((s) => s.id === selected) || site.sections[0];
  const dirty = JSON.stringify(site) !== saved;
  const busy = pending || uploads > 0;
  const editingDisabled = busy || accessChecking || !eligible;
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);
  function guardReturn(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    if (
      busy ||
      (dirty &&
        !window.confirm("Хадгалаагүй танилцуулгын засвараа орхиод буцах уу?"))
    )
      event.preventDefault();
  }
  function update(id: string, patch: Partial<ClubWebsiteSection>) {
    setSite((previous) => ({
      ...previous,
      sections: previous.sections.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    }));
    setNotice("");
  }
  function add(type: ClubSectionType) {
    const section = createClubSection(type, `section-${crypto.randomUUID()}`);
    setSite((previous) => ({
      ...previous,
      sections: [...previous.sections, section],
    }));
    setSelected(section.id);
    setNotice("");
  }
  function move(id: string, delta: number) {
    setSite((previous) => {
      const sections = [...previous.sections],
        index = sections.findIndex((s) => s.id === id),
        next = index + delta;
      if (index < 1 || next < 1 || next >= sections.length) return previous;
      [sections[index], sections[next]] = [sections[next], sections[index]];
      return { ...previous, sections };
    });
  }
  async function saveDraft(): Promise<ClubWebsiteState | null> {
    if (!eligible || accessChecking)
      throw new Error(
        "Танилцуулга хадгалахын тулд хүчинтэй Алтан гишүүнчлэл шаардлагатай.",
      );
    const valid = parseClubWebsite(site);
    if (!valid) {
      setError(
        "Хэсгүүдийн гарчиг, зураг болон бичвэрээ шалгана уу. Нэг нүүр хэсэгтэй, нийт 12 хүртэл хэсэг бэлдэж болно.",
      );
      return null;
    }
    if (demo) {
      localStorage.setItem(
        demoSiteKey(member.id, "draft"),
        JSON.stringify(valid),
      );
      setSite(valid);
      setSaved(JSON.stringify(valid));
      return { draft: valid, published: null, version: 0 };
    }
    const response = await authFetch(
      `${API}/forms/mgl-club/my-companies/${member.id}/website`,
      { method: "PUT", body: JSON.stringify({ site: valid, version }) },
    );
    const data: ClubWebsiteState & { message?: string } = await response
      .json()
      .catch(() => ({}));
    if (!response.ok) {
      if (data.access) setAccess(data.access);
      throw new Error(data.message || "Ноорог хадгалж чадсангүй.");
    }
    setVersion(data.version);
    setSite(data.draft);
    setSaved(JSON.stringify(data.draft));
    return data;
  }
  async function save(publish: boolean) {
    if (editingDisabled) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const result = await saveDraft();
      if (!result) return;
      if (publish) {
        if (demo) {
          localStorage.setItem(
            demoSiteKey(member.id, "published"),
            JSON.stringify(result.draft),
          );
          window.dispatchEvent(new Event("company-site-preview"));
        } else {
          const response = await authFetch(
            `${API}/forms/mgl-club/my-companies/${member.id}/website/publish`,
            {
              method: "POST",
              body: JSON.stringify({ version: result.version }),
            },
          );
          const data: ClubWebsiteState & { message?: string } = await response
            .json()
            .catch(() => ({}));
          if (!response.ok) {
            if (data.access) setAccess(data.access);
            throw new Error(data.message || "Нийтэлж чадсангүй.");
          }
          setVersion(data.version);
        }
      }
      setNotice(
        publish
          ? demo
            ? "Туршилтын хувилбарыг энэ хөтөчид нийтэллээ."
            : "Байгууллагын танилцуулгыг нийтэллээ."
          : "Нооргийг хадгаллаа. Нийтэд харагдах хувилбар өөрчлөгдөөгүй.",
      );
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Хадгалж чадсангүй.");
    } finally {
      setPending(false);
    }
  }
  function chooseTemplate(id: CompanyWebsiteTemplateId) {
    if (editingDisabled) return;
    if (
      !window.confirm(
        "Одоогийн танилцуулгын хэсгүүдийг шинэ загвараар солих уу? Зураг, бичвэртэй одоогийн ноорог солигдоно. Хадгалах эсвэл нийтлэх хүртэл нийтийн хуудас өөрчлөгдөхгүй.",
      )
    )
      return;
    const next = makeCompanyWebsiteTemplate(id, member);
    next.theme = site.theme;
    setSite(next);
    setSelected(next.sections[0].id);
    setPreview(false);
    setNotice("");
    setError("");
  }
  const mediaBusy = (uploading: boolean) =>
    setUploads((n) => Math.max(0, n + (uploading ? 1 : -1)));
  return (
    <div className={styles.builder}>
      <div className={styles.toolbar}>
        <div>
          <Link href="/mgl-club/manage" onClick={guardReturn}>
            ← Миний байгууллагууд
          </Link>
          <h1>
            {member.businessName} <span>Вэб танилцуулга</span>
          </h1>
          <p>
            {demo
              ? "Туршилтын горим · Өөрчлөлт зөвхөн энэ хөтөчид хадгалагдана."
              : dirty
                ? "Хадгалаагүй өөрчлөлттэй"
                : "Ноорог бэлэн"}
          </p>
        </div>
        <div className={styles.toolbarActions}>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!preview && !parseClubWebsite(site)) {
                setError(
                  "Урьдчилан харахын өмнө хэсгүүдийн гарчиг болон зургаа шалгана уу.",
                );
                return;
              }
              setPreview(!preview);
            }}
          >
            <Eye size={16} />
            {preview ? "Засварлах" : "Урьдчилан харах"}
          </button>
          <button
            type="button"
            disabled={editingDisabled}
            onClick={() => void save(false)}
          >
            <Save size={16} />
            Ноорог хадгалах
          </button>
          <button
            type="button"
            className={styles.primary}
            disabled={editingDisabled}
            onClick={() => void save(true)}
          >
            {pending ? "Хадгалж байна…" : "Нийтлэх"}
          </button>
          <Link href={`/mgl-club/companies/${member.id}`} target="_blank">
            Сайт үзэх ↗
          </Link>
        </div>
      </div>
      <div className={styles.accessArea}>
        {accessChecking ? (
          <p role="status">Алтан гишүүнчлэлийн эрхийг шалгаж байна…</p>
        ) : access ? (
          <WebsiteAccessSummary access={access} />
        ) : (
          <p role="alert">
            Гишүүнчлэлийн эрх хараахан баталгаажаагүй тул засварлах үйлдлүүд
            түгжээтэй байна. Буцаад эрхээ шалгана уу.
          </p>
        )}
        {!eligible && (
          <>
            <p className={styles.help}>
              Өмнө нийтэлсэн хуудас хэвээр харагдана. Энэ цонхны бичсэн ноорог
              мөн хэвээр байна.
            </p>
            {access && !demo && (
              <ClubGoldPayment companyId={member.id} onPaid={refreshAccess} />
            )}
            <button
              type="button"
              disabled={busy || accessChecking}
              onClick={() => void refreshAccess()}
            >
              {accessChecking ? "Эрхийг шалгаж байна…" : "Эрхийг дахин шалгах"}
            </button>
          </>
        )}
      </div>
      <div className={styles.workflow} aria-label="Танилцуулга бэлдэх дараалал">
        <span>1. Загвар сонгох</span>
        <span>2. Зураг, мэдээллээ бөглөх</span>
        <span>3. Хянаад нийтлэх</span>
      </div>
      <details
        className={styles.templatePicker}
        open={!initial.published && initial.version === 0}
      >
        <summary>Бэлэн загвар сонгох / солих</summary>
        <p>
          Одоогийн зураг, мэдээлэл өөрчлөгдөхгүй. Загвар сонгоод солихыг
          баталгаажуулсан үед л шинэ ноорог бэлдэнэ.
        </p>
        <div className={styles.templateOptions}>
          {companyWebsiteTemplates.map((template) => (
            <button
              type="button"
              key={template.id}
              disabled={editingDisabled}
              onClick={() => chooseTemplate(template.id)}
            >
              <strong>{template.title}</strong>
              <span>{template.description}</span>
            </button>
          ))}
        </div>
      </details>
      <CompanySiteUrlField
        companyId={member.id}
        initialSlug={initial.siteSlug}
        demo={demo}
        disabled={editingDisabled}
        onAccessDenied={setAccess}
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {preview ? (
        <CompanyWebsite member={member} site={site} preview />
      ) : (
        <div className={styles.workspace}>
          <aside className={styles.sidebar}>
            <div className={styles.themePicker}>
              <h2>Сайтын өнгө</h2>
              <div className={styles.themePresets}>
                {[
                  { name: "Цэнхэр · цагаан", color: "#005baa" },
                  { name: "Ногоон · цагаан", color: "#0f3e2e" },
                  { name: "Хар · цагаан", color: "#242a32" },
                ].map((preset) => (
                  <button
                    type="button"
                    key={preset.color}
                    disabled={editingDisabled}
                    aria-pressed={
                      (site.theme?.primaryColor || "#0f3e2e") === preset.color
                    }
                    onClick={() => {
                      setSite((previous) => ({
                        ...previous,
                        theme: {
                          primaryColor: preset.color,
                          backgroundColor: "#ffffff",
                        },
                      }));
                      setNotice("");
                    }}
                  >
                    <span style={{ background: preset.color }} />
                    {preset.name}
                  </button>
                ))}
              </div>
              <label>
                Үндсэн өнгө
                <input
                  type="color"
                  value={site.theme?.primaryColor || "#0f3e2e"}
                  disabled={editingDisabled}
                  onChange={(event) => {
                    const primaryColor = event.target.value;
                    setSite((previous) => ({
                      ...previous,
                      theme: {
                        primaryColor,
                        backgroundColor:
                          previous.theme?.backgroundColor || "#ffffff",
                      },
                    }));
                    setNotice("");
                  }}
                />
              </label>
              <label>
                Суурь дэвсгэр
                <input
                  type="color"
                  value={site.theme?.backgroundColor || "#ffffff"}
                  disabled={editingDisabled}
                  onChange={(event) => {
                    const backgroundColor = event.target.value;
                    setSite((previous) => ({
                      ...previous,
                      theme: {
                        primaryColor: previous.theme?.primaryColor || "#0f3e2e",
                        backgroundColor,
                      },
                    }));
                    setNotice("");
                  }}
                />
              </label>
            </div>
            <h2>Танилцуулгын хэсгүүд</h2>
            <p>Дарааллаар нь харагдана.</p>
            <ol>
              {site.sections.map((section, index) => (
                <li key={section.id}>
                  <button
                    type="button"
                    aria-pressed={active.id === section.id}
                    onClick={() => setSelected(section.id)}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>
                        {section.title || "Гарчиг оруулаагүй хэсэг"}
                      </strong>
                      <small>{labels[section.type]}</small>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
            <h3>
              <Plus size={16} />
              Хэсэг нэмэх
            </h3>
            <div className={styles.addTypes}>
              {CLUB_SECTION_TYPES.filter((type) => type !== "hero").map(
                (type) => (
                  <button
                    type="button"
                    key={type}
                    disabled={
                      editingDisabled ||
                      site.sections.length >= 12 ||
                      (type === "contact" &&
                        site.sections.some((s) => s.type === "contact"))
                    }
                    onClick={() => add(type)}
                  >
                    + {labels[type]}
                  </button>
                ),
              )}
            </div>
            <p>12 хүртэл хэсэг нэмнэ. Нүүр хэсэг эхэндээ тогтмол байна.</p>
          </aside>
          <section
            className={styles.editor}
            aria-label="Танилцуулгын хэсэг засах"
          >
            <div className={styles.editorHeading}>
              <div>
                <p>{labels[active.type]}</p>
                <h2>{active.title || "Гарчиг оруулаагүй хэсэг"}</h2>
              </div>
              <div className={styles.orderActions}>
                <button
                  type="button"
                  aria-label="Хэсгийг дээш зөөх"
                  disabled={
                    editingDisabled || site.sections.indexOf(active) <= 1
                  }
                  onClick={() => move(active.id, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Хэсгийг доош зөөх"
                  disabled={
                    editingDisabled ||
                    active.type === "hero" ||
                    site.sections.indexOf(active) === site.sections.length - 1
                  }
                  onClick={() => move(active.id, 1)}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Хэсэг хасах"
                  disabled={editingDisabled || active.type === "hero"}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Энэ хэсэг болон доторх зураг, бичвэрийг нооргоос хасах уу?",
                      )
                    )
                      return;
                    setSite((previous) => ({
                      ...previous,
                      sections: previous.sections.filter(
                        (s) => s.id !== active.id,
                      ),
                    }));
                    setSelected(site.sections[0].id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <fieldset disabled={editingDisabled} className={styles.fields}>
              <label>
                Дээд жижиг гарчиг (заавал биш)
                <input
                  type="text"
                  maxLength={80}
                  value={active.eyebrow}
                  onChange={(e) =>
                    update(active.id, { eyebrow: e.target.value })
                  }
                />
              </label>
              <label>
                Гарчиг
                <textarea
                  rows={2}
                  maxLength={160}
                  value={active.title}
                  onChange={(e) => update(active.id, { title: e.target.value })}
                />
              </label>
              <label>
                Тайлбар, агуулга
                <textarea
                  rows={6}
                  maxLength={6000}
                  value={active.text}
                  onChange={(e) => update(active.id, { text: e.target.value })}
                />
              </label>
              <div className={styles.twoFields}>
                <label>
                  Дэвсгэр
                  <select
                    value={active.tone}
                    onChange={(e) =>
                      update(active.id, {
                        tone: e.target.value === "dark" ? "dark" : "light",
                      })
                    }
                  >
                    <option value="light">Цайвар</option>
                    <option value="dark">Бараан</option>
                  </select>
                </label>
                {active.type === "split" && (
                  <label>
                    Зургийн байрлал
                    <select
                      value={active.layout}
                      onChange={(e) =>
                        update(active.id, {
                          layout:
                            e.target.value === "image-left"
                              ? "image-left"
                              : "image-right",
                        })
                      }
                    >
                      <option value="image-right">Баруун талд</option>
                      <option value="image-left">Зүүн талд</option>
                    </select>
                  </label>
                )}
              </div>
            </fieldset>
            {["hero", "split", "stats"].includes(active.type) && (
              <WebsiteImageField
                key={active.id}
                companyId={member.id}
                url={active.imageUrl}
                alt={active.imageAlt}
                onChange={(patch) => update(active.id, patch)}
                onBusy={mediaBusy}
                demo={demo}
                disabled={editingDisabled}
                onAccessDenied={setAccess}
              />
            )}
            {(["services", "stats", "gallery"].includes(active.type) ||
              (active.type === "split" && active.items.length > 0)) && (
              <div className={styles.items}>
                <h3>
                  {active.type === "stats"
                    ? "Тоон үзүүлэлтүүд"
                    : active.type === "gallery"
                      ? "Цомгийн зургууд"
                      : "Үйлчилгээнүүд"}
                </h3>
                {active.items.map((item, index) => (
                  <div className={styles.item} key={`${active.id}-${index}`}>
                    <label>
                      {active.type === "stats"
                        ? "Тоо / үзүүлэлт"
                        : "Нэр, гарчиг"}
                      <input
                        type="text"
                        maxLength={160}
                        value={item.title}
                        disabled={editingDisabled}
                        onChange={(e) =>
                          update(active.id, {
                            items: active.items.map((v, i) =>
                              i === index ? { ...v, title: e.target.value } : v,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Тайлбар
                      <textarea
                        rows={2}
                        maxLength={1000}
                        value={item.text}
                        disabled={editingDisabled}
                        onChange={(e) =>
                          update(active.id, {
                            items: active.items.map((v, i) =>
                              i === index ? { ...v, text: e.target.value } : v,
                            ),
                          })
                        }
                      />
                    </label>
                    {active.type !== "stats" && (
                      <WebsiteImageField
                        companyId={member.id}
                        url={item.imageUrl}
                        alt={item.imageAlt}
                        onChange={(patch) =>
                          update(active.id, {
                            items: active.items.map((v, i) =>
                              i === index ? { ...v, ...patch } : v,
                            ),
                          })
                        }
                        onBusy={mediaBusy}
                        demo={demo}
                        disabled={editingDisabled}
                        onAccessDenied={setAccess}
                      />
                    )}
                    <button
                      type="button"
                      disabled={editingDisabled}
                      onClick={() =>
                        update(active.id, {
                          items: active.items.filter((_, i) => i !== index),
                        })
                      }
                    >
                      {active.type === "gallery"
                        ? "Зургийг хасах"
                        : "Мэдээллийг хасах"}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={editingDisabled || active.items.length >= 8}
                  onClick={() =>
                    update(active.id, {
                      items: [
                        ...active.items,
                        {
                          title:
                            active.type === "stats" ? "10+" : "Шинэ мэдээлэл",
                          text: "",
                          imageUrl: "",
                          imageAlt: "",
                        },
                      ],
                    })
                  }
                >
                  +{" "}
                  {active.type === "gallery"
                    ? "Зураг нэмэх"
                    : active.type === "stats"
                      ? "Тоон үзүүлэлт нэмэх"
                      : "Бүтээгдэхүүн, үйлчилгээ нэмэх"}
                </button>
              </div>
            )}
            {active.type === "contact" && (
              <div className={styles.contactSummary}>
                <h3>Холбоо барих үндсэн мэдээлэл</h3>
                <dl>
                  <div>
                    <dt>Утас</dt>
                    <dd>{member.phone}</dd>
                  </div>
                  <div>
                    <dt>Хаяг</dt>
                    <dd>{member.address || member.city}</dd>
                  </div>
                  {member.workingHours && (
                    <div>
                      <dt>Ажиллах цаг</dt>
                      <dd>{member.workingHours}</dd>
                    </div>
                  )}
                  {member.website && (
                    <div>
                      <dt>Вэб / Facebook</dt>
                      <dd>{member.website}</dd>
                    </div>
                  )}
                </dl>
                <p className={styles.help}>
                  Эдгээрийг өөрчлөх бол байгууллагын үндсэн мэдээлэл хэсэгт
                  засна. Энэ хэсгийн нэмэлт бичвэрийг дээрх талбаруудад
                  бөглөөрэй.
                </p>
                <Link href="/mgl-club/manage" onClick={guardReturn}>
                  Үндсэн мэдээлэл засах ↗
                </Link>
              </div>
            )}
            {active.type === "news" && (
              <p className={styles.help}>
                Нийтлэлүүдийг{" "}
                <Link href="/mgl-club/manage" onClick={guardReturn}>
                  Мэдээ, нийтлэл
                </Link>{" "}
                хэсгээс удирдана.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
