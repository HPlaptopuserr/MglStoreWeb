"use client";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  BriefcaseBusiness,
} from "lucide-react";
import { MGL_CLUB_LOCATIONS, MGL_CLUB_SECTORS } from "@mgl/types";
import { useClubWorkspace } from "./ClubWorkspaceProvider";
import { useState } from "react";
import Link from "next/link";
import { useClubDirectory } from "./useClubDirectory";
import { ClubDemoLogos } from "./ClubDemoLogos";
import { CompanyLogo } from "./CompanyLogo";
import styles from "./companies.module.css";

export function ClubCompanies() {
  const { members: filters } = useClubWorkspace();
  const { query, setQuery, sector, setSector, city, setCity } = filters;
  const [expanded, setExpanded] = useState(false);
  const directory = useClubDirectory(query, sector, city, "gold");
  const showDemo =
    process.env.NODE_ENV !== "production" &&
    !directory.loading &&
    !directory.error &&
    !directory.members.length &&
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
        <div className={styles.grid} aria-busy={directory.loading}>
          {directory.members.map((member) => (
            <Link
              href={`/mgl-club/companies/${member.id}`}
              className={styles.tile}
              title={member.businessName}
              key={member.id}
              aria-label={`${member.businessName}: танилцуулга үзэх`}
            >
              <span className={styles.logo}>
                <CompanyLogo name={member.businessName} url={member.logoUrl} />
              </span>
              <span className={styles.name}>{member.businessName}</span>
            </Link>
          ))}
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
          !directory.members.length && (
            <p className={styles.empty}>
              {query || sector || city
                ? "Тохирох Алтан гишүүн олдсонгүй. Шүүлтүүрээ өөрчилж үзнэ үү."
                : "Төлбөр нь баталгаажсан Алтан гишүүдийн лого энд харагдана."}
            </p>
          )}
        {directory.cursor && (
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
