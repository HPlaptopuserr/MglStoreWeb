import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import { MGL_CLUB_LOCATIONS, MGL_CLUB_SECTORS } from "@mgl/types";
import styles from "./needs.module.css";
interface NeedsFiltersProps {
  query: string;
  city: string;
  sector: string;
  onQuery: (value: string) => void;
  onCity: (value: string) => void;
  onSector: (value: string) => void;
}
export function NeedsFilters({
  query,
  city,
  sector,
  onQuery,
  onCity,
  onSector,
}: NeedsFiltersProps) {
  return (
    <div className={styles.filters}>
      <label className={styles.search}>
        <Search size={18} />
        <span className={styles.srOnly}>Худалдан авах хэрэгцээ хайх</span>
        <input
          type="search"
          maxLength={160}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Юу хайж байна вэ? Хүргэлт, сав баглаа, засвар…"
        />
      </label>
      <label className={styles.select}>
        <MapPin size={16} />
        <span className={styles.srOnly}>Хэрэгцээг аймгаар шүүх</span>
        <select value={city} onChange={(event) => onCity(event.target.value)}>
          <option value="">Бүх аймаг, нийслэл</option>
          {MGL_CLUB_LOCATIONS.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label className={styles.select}>
        <SlidersHorizontal size={16} />
        <span className={styles.srOnly}>Захиалагчийн салбараар шүүх</span>
        <select
          value={sector}
          onChange={(event) => onSector(event.target.value)}
        >
          <option value="">Захиалагчийн бүх салбар</option>
          {MGL_CLUB_SECTORS.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
