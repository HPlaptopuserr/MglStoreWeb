"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, Search, Building2, ArrowRight } from "lucide-react";
import { useBuildingProjects } from "../management/useBuildingProjects";
import { ProjectManagementCard } from "./ProjectManagementCard";
const filters = [
  { key: "ALL", label: "Бүх төсөл" },
  { key: "DRAFT", label: "Ноорог" },
  { key: "PUBLISHED", label: "Нийтэлсэн" },
  { key: "PAUSED", label: "Түр зогсоосон" },
];
export function WebsiteProjectList() {
  const { projects, organization, loading, error, reload } =
    useBuildingProjects(true);
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("ALL");
  const filtered = projects.filter(
    (p) =>
      (status === "ALL" || p.status === status) &&
      `${p.title} ${p.district ?? ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <div className="management-projects-home">
      <header className="management-heading">
        <div>
          <p className="building-eyebrow">
            {organization?.name || "БАРИЛГЫН УДИРДЛАГА"}
          </p>
          <h1>Таны төслүүд</h1>
          <Link href="/building/manage">
            Борлуулалт, төлөлтийн хяналтын самбар →
          </Link>
          <p>Төслөө сонгоод мэдээлэл, байр, борлуулалтаа удирдаарай.</p>
        </div>
        <Link className="building-primary" href="/building/manage/new">
          <Plus size={18} />
          Шинэ төсөл
        </Link>
      </header>
      <div className="management-metrics" aria-label="Төслийн хураангуй">
        {[
          { label: "Нийт төсөл", value: projects.length },
          {
            label: "Нийтэлсэн",
            value: projects.filter((p) => p.status === "PUBLISHED").length,
          },
          {
            label: "Бэлтгэж буй ноорог",
            value: projects.filter((p) => p.status === "DRAFT").length,
          },
          {
            label: "Нийт блок",
            value: projects.reduce((sum, p) => sum + p.blocks.length, 0),
          },
        ].map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{loading || error ? "—" : item.value}</strong>
          </div>
        ))}
      </div>
      <div className="management-onboarding">
        <span className="management-onboarding-icon">
          <Building2 size={23} />
        </span>
        <div>
          <h2>Төслөө 3 алхмаар бэлдээрэй</h2>
          <p>
            Төсөл, блок бүртгэх <ArrowRight size={13} /> Зураг, план, үнэ
            оруулах <ArrowRight size={13} /> Урьдчилан харж нийтлэх
          </p>
        </div>
        <Link href="/building/manage/new">
          Эхлэх <ArrowRight size={16} />
        </Link>
      </div>
      <div className="management-list-toolbar">
        <div
          className="management-filter-tabs"
          aria-label="Төслийн төлөвөөр шүүх"
        >
          {filters.map((filter) => (
            <button
              key={filter.key}
              aria-pressed={status === filter.key}
              onClick={() => setStatus(filter.key)}
            >
              {filter.label}
              <span>
                {
                  projects.filter(
                    (p) => filter.key === "ALL" || p.status === filter.key,
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
        <label className="management-search">
          <Search size={17} />
          <input
            aria-label="Төсөл хайх"
            placeholder="Нэр, байршлаар хайх…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {loading ? (
        <div
          className="management-project-grid"
          role="status"
          aria-label="Төслүүд ачаалж байна"
        >
          {[1, 2, 3].map((n) => (
            <div className="management-skeleton" key={n} />
          ))}
        </div>
      ) : error ? (
        <div className="building-alert" role="alert">
          <p>{error}</p>
          <button className="building-secondary" onClick={() => void reload()}>
            Дахин оролдох
          </button>
        </div>
      ) : filtered.length ? (
        <div className="management-project-grid">
          {filtered.map((project) => (
            <ProjectManagementCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="management-empty">
          <Building2 size={36} />
          <h2>
            {projects.length
              ? "Тохирох төсөл олдсонгүй"
              : "Эхний төслөө бүртгэе"}
          </h2>
          <p>
            {projects.length
              ? "Хайлтын үг эсвэл төлөвийн шүүлтүүрээ өөрчилнө үү."
              : "Төслийн нэрээ оруулаад блок, давхар, байраа нэмээрэй."}
          </p>
          {projects.length ? (
            <button
              className="building-secondary"
              onClick={() => {
                setQuery("");
                setStatus("ALL");
              }}
            >
              Шүүлтүүр цэвэрлэх
            </button>
          ) : (
            <Link className="building-primary" href="/building/manage/new">
              + Төсөл бүртгэх
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
