"use client";
import { ProjectMasterplanEditor } from "../masterplan/ProjectMasterplanEditor";
import { ProjectPlanStudio } from "./ProjectPlanStudio";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

import { useWebsiteProject } from "./useWebsiteProject";
import { WebsiteForm } from "./WebsiteForm";
import { ProjectStatus } from "../manage/ProjectStatus";
import { ProjectPriceEditor } from "./ProjectPriceEditor";
import "./website-manager.css";
export function WebsiteManager({ id }: { id: string }) {
  const search = useSearchParams();
  const { project, loading, error, reload } = useWebsiteProject(id);
  const [tab, setTab] = useState<"masterplan" | "content" | "plans">(
      search.get("tab") === "units" ? "plans" : "masterplan",
    ),
    [notice, setNotice] = useState("");
  const [planBlockId, setPlanBlockId] = useState(search.get("block") ?? "");
  if (loading) return <p role="status">Төсөл ачаалж байна…</p>;
  if (error || !project)
    return (
      <div role="alert" className="building-alert">
        {error || "Төсөл олдсонгүй"}
        <button onClick={() => void reload()}>Дахин оролдох</button>
      </div>
    );
  return (
    <div className="website-manager">
      <header className="management-heading">
        <div>
          <p className="building-eyebrow">ТӨСЛИЙН БҮХ МЭДЭЭЛЭЛ</p>
          <h1>{project.title}</h1>
          <ProjectStatus status={project.status} />
        </div>
        <Link
          className="building-secondary"
          href={`/building/manage/${id}/preview`}
          target="_blank"
        >
          Урьдчилан харах ↗
        </Link>
      </header>
      <div className="building-tabs website-tabs">
        {[
          ["masterplan", "Ерөнхий зураг, блок"],
          ["plans", "Зураг, план ба байр"],
          ["content", "Танилцуулга, зураг"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={tab === key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key as typeof tab)}
          >
            {label}
          </button>
        ))}
      </div>
      {notice && (
        <p role="status" className="website-notice">
          {notice}
        </p>
      )}
      {tab === "masterplan" && (
        <ProjectMasterplanEditor
          key={`masterplan:${project.id}:${project.updatedAt}`}
          project={project}
          onSaved={() => {
            setNotice("Ерөнхий зураг, блокийн байрлал хадгалагдлаа.");
            void reload();
          }}
        />
      )}
      <div hidden={tab !== "content"}>
        <ProjectPriceEditor
          key={`price:${project.id}:${project.updatedAt}`}
          project={project}
          onSaved={() => {
            setNotice("М²-ийн үнэ болон байрны нийт үнийг шинэчиллээ.");
            void reload();
          }}
        />
        <WebsiteForm
          key={`content:${project.id}:${project.updatedAt}`}
          initial={project}
          onSaved={() => {
            setNotice("Төслийн мэдээлэл серверт хадгалагдлаа.");
            void reload();
          }}
        />
      </div>
      {tab === "plans" && (
        <ProjectPlanStudio
          project={project}
          blockId={planBlockId}
          onBlockChange={setPlanBlockId}
          onNext={() => {
            setNotice("План болон давхрын оноолт хадгалагдлаа.");
            setTab("content");
            void reload();
          }}
        />
      )}
    </div>
  );
}
