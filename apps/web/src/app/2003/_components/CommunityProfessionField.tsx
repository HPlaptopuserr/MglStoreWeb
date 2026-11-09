"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import styles from "./profession-field.module.css";
import { RegistrationField } from "./RegistrationField";

const PROFESSION_GROUPS = [
  {
    label: "Технологи, инженерчлэл",
    professions: [
      "Програм хангамжийн инженер",
      "Мэдээллийн технологийн мэргэжилтэн",
      "Сүлжээний инженер",
      "Барилгын инженер",
      "Цахилгааны инженер",
      "Механик инженер",
      "Уул уурхайн инженер",
      "Архитектор",
    ],
  },
  {
    label: "Бизнес, санхүү, удирдлага",
    professions: [
      "Нягтлан бодогч",
      "Эдийн засагч",
      "Санхүүч",
      "Бизнесийн удирдлага",
      "Маркетингийн мэргэжилтэн",
      "Борлуулалтын менежер",
      "Хүний нөөцийн мэргэжилтэн",
      "Логистикийн мэргэжилтэн",
      "Хуульч",
    ],
  },
  {
    label: "Боловсрол, эрүүл мэнд",
    professions: [
      "Багш",
      "Эмч",
      "Сувилагч",
      "Эм зүйч",
      "Сэтгэл зүйч",
      "Нийгмийн ажилтан",
    ],
  },
  {
    label: "Урлаг, үйлчилгээ, бусад салбар",
    professions: [
      "Дизайнер",
      "Сэтгүүлч",
      "Орчуулагч",
      "Гэрэл зурагчин",
      "Тогооч",
      "Үсчин",
      "Гоо сайханч",
      "Жолооч",
      "Гагнуурчин",
      "Цахилгаанчин",
      "Хөдөө аж ахуйн мэргэжилтэн",
    ],
  },
] as const;

const CUSTOM_PROFESSION = "__custom__";

export function CommunityProfessionField({
  defaultValue,
}: {
  defaultValue: string;
}) {
  const knownProfession = PROFESSION_GROUPS.some((group) =>
    group.professions.some((profession) => profession === defaultValue),
  );
  const [selected, setSelected] = useState(
    defaultValue ? (knownProfession ? defaultValue : CUSTOM_PROFESSION) : "",
  );
  const [customValue, setCustomValue] = useState(
    knownProfession ? "" : defaultValue,
  );
  const isCustom = selected === CUSTOM_PROFESSION;
  const customLabel = "Бусад — мэргэжлээ бичих";
  const [query, setQuery] = useState(
    knownProfession ? defaultValue : defaultValue ? customLabel : "",
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const search =
    query === selected || (isCustom && query === customLabel)
      ? ""
      : query.trim().toLocaleLowerCase("mn");
  const options = PROFESSION_GROUPS.flatMap((group) =>
    group.professions
      .filter((profession) =>
        profession.toLocaleLowerCase("mn").includes(search),
      )
      .map((profession) => ({
        value: profession as string,
        label: profession as string,
        group: group.label as string,
      })),
  );
  options.push({ value: CUSTOM_PROFESSION, label: customLabel, group: "" });

  useEffect(() => {
    inputRef.current?.setCustomValidity(
      selected
        ? ""
        : "Жагсаалтаас мэргэжлээ сонгох эсвэл Бусад гэдгээр нэмнэ үү.",
    );
  }, [selected]);
  useEffect(() => {
    if (open && activeIndex >= 0)
      document
        .getElementById(`${id}-option-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, id]);

  function choose(value: string) {
    if (value === CUSTOM_PROFESSION && search) setCustomValue(query.trim());
    setSelected(value);
    setQuery(value === CUSTOM_PROFESSION ? customLabel : value);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  return (
    <div
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        Мэргэжил{" "}
        <span className="text-orange-600" aria-hidden="true">
          *
        </span>
      </label>
      <div className={styles.search}>
        <Search size={18} aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={
            open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
          }
          aria-describedby={`${id}-help`}
          autoComplete="off"
          placeholder="Мэргэжлээ хайж сонгох…"
          style={{ paddingLeft: 42 }}
          value={query}
          required
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected("");
            setOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((previous) =>
                event.key === "ArrowDown"
                  ? Math.min(previous + 1, options.length - 1)
                  : Math.max(previous - 1, 0),
              );
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              if (activeIndex >= 0) choose(options[activeIndex].value);
            } else if (event.key === "Escape" && open) {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
            }
          }}
        />
      </div>
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label="Мэргэжлийн сонголтууд"
          className={styles.list}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-option-${index}`}
              role="option"
                aria-label={option.label}
              aria-selected={selected === option.value}
              data-active={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option.value)}
            >
              {option.group && options[index - 1]?.group !== option.group && (
                <span className={styles.group}>{option.group}</span>
              )}
              <span>{option.label}</span>
            </li>
          ))}
        </ul>
      )}
      {!isCustom && <input type="hidden" name="profession" value={selected} />}
      <p id={`${id}-help`} className="mt-2 text-xs text-slate-500">
        Бичиж хайгаад сонгоно уу. Олдохгүй бол “Бусад” гэдгээр нэмээрэй.
      </p>
      {isCustom && (
        <div className="mt-3">
          <RegistrationField
            name="profession"
            label="Таны мэргэжил"
            placeholder="Мэргэжлийн нэрээ бичнэ үү"
            value={customValue}
            onChange={(event) => setCustomValue(event.target.value)}
            pattern={".*\\S.*"}
            title="Мэргэжлийн нэрээ бичнэ үү"
            required
          />
        </div>
      )}
    </div>
  );
}
