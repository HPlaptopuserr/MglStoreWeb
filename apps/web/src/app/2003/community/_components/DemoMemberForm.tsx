"use client";
import { useState, type FormEvent } from "react";
import { ACTIVITY_TYPES, type ActivityType, type Member } from "../model";
import Link from "next/link";
import { RegistrationWizard } from "../../_components/RegistrationWizard";
import { CommunityTagField } from "../../_components/CommunityTagField";
import {
  OFFER_SUGGESTIONS,
  NEED_SUGGESTIONS,
} from "../../_components/community-tags";
import { CommunityNameField } from "../../_components/CommunityNameField";
import { CommunityLocationField } from "../../_components/CommunityLocationField";
import { CommunityProfessionField } from "../../_components/CommunityProfessionField";
import styles from "../community.module.css";
export function DemoMemberForm({
  onAdd,
  initialMember,
  onRemove,
}: {
  onAdd: (member: Member) => void;
  initialMember?: Member;
  onRemove?: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [activity, setActivity] = useState<ActivityType>(
    initialMember?.activity || "employed",
  );
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
    !["city", "offers", "needs"].includes(name) &&
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
          .split(/[,\r\n]+/)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
    onAdd({
      id: initialMember?.id || crypto.randomUUID(),
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
  function renderFields(names: string[]) {
    return (
      <div className={styles.formGrid}>
        {fields
          .filter(([name]) => names.includes(name))
          .map(([name, label, placeholder]) =>
            name === "offers" || name === "needs" ? (
              <CommunityTagField
                key={name}
                name={name}
                label={
                  name === "offers" ? "Тусалж чадах зүйл" : "Хэрэгтэй дэмжлэг"
                }
                defaultValue={initialMember?.[name].join("\n") || ""}
                suggestions={
                  name === "offers" ? OFFER_SUGGESTIONS : NEED_SUGGESTIONS
                }
              />
            ) : name === "name" ? (
              <CommunityNameField
                key={name}
                defaultValue={initialMember?.name}
                editing={!!initialMember}
              />
            ) : name === "city" ? (
              <CommunityLocationField
                key={name}
                defaultValue={initialMember?.city || ""}
              />
            ) : name === "profession" ? (
              <CommunityProfessionField
                key={name}
                defaultValue={initialMember?.profession || ""}
              />
            ) : (
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
                  defaultValue={
                    initialMember
                      ? name === "offers" || name === "needs"
                        ? initialMember[name].join(", ")
                        : String(initialMember[name as keyof Member] || "")
                      : ""
                  }
                  placeholder={placeholder}
                  required={requiredField(name)}
                  maxLength={160}
                  onInput={(event) => event.currentTarget.setCustomValidity("")}
                />
              </label>
            ),
          )}
      </div>
    );
  }
  if (saved)
    return (
      <section className={styles.editor} role="status">
        <h1>Танилцуулга хадгалагдлаа!</h1>
        <Link href="/2003/mine">Миний жагсаалт →</Link>
      </section>
    );
  return (
    <RegistrationWizard
      editing={!!initialMember}
      onSubmit={submit}
      submitLabel={initialMember ? "Өөрчлөлт хадгалах" : "Танилцуулга нэмэх"}
      notice={
        <>
          <p>
            LOCAL DEMO · Зөвхөн зохиомол мэдээлэл ашиглаарай. Энэ браузерт
            хадгалагдана.
          </p>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="mt-3 text-red-700 underline"
            >
              Туршилтын танилцуулгаа устгах
            </button>
          )}
        </>
      }
      steps={[
        {
          title: "Хувийн мэдээлэл",
          content: renderFields(["name", "profession", "city"]),
        },
        {
          title: "Ажил, бизнес",
          content: (
            <>
              <fieldset className={styles.activityChoices}>
                <legend>Таны үйл ажиллагааны төлөв</legend>
                {(Object.keys(ACTIVITY_TYPES) as ActivityType[]).map(
                  (value) => (
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
                  ),
                )}
              </fieldset>
              {renderFields(["sector", "role", "organization"])}
            </>
          ),
        },
        {
          title: "Танилцуулга, нийтлэх",
          content: (
            <>
              {renderFields(["offers", "needs"])}
              <label>
                Товч танилцуулга
                <textarea
                  defaultValue={initialMember?.bio || ""}
                  name="bio"
                  rows={3}
                  maxLength={600}
                  placeholder="Туршлага, сонирхлын тухай…"
                />
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  required
                  defaultChecked={!!initialMember}
                />
                Энэ туршилтын танилцуулгыг жишээ жагсаалтад харуулахыг зөвшөөрч
                байна.
              </label>
            </>
          ),
        },
      ]}
    />
  );
}
