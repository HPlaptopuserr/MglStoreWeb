"use client";
import { useState } from "react";
import Link from "next/link";
import { useBuildingProjects } from "../management/useBuildingProjects";
import { WebsiteProjectList } from "../website/WebsiteProjectList";
import { ProjectBlocksOverview } from "./ProjectBlocksOverview";
import "../dashboard/dashboard.css";
import "./blocks.css";
export function ProjectsWorkspace() {
  const { projects, loading, error, reload } = useBuildingProjects(true);
  const [selected, setSelected] = useState(""),
    [list, setList] = useState(false);
  const id = projects.find((p) => p.id === selected)?.id ?? projects[0]?.id;
  return (
    <div className="erp-dashboard blocks-workspace">
      <header className="erp-section-heading blocks-page-header">
        <div>
          <p className="erp-eyebrow">ХӨРӨНГИЙН УДИРДЛАГА / ТӨСӨЛ БА БЛОК</p>
          <select
            aria-label="Удирдах төсөл"
            value={id ?? ""}
            disabled={loading || !projects.length}
            onChange={(e) => setSelected(e.target.value)}
          >
            {!projects.length && <option value="">Төсөл сонгох</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div className="erp-actions">
          <button aria-pressed={list} onClick={() => setList((v) => !v)}>
            {list ? "Блокийн самбар" : "Төслийн жагсаалт"}
          </button>
          <Link href="/building/manage/new">＋ Төсөл нэмэх</Link>
        </div>
      </header>
      {list ? (
        <WebsiteProjectList />
      ) : loading ? (
        <p role="status">Төслүүд ачаалж байна…</p>
      ) : error ? (
        <div role="alert">
          {error}
          <button onClick={() => void reload()}>Дахин оролдох</button>
        </div>
      ) : id ? (
        <ProjectBlocksOverview key={id} id={id} />
      ) : (
        <div className="erp-empty">
          Төсөл бүртгэгдээгүй.{" "}
          <Link href="/building/manage/new">Төсөл нэмэх →</Link>
        </div>
      )}
    </div>
  );
}
