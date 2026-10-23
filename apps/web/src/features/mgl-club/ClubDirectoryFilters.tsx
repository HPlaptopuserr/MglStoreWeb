import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { MGL_CLUB_SECTORS, type MglClubServiceGroup } from "@mgl/types";
import styles from "./club-design.module.css";
interface DirectoryFiltersProps {
  city: string;
  query: string;
  sector: string;
  scope: string;
  services: MglClubServiceGroup[];
  onQueryChange: (value: string) => void;
  onSectorChange: (value: string) => void;
  onScopeChange: (value: string) => void;
}
export function ClubDirectoryFilters({
  city,
  query,
  sector,
  scope,
  services,
  onQueryChange,
  onSectorChange,
  onScopeChange,
}: DirectoryFiltersProps) {
  const [expandedFilters, setExpandedFilters] = useState(false);
  return (
    <div className={styles.filters} data-expanded={expandedFilters}>
      <label className={styles.search}>
        <Search size={20} />
        <span className={styles.srOnly}>
          Үйлчилгээ, үйлчилгээ үзүүлэгчийн нэрээр хайх
        </span>
        <input
          id="club-search"
          type="search"
          maxLength={160}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={
            city
              ? `${city}: ямар үйлчилгээ хэрэгтэй вэ?`
              : "Ямар үйлчилгээ, бүтээгдэхүүн хэрэгтэй вэ? Засвар, хүргэлт, нийлүүлэлт…"
          }
        />
      </label>
      <button
        className={styles.filterToggle}
        aria-label="Шүүлтүүрийн сонголтууд"
        aria-expanded={expandedFilters}
        aria-controls="club-filter-options"
        onClick={() => setExpandedFilters((value) => !value)}
      >
        <SlidersHorizontal size={19} />
      </button>
      <div id="club-filter-options" className={styles.filterOptions}>
        <label>
          <span className={styles.srOnly}>Үйлчилгээний чиглэл</span>
          <select
            value={sector}
            onChange={(event) => {
              onSectorChange(event.target.value);
            }}
          >
            <option value="">Бүх үйлчилгээ, салбар</option>
            {MGL_CLUB_SECTORS.map((value) => (
              <option key={value} value={value}>
                {value}
                {services.length
                  ? ` (${services.find((service) => service.sector === value)?.count ?? 0})`
                  : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={styles.srOnly}>Хайлтын хамрах хүрээ</span>
          <select
            value={scope}
            onChange={(event) => {
              onScopeChange(event.target.value);
            }}
          >
            <option value="services">Үйлчилгээ үзүүлэгч</option>
            <option value="all">Үйлчилгээ ба худалдан авах хэрэгцээ</option>
          </select>
        </label>
      </div>
    </div>
  );
}
