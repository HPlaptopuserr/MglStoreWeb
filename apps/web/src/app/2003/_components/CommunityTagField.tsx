"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { parseCommunityTags } from "./community-tags";
import styles from "./community-tags.module.css";

export function CommunityTagField({
  name,
  label,
  defaultValue = "",
  suggestions,
}: {
  name: "offers" | "needs";
  label: string;
  defaultValue?: string;
  suggestions: readonly string[];
}) {
  const [selected, setSelected] = useState(() =>
    parseCommunityTags(defaultValue),
  );
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const key = (value: string) => value.trim().toLocaleLowerCase("mn");
  const matches = suggestions.filter(
    (value) =>
      key(value).includes(key(query)) &&
      !selected.some((tag) => key(tag) === key(value)),
  );
  const canCreate =
    !!query.trim() &&
    ![...suggestions, ...selected].some((value) => key(value) === key(query));
  const options = [
    ...matches.map((value) => ({ value, custom: false })),
    ...(canCreate ? [{ value: query.trim(), custom: true }] : []),
  ];
  useEffect(() => {
    inputRef.current?.setCustomValidity(
      query.trim()
        ? "Жагсаалтаас сонгох эсвэл Enter дарж бичсэн зүйлээ нэмнэ үү."
        : "",
    );
  }, [query]);
  useEffect(() => {
    if (open && activeIndex >= 0)
      document
        .getElementById(`${id}-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, id]);
  function add(value: string) {
    const next = parseCommunityTags([...selected, value].join("\n"));
    if (next.join("\n").length > 1000) {
      setError("Сонгосон зүйлсийн нийт урт 1000 тэмдэгтээс хэтрэхгүй байна.");
      return;
    }
    setSelected(next);
    setQuery("");
    setActiveIndex(-1);
    setError("");
    inputRef.current?.focus();
  }
  return (
    <div
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id} className={styles.label}>
        {label} <span>(заавал биш)</span>
      </label>
      {selected.length > 0 && (
        <ul className={styles.tags} aria-label={`${label} — сонгосон зүйлс`}>
          {selected.map((tag) => (
            <li key={tag}>
              <span>{tag}</span>
              <button
                type="button"
                aria-label={`${tag} хасах`}
                onClick={() => {
                  setSelected((items) => items.filter((item) => item !== tag));
                  setError("");
                }}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.search}>
        <Search size={17} aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={
            open && activeIndex >= 0 ? `${id}-${activeIndex}` : undefined
          }
          aria-describedby={`${id}-help`}
          value={query}
          maxLength={160}
          autoComplete="off"
          placeholder="Хайх эсвэл өөрөө бичиж нэмэх…"
          style={{ paddingLeft: 40 }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              if (options.length === 0) return;
              setActiveIndex((previous) =>
                event.key === "ArrowDown"
                  ? Math.min(previous + 1, options.length - 1)
                  : Math.max(previous - 1, 0),
              );
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (open && activeIndex >= 0 && options[activeIndex])
                add(options[activeIndex].value);
              else if (query.trim()) add(query);
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
          className={styles.options}
          role="listbox"
          id={`${id}-list`}
          aria-label={`${label} — сонголтууд`}
          aria-multiselectable="true"
        >
          {options.map((option, index) => (
            <li
              role="option"
              aria-selected={false}
              aria-label={
                option.custom ? `“${option.value}” нэмэх` : option.value
              }
              id={`${id}-${index}`}
              key={option.value}
              data-active={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => add(option.value)}
            >
              {option.custom && <Plus size={16} aria-hidden="true" />}
              <span>
                {option.custom ? `“${option.value}” нэмэх` : option.value}
              </span>
            </li>
          ))}
          {options.length === 0 && (
            <li role="presentation" className={styles.noResults}>
              Энэ зүйл аль хэдийн сонгогдсон. Өөр зүйл хайгаарай.
            </li>
          )}
        </ul>
      )}
      <input type="hidden" name={name} value={selected.join("\n")} />
      <p id={`${id}-help`} className={styles.help}>
        Олон зүйл сонгож болно. Өөрөө бичсэн бол Enter дарж нэмээрэй.
      </p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
