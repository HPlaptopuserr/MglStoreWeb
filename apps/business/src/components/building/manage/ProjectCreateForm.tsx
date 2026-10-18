"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { managementFetch, responseError } from "@/lib/building-management";
import { ProjectBlocks } from "./ProjectBlocks";
import {
  inventoryError,
  serializeBlocks,
  type BlockDraft,
} from "./inventory-draft";
import { ProjectBasics, type ProjectBasicsDraft } from "./ProjectBasics";
import { ProjectReview } from "./ProjectReview";
import { useBuildingProjects } from "./useBuildingProjects";
const steps = ["Төслийн мэдээлэл", "Блок, давхар, байр", "Хянаж бүртгэх"];
export interface ProjectEditData {
  id: string;
  slug: string;
  updatedAt: string;
  basics: ProjectBasicsDraft;
  blocks: BlockDraft[];
}
export function ProjectCreateForm({ initial }: { initial?: ProjectEditData }) {
  const {
    organization,
    loading,
    error: loadError,
    reload,
  } = useBuildingProjects(true);
  const [step, setStep] = useState(0);
  const [basics, setBasics] = useState<ProjectBasicsDraft>(
    initial?.basics ?? {
      title: "",
      district: "",
      address: "",
      description: "",
      coverImageUrl: "",
    },
  );
  const [blocks, setBlocks] = useState<BlockDraft[]>(initial?.blocks ?? []);
  const [saving, setSaving] = useState(false),
    [savedId, setSavedId] = useState("");
  const [error, setError] = useState("");
  const slug = useRef(initial?.slug ?? "");
  const heading = useRef<HTMLHeadingElement>(null);
  function move(next: number) {
    setStep(next);
    setError("");
    requestAnimationFrame(() => heading.current?.focus());
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!basics.title.trim()) {
      setError("Төслийн нэрээ оруулна уу.");
      setStep(0);
      return;
    }
    if (step === 0) {
      move(1);
      return;
    }
    const message = inventoryError(blocks, initial?.blocks);
    if (message) {
      setError(message);
      return;
    }
    if (step === 1) {
      move(2);
      return;
    }
    setSaving(true);
    setError("");
    if (!slug.current) slug.current = `project-${crypto.randomUUID()}`;
    try {
      const response = await managementFetch(
        initial ? `admin/projects/${initial.id}` : "admin/projects",
        {
          method: initial ? "PATCH" : "POST",
          body: JSON.stringify({
            ...basics,
            title: basics.title.trim(),
            updatedAt: initial?.updatedAt,
            slug: slug.current,
            blocks: serializeBlocks(blocks, initial?.blocks),
          }),
        },
      );
      if (!response.ok)
        throw new Error(await responseError(response, "Хадгалж чадсангүй"));
      const result = (await response.json()) as { project: { id: string } };
      setSavedId(result.project.id);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Хадгалж чадсангүй");
    } finally {
      setSaving(false);
    }
  }
  if (savedId)
    return (
      <section className="wizard-success">
        <span aria-hidden="true">✓</span>
        <h1>
          {initial ? "Өөрчлөлт хадгалагдлаа" : "Төсөл нооргоор бүртгэгдлээ"}
        </h1>
        <p>
          {blocks.length} блок,{" "}
          {blocks.reduce(
            (sum, b) => sum + b.floors.reduce((n, f) => n + f.units.length, 0),
            0,
          )}{" "}
          байр хадгалагдлаа.
        </p>
        <p>
          Дараа нь нүүр зураг, танилцуулга, байрны үнэ болон төлөвөө оруулна.
          «Давхрын план» хэсэгт PNG/JPG зураг оруулж тоотуудтай холбоорой.
        </p>
        <Link
          className="building-primary"
          href={`/building/manage/${savedId}/website`}
        >
          Зураг, план, үнэ оруулах →
        </Link>
      </section>
    );
  return (
    <div className="project-wizard">
      <Link
        className="building-back"
        href="/building/manage/content"
        onClick={(e) => {
          if (
            (basics.title || blocks.length) &&
            !window.confirm("Хадгалаагүй бүртгэлээ орхиод гарах уу?")
          )
            e.preventDefault();
        }}
      >
        ← Төслүүд
      </Link>
      <header className="management-heading">
        <div>
          <p className="building-eyebrow">
            {initial ? "ТӨСЛИЙН БҮТЭЦ ЗАСАХ" : "ШИНЭ ТӨСӨЛ БҮРТГЭХ"}
          </p>
          <h1 ref={heading} tabIndex={-1}>
            {steps[step]}
          </h1>
          <p>
            Алхам {step + 1} / 3 · Блокоо нэмэхдээ барилгын зураг, байрны хүрээг
            хамт тохируулна.
          </p>
        </div>
      </header>
      <ol className="wizard-steps" aria-label="Бүртгэлийн явц">
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={step === index ? "step" : undefined}
            className={
              step === index ? "active" : step > index ? "complete" : ""
            }
          >
            <span>{step > index ? "✓" : index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {loadError ? (
        <div role="alert" className="building-alert">
          <p>{loadError}</p>
          <button className="building-secondary" onClick={() => void reload()}>
            Дахин оролдох
          </button>
        </div>
      ) : loading ? (
        <p role="status">Байгууллагын мэдээлэл ачаалж байна…</p>
      ) : (
        <form className="project-create-form" onSubmit={submit}>
          <fieldset disabled={saving}>
            {step === 0 && (
              <ProjectBasics
                value={basics}
                organization={organization}
                onChange={setBasics}
              />
            )}
            {step === 1 && (
              <ProjectBlocks
                blocks={blocks}
                existing={initial?.blocks}
                onChange={setBlocks}
              />
            )}
            {step === 2 && (
              <ProjectReview
                basics={basics}
                blocks={blocks}
                organization={organization?.name || ""}
              />
            )}
            {error && (
              <p role="alert" className="building-error-message">
                {error}
              </p>
            )}
            <div className="wizard-actions">
              <div>
                {step > 0 && (
                  <button
                    type="button"
                    className="building-secondary"
                    onClick={() => move(step - 1)}
                  >
                    ← Буцах
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="building-primary"
                disabled={!organization || saving}
              >
                {saving
                  ? "Хадгалж байна…"
                  : step === 2
                    ? initial
                      ? "Өөрчлөлт хадгалах"
                      : "Төсөл нооргоор бүртгэх"
                    : step === 0
                      ? "Блок, давхар нэмэх →"
                      : "Бүртгэлээ шалгах →"}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}
