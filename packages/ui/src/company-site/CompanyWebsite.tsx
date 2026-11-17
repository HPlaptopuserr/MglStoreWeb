import Link from "next/link";
import { resolveApiAssetUrl } from "./api";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  Phone,
  Globe,
  Clock3,
  Check,
} from "lucide-react";
import {
  defaultClubWebsite,
  isClubWebsiteImage,
  type MglClubMember,
  type ClubWebsite,
  type ClubWebsiteSection,
} from "@mgl/types";
import { CompanyLogo } from "./CompanyLogo";
import { CompanyMedia } from "./CompanyMedia";
import { CompanyBlog } from "./CompanyBlog";

import styles from "./company-website.module.css";
const anchor = (id: string) => `company-section-${id}`;
const navigationLabels: Record<string, string> = {
  about: "Бидний тухай",
  factory: "Танилцуулга",
  advantages: "Давуу тал",
  materials: "Түүхий эд",
  applications: "Хэрэглээ",
  production: "Үйлдвэрлэл",
  certificates: "Гэрчилгээ",
  experience: "Туршлага",
  contact: "Холбоо барих",
};
export function CompanyWebsite({
  member,
  site = defaultClubWebsite(member),
  preview = false,
  managementLink,
  clubHref = "/mgl-club",
}: {
  member: MglClubMember;
  site?: ClubWebsite;
  preview?: boolean;
  managementLink?: ReactNode;
  clubHref?: string;
}) {
  const name = member.businessName.replace(/^\[ТЕСТ\]\s*/u, "").trim();
  const preferred = [
    "about",
    "advantages",
    "production",
    "certificates",
    "contact",
  ];
  const localNavigation = preferred
    .map((id) => site.sections.find((section) => section.id === id))
    .filter((section): section is ClubWebsiteSection => Boolean(section));
  const navigation =
    member.id === "demo-company-innova"
      ? localNavigation
      : [
          ...site.sections
            .filter(
              (section) =>
                section.type !== "hero" && section.type !== "contact",
            )
            .slice(0, 4),
          ...site.sections.filter((section) => section.type === "contact"),
        ];
  return (
    <div
      className={styles.website}
      style={
        {
          "--site-primary": site.theme?.primaryColor || "#0f3e2e",
          "--site-background": site.theme?.backgroundColor || "#ffffff",
          "--site-ink": "color-mix(in srgb, var(--site-primary) 75%, #101820)",
          "--site-dark": "color-mix(in srgb, var(--site-primary) 75%, #050d18)",
          "--site-text":
            site.theme?.backgroundColor &&
            parseInt(site.theme.backgroundColor.slice(1, 3), 16) * 0.299 +
              parseInt(site.theme.backgroundColor.slice(3, 5), 16) * 0.587 +
              parseInt(site.theme.backgroundColor.slice(5, 7), 16) * 0.114 <
              135
              ? "#eef3f8"
              : "#17251d",
        } as CSSProperties
      }
    >
      <header className={styles.siteHeader}>
        <a href={`#${anchor(site.sections[0].id)}`} className={styles.brand}>
          <span className={styles.brandLogo}>
            <CompanyLogo name={name} url={member.logoUrl} />
          </span>
          <strong>{name}</strong>
        </a>
        <nav
          className={styles.siteNav}
          aria-label={`${name} байгууллагын үндсэн цэс`}
        >
          {navigation.map((s) => (
            <a key={s.id} href={`#${anchor(s.id)}`}>
              {navigationLabels[s.id] || s.eyebrow || s.title}
            </a>
          ))}
        </nav>
        {!preview && (
          <Link className={styles.clubLink} href={clubHref}>
            <ArrowLeft size={14} />
            MGL CLUB
          </Link>
        )}
      </header>
      {member.isDemo && (
        <div className={styles.demoBar}>
          Туршилтын танилцуулга · {managementLink}
        </div>
      )}
      {site.sections.map((section, index) => (
        <WebsiteSection
          key={section.id}
          section={section}
          member={member}
          index={index}
        />
      ))}
      <footer className={styles.siteFooter}>
        <span>© {name}</span>
        <Link href={clubHref}>MGL CLUB · Байгууллагууд</Link>
        {managementLink}
      </footer>
    </div>
  );
}
function WebsiteSection({
  section: s,
  member,
  index,
}: {
  section: ClubWebsiteSection;
  member: MglClubMember;
  index: number;
}) {
  const header = (
    <>
      <p className={styles.eyebrow}>
        {s.eyebrow ||
          `${String(index).padStart(2, "0")} / ${member.businessName}`}
      </p>
      <h2>{s.title}</h2>
      {s.text && <p className={styles.copy}>{s.text}</p>}
    </>
  );
  if (s.type === "hero")
    return (
      <section id={anchor(s.id)} className={styles.hero} data-tone={s.tone}>
        <div className={styles.heroMedia}>
          <CompanyMedia url={s.imageUrl} alt={s.imageAlt} priority />
        </div>
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>{s.eyebrow || member.sector}</p>
          <h1>{s.title}</h1>
          {s.text && <p>{s.text}</p>}
          <a
            className={styles.heroCta}
            href={
              member.id === "demo-company-innova"
                ? `#${anchor("contact")}`
                : "#company-sections-start"
            }
          >
            {member.id === "demo-company-innova"
              ? "Захиалга өгөх"
              : "Бидэнтэй танилцах"}{" "}
            <ArrowDown size={18} />
          </a>
        </div>
        <span className={styles.heroIndex}>01 — БИДНИЙ ЕРТӨНЦ</span>
      </section>
    );
  const common = {
    id: anchor(s.id),
    className: `${styles.section} ${s.tone === "dark" ? styles.dark : ""}`,
  };
  if (s.type === "split")
    return (
      <section {...common}>
        <span id={index === 1 ? "company-sections-start" : undefined} />
        <div
          className={`${styles.container} ${styles.split}`}
          data-layout={s.layout}
        >
          <div className={styles.splitCopy}>
            {header}
            {s.items.length > 0 && (
              <ul className={styles.featureList}>
                {s.items.map((item, i) => (
                  <li key={i}>
                    <Check size={16} aria-hidden="true" />
                    {item.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={styles.splitMedia}>
            {s.imageUrl ? (
              <CompanyMedia url={s.imageUrl} alt={s.imageAlt} fit="cover" />
            ) : (
              <div className={styles.brandArtwork}>
                <span>{member.businessName}</span>
                <small>{member.sector}</small>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  if (s.type === "services")
    return (
      <section {...common}>
        <span id={index === 1 ? "company-sections-start" : undefined} />
        <div className={styles.container}>
          <div className={styles.sectionHeading}>{header}</div>
          <div className={styles.services}>
            {s.items.map((item, i) => (
              <article key={i}>
                {item.imageUrl && (
                  <div className={styles.serviceMedia}>
                    <CompanyMedia url={item.imageUrl} alt={item.imageAlt} />
                  </div>
                )}
                <div className={styles.serviceTop}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <ArrowUpRight size={24} />
                </div>
                <h3>{item.title}</h3>
                {item.text && <p>{item.text}</p>}
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  if (s.type === "stats")
    return (
      <section {...common}>
        <span id={index === 1 ? "company-sections-start" : undefined} />
        <div
          className={`${styles.container} ${s.imageUrl ? styles.statsWithMedia : ""}`}
        >
          <div>
            <div className={styles.sectionHeading}>{header}</div>
            <dl className={styles.stats}>
              {s.items.map((item, i) => (
                <div key={i}>
                  <dt>{item.title}</dt>
                  <dd>{item.text}</dd>
                </div>
              ))}
            </dl>
          </div>
          {s.imageUrl && (
            <div className={styles.statsMedia}>
              <CompanyMedia
                url={s.imageUrl}
                alt={s.imageAlt || s.title}
                fit="contain"
              />
            </div>
          )}
        </div>
      </section>
    );
  if (s.type === "gallery")
    return (
      <section {...common}>
        <span id={index === 1 ? "company-sections-start" : undefined} />
        <div className={styles.container}>
          <div className={styles.sectionHeading}>{header}</div>
          <div
            className={styles.gallery}
            data-kind={s.id === "certificates" ? "documents" : "photos"}
          >
            {s.items.map((item, i) => (
              <figure key={i}>
                {item.imageUrl && isClubWebsiteImage(item.imageUrl) && (
                  <a
                    className={styles.galleryLink}
                    href={
                      item.imageUrl.startsWith("/api/")
                        ? resolveApiAssetUrl(item.imageUrl)
                        : item.imageUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${item.title} — зургийг бүтнээр үзэх`}
                  >
                    <div className={styles.galleryMedia}>
                      <CompanyMedia
                        url={item.imageUrl}
                        alt={item.imageAlt || item.title}
                        fit={
                          s.id === "certificates" || s.items.length === 1
                            ? "contain"
                            : "cover"
                        }
                      />
                    </div>
                    <span className={styles.imageHint}>
                      {s.id === "certificates"
                        ? "Эх зургийг томруулж унших"
                        : "Зургийг томоор үзэх"}{" "}
                      <ArrowUpRight size={14} />
                    </span>
                  </a>
                )}
                <figcaption>
                  <strong>{item.title}</strong>
                  {item.text && <p>{item.text}</p>}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    );
  if (s.type === "news")
    return (
      <section {...common}>
        <span id={index === 1 ? "company-sections-start" : undefined} />
        <div className={styles.container}>
          <div className={styles.sectionHeading}>{header}</div>
          <CompanyBlog companyId={member.id} isDemo={member.isDemo} />
        </div>
      </section>
    );
  const phones = [
    ...new Set(
      [member.phone, ...(s.text.match(/\b\d{4}-?\d{4}\b/g) || [])]
        .filter(Boolean)
        .map((phone) => phone.replace(/-/g, "")),
    ),
  ];
  return (
    <section {...common}>
      <span id={index === 1 ? "company-sections-start" : undefined} />
      <div className={`${styles.container} ${styles.contact}`}>
        <div>
          {header}
          {!member.isDemo && (
            <div className={styles.contactPhones}>
              {phones.map((phone) => (
                <a
                  key={phone}
                  className={styles.contactCta}
                  href={`tel:${phone}`}
                >
                  <Phone size={20} />
                  {phone.length === 8
                    ? `${phone.slice(0, 4)}-${phone.slice(4)}`
                    : phone}
                  <ArrowUpRight size={20} />
                </a>
              ))}
            </div>
          )}
        </div>
        <div className={styles.contactDetails}>
          {(member.address || member.city) && (
            <p>
              <MapPin size={20} />
              <span>{member.address || member.city}</span>
            </p>
          )}
          {member.workingHours && (
            <p>
              <Clock3 size={20} />
              <span>{member.workingHours}</span>
            </p>
          )}
          {member.website && (
            <a href={member.website} target="_blank" rel="noopener noreferrer">
              <Globe size={20} />
              {member.website.includes("facebook.com/")
                ? "Facebook хуудас"
                : "Цахим хуудас"}
              <ArrowUpRight size={18} />
            </a>
          )}
          <p>
            {member.name}
            {member.role ? ` · ${member.role}` : ""}
          </p>
          {member.isDemo && (
            <small>Жишээ мэдээлэл · Бодит холбоо барих мэдээлэл биш</small>
          )}
        </div>
      </div>
    </section>
  );
}
