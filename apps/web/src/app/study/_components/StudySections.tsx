"use client";

import { useState } from "react";
import { GraduationCap, Search, SlidersHorizontal, X } from "lucide-react";
import type { ProjectItem } from "@/components/molecules/projects/project-types";
import { StudyMaterialCard } from "./StudyMaterialCards";
import { parseTeacherItems, type StudySettings } from "./study-utils";

type StudySectionsProps = {
  displayMaterials: ProjectItem[];
  loading: boolean;
  error: string;
  openingId: string | null;
  settings: StudySettings;
  onOpenMaterial: (material: ProjectItem, ticketOptionId?: string) => void;
  onRetry: () => void;
};

export function StudySections({
  displayMaterials,
  loading,
  error,
  openingId,
  settings,
  onOpenMaterial,
  onRetry,
}: StudySectionsProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [teacher, setTeacher] = useState("");
  const categories = Array.from(
    new Set(displayMaterials.map((item) => item.category || "Сургалт")),
  );
  const teachers = Array.from(
    new Set(
      displayMaterials.flatMap((item) =>
        parseTeacherItems(item).map((person) => person.name),
      ),
    ),
  );
  const search = query.trim().toLocaleLowerCase("mn-MN");
  const filtered = displayMaterials.filter((item) => {
    const people = parseTeacherItems(item);
    return (
      (!category || (item.category || "Сургалт") === category) &&
      (!teacher || people.some((person) => person.name === teacher)) &&
      (!search ||
        [
          item.title,
          item.summary,
          item.category,
          item.location,
          item.address,
          ...people.map((person) => person.name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("mn-MN")
          .includes(search))
    );
  });
  const hasFilters = Boolean(query || category || teacher);
  const reset = () => {
    setQuery("");
    setCategory("");
    setTeacher("");
  };

  return (
    <>
      <header className="mb-6 border-b border-slate-200 pb-6 sm:mb-8">
        <p className="flex items-center gap-2 text-sm font-semibold text-sky-700">
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
          Сургалт · Зөвлөгөө
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {settings.title}{" "}
          <span className="text-sky-700">{settings.accentTitle}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          {settings.description}
        </p>
      </header>

      <section
        aria-label="Сургалт хайх, шүүх"
        className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
          <div>
            <label
              htmlFor="study-search"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Сургалт хайх
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="study-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Сургалт, багш, байршил…"
                className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3 text-base outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="study-teacher"
              className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Багшаар шүүх
            </label>
            <select
              id="study-teacher"
              value={teacher}
              onChange={(event) => setTeacher(event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-base outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Бүх багш</option>
              {teachers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div
          className="flex gap-2 overflow-x-auto pb-2"
          aria-label="Сургалтын чиглэл"
        >
          {["", ...categories].map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
              className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${category === name ? "border-sky-700 bg-sky-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {name || "Бүгд"}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="study-results-heading" aria-busy={loading}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2
            id="study-results-heading"
            className="text-xl font-bold text-slate-950"
          >
            {settings.listTitle || "Сургалтууд"}
          </h2>
          <div className="flex items-center gap-3">
            <p role="status" className="text-sm text-slate-600">
              {loading
                ? "Уншиж байна…"
                : error
                  ? "Мэдээлэл ачаалагдсангүй"
                  : `${filtered.length} сургалт`}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-sky-700 underline-offset-4 hover:underline"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Цэвэрлэх
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <div
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            aria-hidden="true"
          >
            {[0, 1, 2].map((key) => (
              <div
                key={key}
                className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-2xl border border-slate-200 bg-white p-8 text-center"
          >
            <p className="text-slate-700">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 min-h-11 rounded-xl bg-sky-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              Дахин оролдох
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
            <GraduationCap
              className="mx-auto h-10 w-10 text-slate-400"
              aria-hidden="true"
            />
            <p className="mt-4 font-semibold text-slate-700">
              {hasFilters
                ? "Хайлтад тохирох сургалт олдсонгүй"
                : settings.emptyText}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={reset}
                className="mt-3 min-h-11 text-sm font-semibold text-sky-700"
              >
                Бүх сургалтыг харах
              </button>
            )}
          </div>
        ) : (
          <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((material, index) => (
              <StudyMaterialCard
                key={material.id}
                material={material}
                index={index}
                openingId={openingId}
                onOpen={onOpenMaterial}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
