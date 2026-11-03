"use client";
import { useId, useState } from "react";
import { Field } from "../components/shared";
export function DepartmentInput({
  names,
  defaultValue,
}: {
  names: string[];
  defaultValue: string;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const normalized = value.trim().replace(/\s+/g, " ");
  const existing = names.some(
    (name) => name.toLocaleLowerCase() === normalized.toLocaleLowerCase(),
  );
  const suggestions = names
    .filter((name) =>
      name.toLocaleLowerCase().includes(normalized.toLocaleLowerCase()),
    )
    .slice(0, 6);
  return (
    <div className="wf-department-picker">
      <Field
        label="Алба, хэлтэс"
        hint="Хадгалсан хэлтсээс сонгох эсвэл шинэ нэр бичнэ үү. Хоосон бол хэлтэсгүй гэж хадгална."
      >
        <input
          name="department"
          list={id}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Жишээ: Борлуулалтын алба"
          maxLength={120}
          autoComplete="off"
          aria-describedby={`${id}-hint`}
        />
        <datalist id={id}>
          {names.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </Field>
      {suggestions.length > 0 && (
        <div
          className="wf-department-suggestions"
          role="group"
          aria-label="Хадгалсан хэлтсүүд"
        >
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={
                name.toLocaleLowerCase() === normalized.toLocaleLowerCase()
              }
              onClick={() => setValue(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <small id={`${id}-hint`} className="wf-department-hint">
        {normalized
          ? existing
            ? "Байгууллагын хадгалсан хэлтсийг ашиглана."
            : "Шинэ хэлтэс байгууллагад хадгалагдаж, бусад ажилтанд сонгогдоно."
          : names.length
            ? "Хадгалсан нэр дээр дарж сонгох эсвэл бичиж хайна уу."
            : "Одоогоор хэлтэс бүртгээгүй байна. Шинэ нэр бичиж үүсгэнэ үү."}
      </small>
    </div>
  );
}
