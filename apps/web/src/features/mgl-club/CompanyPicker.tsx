"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { MglClubMember } from "@mgl/types";
import styles from "./company-picker.module.css";
type CompanyOption = Pick<MglClubMember, "id" | "businessName" | "phone">;
export function CompanyPicker({
  companies,
  value,
  disabled,
  onChange,
}: {
  companies: readonly CompanyOption[];
  value: string;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = companies.find((company) => company.id === value);
  const search = query.trim().toLocaleLowerCase();
  const results = companies.filter((company) =>
    `${company.businessName} ${company.phone}`
      .toLocaleLowerCase()
      .includes(search),
  );
  const activeIndex = Math.min(active, Math.max(0, results.length - 1));
  useEffect(() => {
    if (open)
      document
        .getElementById(`${id}-option-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, id, open, query]);
  function choose(companyId: string) {
    onChange(companyId);
    setQuery("");
    setOpen(false);
    setActive(0);
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((previous) =>
        Math.max(
          0,
          Math.min(
            results.length - 1,
            open
              ? previous + (event.key === "ArrowDown" ? 1 : -1)
              : event.key === "ArrowDown"
                ? 0
                : results.length - 1,
          ),
        ),
      );
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (open && results[activeIndex]) choose(results[activeIndex].id);
      else setOpen(true);
    }
  }
  return (
    <div
      className={styles.picker}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id}>Нэр эсвэл утасны дугаараар хайж сонгох</label>
      <div className={styles.inputWrap}>
        <Search size={19} aria-hidden="true" />
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && !disabled}
          aria-controls={open && !disabled ? `${id}-results` : undefined}
          aria-describedby={`${id}-help`}
          aria-activedescendant={
            open && !disabled && results[activeIndex]
              ? `${id}-option-${activeIndex}`
              : undefined
          }
          autoComplete="off"
          type="text"
          disabled={disabled}
          value={open ? query : selected?.businessName || ""}
          placeholder="Нэр эсвэл утас бичиж хайх…"
          onFocus={() => {
            setQuery("");
            setOpen(true);
            setActive(0);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={keyDown}
        />
        {open && query ? (
          <button
            type="button"
            className={styles.clear}
            aria-label="Хайлт цэвэрлэх"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery("");
              setActive(0);
              input.current?.focus();
            }}
          >
            <X size={17} />
          </button>
        ) : (
          <ChevronDown size={17} aria-hidden="true" />
        )}
      </div>
      <p id={`${id}-help`}>
        {disabled
          ? "Одоогийн үйлдэл дууссаны дараа байгууллага сольж болно."
          : "Бүх бүртгэлтэй байгууллагаас сонгоно. Нэр эсвэл 8 оронтой утсаар хайж болно."}
      </p>
      {open && !disabled && (
        <div className={styles.dropdown}>
          <p role="status">{results.length} байгууллага олдлоо</p>
          <div
            role="listbox"
            id={`${id}-results`}
            aria-label="Хайлтад тохирох байгууллагууд"
            className={styles.results}
          >
            {results.map((company, index) => (
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                role="option"
                id={`${id}-option-${index}`}
                key={company.id}
                aria-selected={company.id === value}
                data-active={index === activeIndex}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(company.id)}
              >
                <strong>{company.businessName}</strong>
                <span>{company.phone || "Утас бүртгээгүй"}</span>
                {company.id === value && (
                  <Check
                    size={17}
                    className={styles.selectedCheck}
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
          {!results.length && (
            <p>Тохирох байгууллага олдсонгүй. Өөр нэр эсвэл утсаар хайна уу.</p>
          )}
        </div>
      )}
    </div>
  );
}
