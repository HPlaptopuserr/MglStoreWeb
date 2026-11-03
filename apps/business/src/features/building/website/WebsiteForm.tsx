"use client";
import { useState, type FormEvent } from "react";

import { managementFetch, responseError } from "@/features/building/api/management-client";
import type { WebsiteProject } from "@mgl/types/building-website";

import { EditorSteps, type EditorStep } from "./EditorSteps";
import { WebsiteContentFields } from "./WebsiteContentFields";

import "./website-manager.css";
const contentSteps: EditorStep[] = [
  {
    id: "basics",
    title: "Үндсэн мэдээлэл",
    description: "Төслийн нэр, байршил болон барилгын явцыг оруулна.",
  },
  {
    id: "hero",
    title: "Нүүр зураг",
    description: "Хэрэглэгчийн хамгийн түрүүнд харах зураг, гарчгийг бэлтгэнэ.",
  },
  {
    id: "about",
    title: "Танилцуулга",
    description:
      "Төслийн онцлог, ашиглалтад орох хугацаа, төлбөрийн нөхцөлийг тайлбарлана.",
  },
  {
    id: "contact",
    title: "Холбоо барих",
    description: "Борлуулалтын утас, имэйл, газрын зургийн холбоосоо оруулна.",
  },
  {
    id: "amenities",
    title: "Давуу тал",
    description: "Оршин суугчдад зориулсан үйлчилгээ, орчны давуу талаа нэмнэ.",
  },
  {
    id: "gallery",
    title: "Зургийн цомог",
    description: "Гадна орчин, интерьерийн зураг болон тайлбарыг нэмнэ.",
  },
  {
    id: "faq",
    title: "Асуулт, хариулт",
    description: "Түгээмэл асуултуудаа нэмээд бүх мэдээллээ хадгална.",
  },
];
export function WebsiteForm({
  initial,
  onSaved,
}: {
  initial: WebsiteProject;
  onSaved: () => void;
}) {
  const [step, setStep] = useState("basics");
  const stepIndex = contentSteps.findIndex((item) => item.id === step);
  const [project, setProject] = useState(initial),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!project.title.trim()) {
      setStep("basics");
      setError("Төслийн нэрээ оруулна уу.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await managementFetch(
        `admin/projects/${project.id}/website`,
        {
          method: "PATCH",
          body: JSON.stringify({
            updatedAt: project.updatedAt,
            basics: {
              title: project.title,
              description: project.description ?? "",
              district: project.district ?? "",
              address: project.address ?? "",
              status: project.status,
              constructionStatus: project.constructionStatus,
            },
            content: project.website.content,
          }),
        },
      );
      if (!response.ok)
        throw new Error(await responseError(response, "Хадгалж чадсангүй"));
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={save}>
      <EditorSteps steps={contentSteps} current={step} onChange={setStep} />
      <fieldset disabled={saving}>
        <section
          hidden={step !== "basics"}
          className="website-form-section"
          id="project-basics"
        >
          <h2>Үндсэн мэдээлэл</h2>
          <label>
            Төслийн нэр
            <input
              value={project.title}
              maxLength={180}
              onChange={(event) =>
                setProject({ ...project, title: event.target.value })
              }
            />
          </label>
          <div className="website-field-grid">
            <label>
              Дүүрэг
              <input
                value={project.district ?? ""}
                onChange={(event) =>
                  setProject({ ...project, district: event.target.value })
                }
              />
            </label>
            <label>
              Хаяг
              <input
                value={project.address ?? ""}
                onChange={(event) =>
                  setProject({ ...project, address: event.target.value })
                }
              />
            </label>
          </div>
          <label>
            Товч танилцуулга
            <textarea
              rows={3}
              value={project.description ?? ""}
              onChange={(event) =>
                setProject({ ...project, description: event.target.value })
              }
            />
          </label>
          <div className="website-field-grid">
            <label>
              Барилгын явц
              <select
                value={project.constructionStatus}
                onChange={(event) =>
                  setProject({
                    ...project,
                    constructionStatus: event.target.value,
                  })
                }
              >
                {[
                  ["PLANNED", "Төлөвлөсөн"],
                  ["UNDER_CONSTRUCTION", "Баригдаж буй"],
                  ["COMPLETED", "Дууссан"],
                  ["HANDED_OVER", "Хүлээлгэн өгсөн"],
                ].map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Хуудасны төлөв
              <select
                value={project.status}
                onChange={(event) =>
                  setProject({ ...project, status: event.target.value })
                }
              >
                {[
                  ["DRAFT", "Ноорог"],
                  ["PUBLISHED", "Нийтэлсэн"],
                  ["PAUSED", "Түр зогсоосон"],
                ].map(([key, label]) => (
                  <option
                    key={key}
                    value={key}
                    disabled={
                      key === "PUBLISHED" && project.verification !== "VERIFIED"
                    }
                  >
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p>
            {project.verification === "VERIFIED"
              ? "Төсөл баталгаажсан. Хуудасны төлөвийг «Нийтэлсэн» болгож хэрэглэгчдэд харуулна."
              : "Баталгаажуулалт хүлээгдэж байна. Нооргоо бэлтгээд «Урьдчилан харах» товчоор шалгаарай."}
          </p>
        </section>
        <WebsiteContentFields
          activeSection={step}
          value={project.website.content}
          onChange={(content) =>
            setProject({ ...project, website: { ...project.website, content } })
          }
        />
        {error && (
          <p className="building-alert" role="alert">
            {error}
          </p>
        )}
        <div className="editor-step-actions">
          <button
            type="button"
            className="building-secondary"
            disabled={stepIndex === 0}
            onClick={() => setStep(contentSteps[stepIndex - 1]!.id)}
          >
            ← Өмнөх
          </button>
          <small>
            Алхам солиход оруулсан мэдээлэл хадгалагдан үлдэнэ. Серверт хадгалах
            товчийг дарна уу.
          </small>
          <div>
            <button type="submit" className="building-secondary">
              {saving ? "Хадгалж байна…" : "Серверт хадгалах"}
            </button>
            {stepIndex < contentSteps.length - 1 && (
              <button
                type="button"
                className="building-primary"
                onClick={() => setStep(contentSteps[stepIndex + 1]!.id)}
              >
                Дараах: {contentSteps[stepIndex + 1]!.title} →
              </button>
            )}
          </div>
        </div>
      </fieldset>
    </form>
  );
}
