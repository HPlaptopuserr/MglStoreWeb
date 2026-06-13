"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  Phone,
  Share2,
  Search,
  Palette,
  Save,
  CheckCircle2,
  Loader2,
  Settings,
  ExternalLink,
  Link as LinkIcon,
  ImageIcon,
  CreditCard,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import { ContractPaymentAccountsSettings } from "@/components/organisms/settings/ContractPaymentAccountsSettings";

// ─── Section config ────────────────────────────────────────────────────────────

const SECTIONS = [
  { key: "general", label: "Ерөнхий", icon: Globe },
  { key: "appearance", label: "Гадаад харагдал", icon: Palette },
  { key: "contact", label: "Холбоо барих", icon: Phone },
  { key: "contract-payments", label: "Төлбөрийн данс", icon: CreditCard },
  { key: "social", label: "Нийгмийн сүлжээ", icon: Share2 },
  { key: "seo", label: "SEO", icon: Search },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

type SettingsMap = Record<string, string>;

// ─── Small UI primitives ───────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
      {children}
    </span>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
    />
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 border-b border-slate-100 pb-4">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SocialRow({
  icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-6 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        {icon}
      </div>
      <div className="flex-1">
        <FieldLabel>{label}</FieldLabel>
        <TextInput value={value} onChange={onChange} placeholder={placeholder} />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [active, setActive] = useState<SectionKey>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // General
  const [siteName, setSiteName] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [siteUrl, setSiteUrl] = useState("");

  // Appearance
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#5B4CFF");
  const [accentColor, setAccentColor] = useState("#10B981");

  // Contact
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [workHours, setWorkHours] = useState("");

  // Social
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [youtube, setYoutube] = useState("");

  // SEO
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [ogImage, setOgImage] = useState("");

  // ── Load ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    adminFetch(`${API}/site-settings`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: SettingsMap) => {
        setSiteName(data["site-name"] ?? "");
        setSiteDescription(data["site-description"] ?? "");
        setSiteUrl(data["site-url"] ?? "");

        setLogoUrl(data["logo-url"] ?? "");
        setFaviconUrl(data["favicon-url"] ?? "");
        setPrimaryColor(data["primary-color"] ?? "#5B4CFF");
        setAccentColor(data["accent-color"] ?? "#10B981");

        setContactPhone(data["contact-phone"] ?? "");
        setContactEmail(data["contact-email"] ?? "");
        setContactAddress(data["contact-address"] ?? "");
        setWorkHours(data["work-hours"] ?? "");

        setFacebook(data["social-facebook"] ?? "");
        setInstagram(data["social-instagram"] ?? "");
        setTwitter(data["social-twitter"] ?? "");
        setLinkedin(data["social-linkedin"] ?? "");
        setYoutube(data["social-youtube"] ?? "");

        setMetaTitle(data["seo-meta-title"] ?? "");
        setMetaDescription(data["seo-meta-description"] ?? "");
        setMetaKeywords(data["seo-keywords"] ?? "");
        setOgImage(data["seo-og-image"] ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    const body: SettingsMap = {};

    if (active === "general") {
      body["site-name"] = siteName;
      body["site-description"] = siteDescription;
      body["site-url"] = siteUrl;
    } else if (active === "appearance") {
      body["logo-url"] = logoUrl;
      body["favicon-url"] = faviconUrl;
      body["primary-color"] = primaryColor;
      body["accent-color"] = accentColor;
    } else if (active === "contact") {
      body["contact-phone"] = contactPhone;
      body["contact-email"] = contactEmail;
      body["contact-address"] = contactAddress;
      body["work-hours"] = workHours;
    } else if (active === "social") {
      body["social-facebook"] = facebook;
      body["social-instagram"] = instagram;
      body["social-twitter"] = twitter;
      body["social-linkedin"] = linkedin;
      body["social-youtube"] = youtube;
    } else if (active === "seo") {
      body["seo-meta-title"] = metaTitle;
      body["seo-meta-description"] = metaDescription;
      body["seo-keywords"] = metaKeywords;
      body["seo-og-image"] = ogImage;
    }

    try {
      await adminFetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}

    setSaving(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Тохиргоо
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Сайтын ерөнхий тохиргоо, брэнд, холбоо барих мэдээлэл болон SEO
              тохиргоог энд хийнэ.
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex gap-6">
        {/* Left nav — desktop */}
        <nav className="hidden w-52 shrink-0 flex-col gap-1 md:flex">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all ${
                active === key
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Mobile tab bar */}
        <div className="flex w-full gap-2 overflow-x-auto pb-1 md:hidden">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                active === key
                  ? "bg-violet-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            </div>
          ) : (
            <>
              {/* ── GENERAL ── */}
              {active === "general" && (
                <div className="space-y-5">
                  <SectionCard
                    title="Сайтын үндсэн мэдээлэл"
                    description="Хэрэглэгчдэд харагдах сайтын нэр болон тайлбар."
                  >
                    <div>
                      <FieldLabel>Сайтын нэр</FieldLabel>
                      <TextInput
                        value={siteName}
                        onChange={setSiteName}
                        placeholder="MGL Store"
                      />
                    </div>
                    <div>
                      <FieldLabel>Тайлбар</FieldLabel>
                      <TextArea
                        value={siteDescription}
                        onChange={setSiteDescription}
                        placeholder="Сайтын товч тайлбар..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <FieldLabel>Сайтын URL</FieldLabel>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="url"
                          value={siteUrl}
                          onChange={(e) => setSiteUrl(e.target.value)}
                          placeholder="https://mglstore.mn"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition-all focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                        />
                      </div>
                      {siteUrl && (
                        <a
                          href={siteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Сайт нээх
                        </a>
                      )}
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* ── APPEARANCE ── */}
              {active === "appearance" && (
                <div className="space-y-5">
                  <SectionCard
                    title="Лого & Favicon"
                    description="Сайтын дээд хэсэгт болон browser tab дээр харагдах зургуудын URL."
                  >
                    <div>
                      <FieldLabel>Лого URL</FieldLabel>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="url"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            placeholder="https://cdn.example.com/logo.png"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition-all focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                          />
                        </div>
                        {logoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={logoUrl}
                            alt="logo preview"
                            className="h-10 w-10 rounded-lg border border-slate-200 bg-white object-contain p-1"
                          />
                        )}
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Favicon URL</FieldLabel>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="url"
                            value={faviconUrl}
                            onChange={(e) => setFaviconUrl(e.target.value)}
                            placeholder="https://cdn.example.com/favicon.ico"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition-all focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                          />
                        </div>
                        {faviconUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={faviconUrl}
                            alt="favicon preview"
                            className="h-10 w-10 rounded-lg border border-slate-200 bg-white object-contain p-1"
                          />
                        )}
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Брэндийн өнгө"
                    description="Сайт болон admin panel-д ашиглагдах үндсэн өнгөнүүд."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Үндсэн өнгө</FieldLabel>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="h-10 w-10 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                          />
                          <TextInput
                            value={primaryColor}
                            onChange={setPrimaryColor}
                            placeholder="#5B4CFF"
                          />
                        </div>
                        <div
                          className="mt-2 h-6 w-full rounded-lg"
                          style={{ background: primaryColor }}
                        />
                      </div>
                      <div>
                        <FieldLabel>Нэмэлт өнгө</FieldLabel>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            className="h-10 w-10 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                          />
                          <TextInput
                            value={accentColor}
                            onChange={setAccentColor}
                            placeholder="#10B981"
                          />
                        </div>
                        <div
                          className="mt-2 h-6 w-full rounded-lg"
                          style={{ background: accentColor }}
                        />
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* ── CONTACT ── */}
              {active === "contact" && (
                <div className="space-y-5">
                  <SectionCard
                    title="Холбоо барих мэдээлэл"
                    description="Сайтын footer болон холбоо барих хуудаст харагдах мэдээлэл."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Утасны дугаар</FieldLabel>
                        <TextInput
                          value={contactPhone}
                          onChange={setContactPhone}
                          placeholder="+976 9900 0000"
                          type="tel"
                        />
                      </div>
                      <div>
                        <FieldLabel>И-мэйл хаяг</FieldLabel>
                        <TextInput
                          value={contactEmail}
                          onChange={setContactEmail}
                          placeholder="info@mglstore.mn"
                          type="email"
                        />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Хаяг</FieldLabel>
                      <TextArea
                        value={contactAddress}
                        onChange={setContactAddress}
                        placeholder="Улаанбаатар хот, ..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <FieldLabel>Ажлын цаг</FieldLabel>
                      <TextInput
                        value={workHours}
                        onChange={setWorkHours}
                        placeholder="Даваа–Баасан: 09:00–18:00"
                      />
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* ── PAYMENT ACCOUNTS ── */}
              {active === "contract-payments" && (
                <ContractPaymentAccountsSettings />
              )}

              {/* ── SOCIAL ── */}
              {active === "social" && (
                <div className="space-y-5">
                  <SectionCard
                    title="Нийгмийн сүлжээний холбоосууд"
                    description="Сайтын footer болон хуваалцах хэсэгт харагдах социал сүлжээний хаягууд."
                  >
                    <SocialRow
                      icon={<span className="text-xs font-black text-blue-600">f</span>}
                      label="Facebook"
                      value={facebook}
                      onChange={setFacebook}
                      placeholder="https://facebook.com/mglstore"
                    />
                    <SocialRow
                      icon={
                        <span className="bg-gradient-to-br from-fuchsia-500 to-orange-400 bg-clip-text text-[10px] font-black text-transparent">
                          IG
                        </span>
                      }
                      label="Instagram"
                      value={instagram}
                      onChange={setInstagram}
                      placeholder="https://instagram.com/mglstore"
                    />
                    <SocialRow
                      icon={<span className="text-xs font-black text-sky-500">𝕏</span>}
                      label="Twitter / X"
                      value={twitter}
                      onChange={setTwitter}
                      placeholder="https://twitter.com/mglstore"
                    />
                    <SocialRow
                      icon={<span className="text-xs font-black text-blue-700">in</span>}
                      label="LinkedIn"
                      value={linkedin}
                      onChange={setLinkedin}
                      placeholder="https://linkedin.com/company/mglstore"
                    />
                    <SocialRow
                      icon={<span className="text-xs font-black text-red-600">▶</span>}
                      label="YouTube"
                      value={youtube}
                      onChange={setYoutube}
                      placeholder="https://youtube.com/@mglstore"
                    />
                  </SectionCard>
                </div>
              )}

              {/* ── SEO ── */}
              {active === "seo" && (
                <div className="space-y-5">
                  <SectionCard
                    title="Хайлтын систем (SEO)"
                    description="Google болон бусад хайлтын системд харагдах мэдээлэл."
                  >
                    <div>
                      <FieldLabel>Meta Title</FieldLabel>
                      <TextInput
                        value={metaTitle}
                        onChange={setMetaTitle}
                        placeholder="MGL Store — Монголын онлайн дэлгүүр"
                      />
                      <div
                        className={`mt-1 text-right text-[11px] font-medium ${
                          metaTitle.length > 60 ? "text-red-500" : "text-slate-400"
                        }`}
                      >
                        {metaTitle.length}/60{metaTitle.length > 60 && " — хэт урт"}
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Meta Description</FieldLabel>
                      <TextArea
                        value={metaDescription}
                        onChange={setMetaDescription}
                        placeholder="Сайтын товч тайлбар..."
                        rows={3}
                      />
                      <div
                        className={`mt-1 text-right text-[11px] font-medium ${
                          metaDescription.length > 160 ? "text-red-500" : "text-slate-400"
                        }`}
                      >
                        {metaDescription.length}/160
                        {metaDescription.length > 160 && " — хэт урт"}
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Түлхүүр үгс (keyword)</FieldLabel>
                      <TextInput
                        value={metaKeywords}
                        onChange={setMetaKeywords}
                        placeholder="mgl store, онлайн дэлгүүр, ..."
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        Таслалаар тусгаарлаж оруулна уу.
                      </p>
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Open Graph зураг"
                    description="Нийгмийн сүлжээнд хуваалцах үед харагдах урьдчилан харах зураг."
                  >
                    <div>
                      <FieldLabel>OG Image URL</FieldLabel>
                      <div className="relative">
                        <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="url"
                          value={ogImage}
                          onChange={(e) => setOgImage(e.target.value)}
                          placeholder="https://cdn.example.com/og-image.jpg"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition-all focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                        />
                      </div>
                    </div>
                    {ogImage && (
                      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ogImage}
                          alt="OG image preview"
                          className="max-h-48 w-full object-cover"
                        />
                        <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
                          <p className="truncate text-xs text-slate-500">
                            1200 × 630 px байхыг зөвлөж байна.
                          </p>
                        </div>
                      </div>
                    )}
                  </SectionCard>
                </div>
              )}

              {/* ── Save bar ── */}
              {active !== "contract-payments" && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : saved ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? "Хадгалж байна..." : saved ? "Хадгалагдлаа" : "Хадгалах"}
                </button>
              </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
