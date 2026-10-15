"use client";
import { useState, type FormEvent } from "react";
import { ACTIVITY_TYPES, type ActivityType, type Member } from "../model";
import styles from "../community.module.css";
export function DemoMemberForm({ onAdd }: { onAdd: (member: Member) => void }) {
  const [saved, setSaved] = useState(false);
  const [activity, setActivity] = useState<ActivityType>("employed");
  const config = ACTIVITY_TYPES[activity];
  const fields = [
    ["name", "Нэр", "Жишээ: А. Туршилт"],
    ["city", "Хот / улс", "Жишээ: Улаанбаатар"],
    ["profession", "Мэргэжил", "Жишээ: Инженер"],
    [
      "sector",
      config.direction,
      activity === "planning"
        ? "Жишээ: Хүнсний үйлдвэрлэл"
        : "Жишээ: Технологи",
    ],
    [
      "role",
      config.role,
      activity === "planning"
        ? "Жишээ: Эрүүл хүнсний жижиг үйлдвэрлэл"
        : activity === "business"
          ? "Жишээ: Вэбсайт хөгжүүлэлт"
          : "Жишээ: Төслийн менежер",
    ],
    [
      "organization",
      config.organization,
      activity === "planning"
        ? "Нэрээ сонгоогүй байж болно"
        : "Байгууллагын нэр",
    ],
    ["offers", "Тусалж чадах зүйл (заавал биш)", "Таслалаар тусгаарлана"],
    [
      "needs",
      "Хэрэгтэй дэмжлэг (заавал биш)",
      "Жишээ: Хамтрагч, хөрөнгө, зөвлөгөө",
    ],
  ];
  const requiredField = (name: string) =>
    !["offers", "needs"].includes(name) &&
    !(activity === "planning" && name === "organization");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = (key: string) => String(data.get(key) || "").trim();
    for (const [key] of fields) {
      if (requiredField(key) && !text(key)) {
        const input = form.elements.namedItem(key);
        if (input instanceof HTMLInputElement) {
          input.setCustomValidity("Мэдээлэл оруулна уу.");
          input.reportValidity();
        }
        return;
      }
    }
    const tags = (key: string) => [
      ...new Set(
        text(key)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
    onAdd({
      id: crypto.randomUUID(),
      activity,
      name: text("name"),
      city: text("city"),
      profession: text("profession"),
      role: text("role"),
      organization: text("organization"),
      sector: text("sector"),
      bio: text("bio"),
      offers: tags("offers"),
      needs: tags("needs"),
    });
    form.reset();
    setSaved(true);
  }
  return (
    <details open className={styles.editor}>
      <summary>Өөрийгөө танилцуулах</summary>
      <form onSubmit={submit} onInput={() => setSaved(false)}>
        <p>
          Зөвхөн зохиомол мэдээлэл ашиглаарай. Энэ браузерт хадгалагдана; сервер
          рүү илгээхгүй.
        </p>
        <fieldset className={styles.activityChoices}>
          <legend>Таны үйл ажиллагааны төлөв</legend>
          {(Object.keys(ACTIVITY_TYPES) as ActivityType[]).map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="activity"
                checked={activity === value}
                value={value}
                onChange={() => {
                  setActivity(value);
                  setSaved(false);
                }}
              />
              {ACTIVITY_TYPES[value].label}
            </label>
          ))}
        </fieldset>
        <div className={styles.formGrid}>
          {fields.map(([name, label, placeholder]) => (
            <label
              key={
                ["role", "organization", "sector"].includes(name)
                  ? `${activity}-${name}`
                  : name
              }
            >
              {label}
              <input
                name={name}
                placeholder={placeholder}
                required={requiredField(name)}
                maxLength={160}
                onInput={(event) => event.currentTarget.setCustomValidity("")}
              />
            </label>
          ))}
        </div>
        <label>
          Товч танилцуулга
          <textarea
            name="bio"
            rows={3}
            maxLength={600}
            placeholder="Туршлага, сонирхлын тухай…"
          />
        </label>
        <label className={styles.check}>
          <input type="checkbox" required />
          Энэ туршилтын танилцуулгыг жишээ жагсаалтад харуулахыг зөвшөөрч байна.
        </label>
        <button className={styles.primary}>Танилцуулга нэмэх</button>
        {saved && (
          <p role="status">Танилцуулга нэмэгдлээ. Жагсаалтаас хайж үзээрэй.</p>
        )}
      </form>
    </details>
  );
}
