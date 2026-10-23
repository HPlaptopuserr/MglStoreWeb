import { MapPin } from "lucide-react";
import { MGL_CLUB_PROVINCES } from "@mgl/types";
import styles from "./club-design.module.css";

export function ProvinceFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <section
      className={styles.provinceFilter}
      aria-labelledby="province-filter-title"
    >
      <div className={styles.provinceHeading}>
        <h3 id="province-filter-title">
          <MapPin size={18} aria-hidden="true" /> 21 аймгийн бизнесийн хүрээлэл
        </h3>
        <p>Аймгаа сонгож, орон нутгийн гишүүдтэй холбогдоорой.</p>
      </div>
      <div
        className={styles.provinceOptions}
        role="group"
        aria-label="Гишүүдийг аймгаар харах"
      >
        <button
          type="button"
          aria-pressed={!value}
          onClick={() => onChange("")}
        >
          Бүх гишүүд
        </button>
        {MGL_CLUB_PROVINCES.map((province) => (
          <button
            type="button"
            key={province}
            aria-pressed={value === province}
            onClick={() => onChange(province)}
          >
            {province}
          </button>
        ))}
      </div>
      <div className={styles.capitalOption}>
        <span>Нийслэлийн гишүүд</span>
        <button
          type="button"
          aria-pressed={value === "Улаанбаатар"}
          onClick={() => onChange("Улаанбаатар")}
        >
          Улаанбаатар
        </button>
      </div>
    </section>
  );
}
