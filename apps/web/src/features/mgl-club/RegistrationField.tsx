import {
  MGL_CLUB_LOCATIONS,
  MGL_CLUB_SECTORS,
  getMglClubCurrentYear,
  type MglClubField,
  mglClubFields,
} from "@mgl/types";
import styles from "./registration.module.css";

type Field = (typeof mglClubFields)[number];
const placeholders: Partial<Record<MglClubField, string>> = {
  name: "Таны овог, нэр",
  businessName: "Жишээ: Нутгийн үйлчилгээ ХХК",
  teamSize: "Жишээ: 5",
  offers: "Жишээ: Вэб хөгжүүлэлт, брэнд дизайн…",
  needs: "Жишээ: Сав баглаа боодол, хүргэлтийн үйлчилгээ…",
  description: "Юу хийдэг, хэнд зориулж ажилладгаа танилцуулаарай.",
  phone: "8 оронтой утас",
  foundedYear: "Жишээ: 2018",
  role: "Жишээ: Үүсгэн байгуулагч",
  address: "Сум, баг, гудамж, байр…",
  workingHours: "Даваа–Баасан 09:00–18:00",
  serviceArea: "Аймаг, сум / онлайнаар / хүргэлтийн бүс…",
  website: "https://example.com эсвэл сошиал хуудасны холбоос",
};
export function RegistrationField({ field }: { field: Field }) {
  const multiline = ["description", "offers", "needs"].includes(field.id);
  const numeric = field.id === "foundedYear" || field.id === "teamSize";
  return (
    <label
      className={
        multiline ||
        [
          "businessName",
          "role",
          "address",
          "workingHours",
          "serviceArea",
          "website",
        ].includes(field.id)
          ? styles.fullWidth
          : undefined
      }
    >
      <span>
        {field.label}
        {field.required ? (
          <b className={styles.requiredMark}> *</b>
        ) : (
          <small className={styles.optional}>Сонголтоор</small>
        )}
      </span>
      {field.id === "city" || field.id === "sector" ? (
        <select name={field.id} required defaultValue="">
          <option value="" disabled>
            {field.id === "city" ? "Аймаг / нийслэл сонгох" : "Чиглэл сонгох"}
          </option>
          {(field.id === "city" ? MGL_CLUB_LOCATIONS : MGL_CLUB_SECTORS).map(
            (value) => (
              <option key={value}>{value}</option>
            ),
          )}
        </select>
      ) : multiline ? (
        <textarea
          name={field.id}
          required={field.required}
          maxLength={field.maxLength}
          rows={3}
          placeholder={placeholders[field.id]}
        />
      ) : (
        <input
          name={field.id}
          required={field.required}
          maxLength={field.maxLength}
          type={
            numeric
              ? "number"
              : field.id === "phone"
                ? "tel"
                : field.id === "website"
                  ? "url"
                  : "text"
          }
          min={numeric ? (field.id === "foundedYear" ? 1900 : 1) : undefined}
          max={
            numeric
              ? field.id === "foundedYear"
                ? getMglClubCurrentYear()
                : 100000
              : undefined
          }
          step={numeric ? 1 : undefined}
          pattern={field.id === "phone" ? "[0-9]{8}" : undefined}
          inputMode={numeric || field.id === "phone" ? "numeric" : undefined}
          autoComplete={
            field.id === "name"
              ? "name"
              : field.id === "phone"
                ? "tel-national"
                : field.id === "businessName"
                  ? "organization"
                  : field.id === "role"
                    ? "organization-title"
                    : field.id === "address"
                      ? "street-address"
                      : field.id === "website"
                        ? "url"
                        : "off"
          }
          placeholder={placeholders[field.id]}
        />
      )}
      {field.id === "foundedYear" && (
        <small className={styles.fieldHint}>
          Эхэлсэн оноос үйл ажиллагаа явуулсан жилийг автоматаар тооцно.
        </small>
      )}
    </label>
  );
}
