"use client";
import { useState, type FormEvent } from "react";

import { managementFetch, responseError } from "@/lib/building-management";
import type { WebsiteProject } from "@mgl/types/building-website";

import { WebsiteContentFields } from "./WebsiteContentFields";

import "./website-manager.css";
export function WebsiteForm({
  initial,
  onSaved,
}: {
  initial: WebsiteProject;
  onSaved: () => void;
}) {
  const [project, setProject] = useState(initial),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault();
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
      <nav className="management-section-links" aria-label="Мэдээллийн хэсгүүд">
        <a href="#project-basics">Үндсэн мэдээлэл</a>
        <a href="#content-hero">Нүүр зураг</a>
        <a href="#content-about">Танилцуулга</a>
        <a href="#content-contact">Холбоо барих</a>
        <a href="#content-gallery">Зургийн цомог</a>
      </nav>
      <fieldset disabled={saving}>
        <section className="website-form-section" id="project-basics">
          <h2>Үндсэн мэдээлэл</h2>
          <label>
            Төслийн нэр
            <input
              required
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
        <div className="website-save-bar">
          <span>Өөрчлөлт серверт хадгалагдана.</span>
          <button type="submit" className="building-primary">
            {saving ? "Хадгалж байна…" : "Бүх мэдээллийг хадгалах"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
