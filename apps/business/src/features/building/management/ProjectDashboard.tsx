"use client";
import { useState } from "react";
import Link from "next/link";
import { useBuildingProjects } from "./useBuildingProjects";
import { InventoryDashboard } from "./InventoryDashboard";
export function ProjectDashboard() {
  const { projects, organization, loading, error, reload } =
    useBuildingProjects(true);
  const [query, setQuery] = useState("");
  const blocks = projects
    .flatMap((project) =>
      (project.blocks ?? []).map((block) => ({
        ...block,
        recordId: project.id,
        editable: project.status === "DRAFT",
      })),
    )
    .filter((block) =>
      block.name.toLowerCase().includes(query.trim().toLowerCase()),
    );
  return (
    <>
      <header className="management-heading">
        <div>
          <p className="building-eyebrow">
            {organization?.name || "БАЙГУУЛЛАГЫН УДИРДЛАГА"}
          </p>
          <h1>Миний блокууд</h1>
          <p>Байгууллага → Блок → Давхар → Байр</p>
        </div>
        <Link className="building-primary" href="/building/manage/new">
          + Блок нэмэх
        </Link>
      </header>
      {error ? (
        <div className="building-alert" role="alert">
          <p>{error}</p>
          <button className="building-secondary" onClick={() => void reload()}>
            Дахин оролдох
          </button>
        </div>
      ) : (
        <>
          <section className="management-projects">
            <div className="management-list-heading">
              <h2>Блокийн жагсаалт</h2>
              <label>
                Блок хайх
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Нэр / дугаар"
                />
              </label>
            </div>
            {loading ? (
              <p role="status">Ачаалж байна…</p>
            ) : blocks.length ? (
              <div className="inventory-unit-list">
                {blocks.map((block) => (
                  <article className="inventory-card" key={block.id}>
                    <div>
                      <h3>{block.name}</h3>
                      <p>{block._count.floors} давхар</p>
                    </div>
                    <Link className="building-primary" href={`/building/manage/${block.recordId}/website`}>Мэдээлэл, зураг, үнэ →</Link>
                    {block.editable && (
                      <Link
                        className="building-secondary"
                        href={`/building/manage/${block.recordId}/edit`}
                      >
                        Блок, байр засах
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="project-block-empty">
                {query
                  ? "Тохирох блок алга."
                  : "Блок бүртгэгдээгүй байна. «Блок нэмэх» товчоор эхлээрэй."}
              </div>
            )}
          </section>
          <InventoryDashboard />
        </>
      )}
    </>
  );
}
