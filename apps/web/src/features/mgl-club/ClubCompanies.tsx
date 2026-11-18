"use client";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  BriefcaseBusiness,
} from "lucide-react";
import { MGL_CLUB_LOCATIONS, MGL_CLUB_SECTORS } from "@mgl/types";
import { useClubWorkspace } from "./ClubWorkspaceProvider";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useClubDirectory } from "./useClubDirectory";
import { goldCompanies } from "./gold-companies";
import { ClubDemoLogos } from "./ClubDemoLogos";
import { CompanyLogo } from "./CompanyLogo";
import { API } from "@/lib/api";
import { innovaCompany, type MglClubMember } from "@mgl/types";
import styles from "./companies.module.css";

export function ClubCompanies() {
  const { members: filters } = useClubWorkspace();
  const { query, setQuery, sector, setSector, city, setCity } = filters;
  const [expanded, setExpanded] = useState(false);
  const [expandedResults, setExpandedResults] = useState<string | null>(null);
  const directory = useClubDirectory(query, sector, city, "gold");
  const [innova, setInnova] = useState<MglClubMember>(innovaCompany);
  useEffect(() => {
    const controller = new AbortController();
    async function loadFeaturedCompany() {
      try {
        const response = await fetch(`${API}/forms/mgl-club/sites/innovallc`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const result: { member: MglClubMember } = await response.json();
        if (!controller.signal.aborted) setInnova(result.member);
      } catch {
        /* The published default remains available when the API is unavailable. */
      }
    }
    void loadFeaturedCompany();
    return () => controller.abort();
  }, []);
  const companies = goldCompanies(
    directory.members,
    { query, sector, city },
    innova,
  );
  const filterKey = JSON.stringify([query, sector, city]);
  const showAll = expandedResults === filterKey;
  const visibleCompanies = showAll ? companies : companies.slice(0, 12);
  const hasHidden = companies.length > visibleCompanies.length;
  const showDemo =
    process.env.NODE_ENV !== "production" &&
    !directory.loading &&
    !directory.error &&
    !companies.length &&
    !query &&
    !sector &&
    !city;
  return (
    <section
      id="hero"
      className={styles.browse}
      aria-labelledby="club-companies-title"
    >
      <div className={styles.section}>
        <div className={styles.searchArea}>
          <div className={styles.searchRow}>
            <label className={styles.companySearch}>
              <span className={styles.name}>Байгууллага, үйлчилгээ хайх</span>
              <input
                id="club-search"
                type="search"
                maxLength={160}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Та ямар байгууллага, үйлчилгээ хайж байна вэ?"
              />
              <Search size={22} aria-hidden="true" />
            </label>
            <button
              type="button"
              className={styles.filterButton}
              aria-expanded={expanded}
              aria-controls="gold-company-filters"
              onClick={() => setExpanded((value) => !value)}
            >
              <SlidersHorizontal size={22} /> Дэлгэрэнгүй шүүлт
            </button>
          </div>
          <div
            id="gold-company-filters"
            className={styles.filterPanel}
            hidden={!expanded}
          >
            <label>
              Байршил
              <select
                value={city}
                onChange={(event) => setCity(event.target.value)}
              >
                <option value="">Бүх аймаг, нийслэл</option>
                {MGL_CLUB_LOCATIONS.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Үйл ажиллагааны чиглэл
              <select
                value={sector}
                onChange={(event) => setSector(event.target.value)}
              >
                <option value="">Бүх салбар</option>
                {MGL_CLUB_SECTORS.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCity("");
                setSector("");
              }}
            >
              Шүүлтүүр цэвэрлэх
            </button>
          </div>
          <div
            className={styles.shortcuts}
            aria-label="Байгууллагын шуурхай шүүлт"
          >
            <button
              type="button"
              aria-pressed={city === "Улаанбаатар"}
              onClick={() =>
                setCity(city === "Улаанбаатар" ? "" : "Улаанбаатар")
              }
            >
              <MapPin size={18} />
              Улаанбаатар
            </button>
            {[
              "Худалдаа",
              "Үйлдвэрлэл",
              "Мэдээллийн технологи",
              "Тээвэр, логистик",
            ].map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={sector === value}
                onClick={() => setSector(sector === value ? "" : value)}
              >
                <BriefcaseBusiness size={18} />
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.heading}>
          <div>
            <h1 id="club-companies-title">Алтан гишүүд</h1>
          </div>
        </div>
        <div
          id="gold-company-list"
          className={styles.grid}
          aria-busy={directory.loading}
        >
          {visibleCompanies.map(({ member, href }) => {
            const service =
              member.offers
                .split(/[,;\n]+/)
                .map((value) => value.trim())
                .find(Boolean) || member.sector;
            return (
              <Link
                href={href}
                className={styles.tile}
                title={`${member.businessName} /${service}/`}
                key={member.id}
                aria-label={`${member.businessName}, ${service}: танилцуулга үзэх`}
              >
                <span className={styles.logo}>
                  <CompanyLogo
                    name={member.businessName}
                    url={member.logoUrl}
                  />
                </span>
                <strong className={styles.companyName}>
                  {member.businessName}
                </strong>
                {service && (
                  <span className={styles.companyService}>/{service}/</span>
                )}
              </Link>
            );
          })}
        </div>
        {directory.loading && (
          <p role="status">Байгууллагуудыг ачаалж байна…</p>
        )}
        {directory.error && (
          <div role="alert">
            <p>{directory.error}</p>
            <button type="button" onClick={directory.retry}>
              Дахин оролдох
            </button>
          </div>
        )}
        {showDemo && <ClubDemoLogos />}
        {!showDemo &&
          !directory.loading &&
          !directory.error &&
          !companies.length && (
            <p className={styles.empty}>
              {query || sector || city
                ? "Тохирох Алтан гишүүн олдсонгүй. Шүүлтүүрээ өөрчилж үзнэ үү."
                : "Төлбөр нь баталгаажсан Алтан гишүүдийн лого энд харагдана."}
            </p>
          )}
        {(hasHidden || showAll) && companies.length > 12 && (
          <button
            type="button"
            className={styles.more}
            aria-expanded={showAll}
            aria-controls="gold-company-list"
            onClick={() => setExpandedResults(showAll ? null : filterKey)}
          >
            {showAll ? "Хураах" : "Бусад алтан гишүүдийг харах"}
          </button>
        )}
        {directory.cursor && !hasHidden && (
          <button
            type="button"
            className={styles.more}
            disabled={directory.loading}
            onClick={directory.loadMore}
          >
            Бусад байгууллагыг харах
          </button>
        )}
      </div>
    </section>
  );
}
