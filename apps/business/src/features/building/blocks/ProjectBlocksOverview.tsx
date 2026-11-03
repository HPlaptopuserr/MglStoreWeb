"use client";
import { useState } from "react";
import Link from "next/link";
import { useWebsiteProject } from "../website/useWebsiteProject";
import { ProjectBuildingExplorer } from "../website/ProjectBuildingExplorer";
import { percentage, currency } from "../dashboard/model";
import { BlockDetails } from "./BlockDetails";
export function ProjectBlocksOverview({ id }: { id: string }) {
  const { project, loading, error, reload } = useWebsiteProject(id);
  const [selected, setSelected] = useState(""),
    [filter, setFilter] = useState("all"),
    [view, setView] = useState("cards");
  if (loading)
    return (
      <div className="erp-empty" role="status">
        Блокууд ачаалж байна…
      </div>
    );
  if (error || !project)
    return (
      <div role="alert" className="erp-empty">
        {error || "Төсөл олдсонгүй"}
        <button onClick={() => void reload()}>Дахин оролдох</button>
      </div>
    );
  const units = project.blocks.flatMap((b) => b.floors.flatMap((f) => f.units));
  const sold = units.filter((u) => u.status === "SOLD").length;
  const available = units.filter((u) => u.status === "AVAILABLE").length;
  const blocks = project.blocks.filter(
    (b) =>
      filter === "all" ||
      (filter === "available"
        ? b.floors.some((f) => f.units.some((u) => u.status === "AVAILABLE"))
        : b.floors.flatMap((f) => f.units).length > 0 &&
          b.floors.every((f) => f.units.every((u) => u.status === "SOLD"))),
  );
  const block = blocks.find((b) => b.id === selected) ?? blocks[0];
  return (
    <>
      <header className="erp-section-heading">
        <div>
          <h1>{project.title}</h1>
          <p>
            {[project.district, project.address].filter(Boolean).join(" · ") ||
              "Байршил оруулаагүй"}
          </p>
        </div>
        <div className="erp-actions">
          <button onClick={() => window.print()}>Хэвлэх / PDF</button>
          <Link href={`/building/manage/${id}/edit`}>
            ＋ Блок нэмэх / бүтэц засах
          </Link>
        </div>
      </header>
      <div className="blocks-metrics">
        {[
          ["Нийт блок", project.blocks.length],
          ["Нийт нэгж", units.length],
          ["Борлуулалтын явц", `${percentage(sold, units.length).toFixed(1)}%`],
          [
            "Барилга угсралт",
            (
              {
                PLANNED: "Төлөвлөсөн",
                UNDER_CONSTRUCTION: "Баригдаж буй",
                COMPLETED: "Дууссан",
                HANDED_OVER: "Хүлээлгэн өгсөн",
              } as Record<string, string>
            )[project.constructionStatus] || project.constructionStatus,
          ],
        ].map(([label, value]) => (
          <article className="erp-card" key={label}>
            <span>{label}</span>
            <strong className="erp-value">{value}</strong>
          </article>
        ))}
      </div>
      <p className="erp-note">
        Зарагдсан: {sold} · Боломжтой: {available} · Захиалгатай:{" "}
        {units.filter((u) => u.status === "RESERVED").length}. Бүх зориулалтын
        нэгж багтсан.
      </p>
      <div className="erp-card blocks-toolbar">
        <div>
          <button
            aria-pressed={view === "cards"}
            onClick={() => setView("cards")}
          >
            Блокийн картууд
          </button>
          <button
            aria-pressed={view === "visual"}
            onClick={() => setView("visual")}
          >
            Барилгын зураг, давхар
          </button>
        </div>
        <select
          aria-label="Блок шүүх"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Бүх блок ({project.blocks.length})</option>
          <option value="available">Боломжтой байртай</option>
          <option value="sold">Бүрэн зарагдсан</option>
        </select>
      </div>
      {view === "visual" ? (
        <ProjectBuildingExplorer project={project} />
      ) : (
        <>
          <div className="blocks-card-grid">
            {blocks.map((b) => {
              const rows = b.floors.flatMap((f) => f.units);
              const soldCount = rows.filter((u) => u.status === "SOLD").length;
              const prices = rows.flatMap((u) =>
                u.pricePerM2 === null ? [] : [Number(u.pricePerM2)],
              );
              return (
                <article
                  key={b.id}
                  className={`erp-card block-summary ${block?.id === b.id ? "selected" : ""}`}
                >
                  <h2>{b.name}</h2>
                  <p>
                    {b.floors.length} давхар / {rows.length} нэгж
                  </p>
                  <div className="block-stat-strip">
                    <div>
                      Борлуулалт
                      <strong>
                        {percentage(soldCount, rows.length).toFixed(1)}%
                      </strong>
                    </div>
                    <div>
                      Боломжтой
                      <strong>
                        {rows.filter((u) => u.status === "AVAILABLE").length}
                      </strong>
                    </div>
                    <div>
                      м² эхлэх үнэ
                      <strong>
                        {prices.length ? currency(Math.min(...prices)) : "—"}
                      </strong>
                    </div>
                  </div>
                  <progress
                    max={100}
                    value={percentage(soldCount, rows.length)}
                  />
                  <p>
                    {soldCount} / {rows.length} зарагдсан
                  </p>
                  <div className="block-card-actions">
                    <Link
                      href={`/building/manage/${id}/website?tab=facade&block=${b.id}`}
                    >
                      Фасад, давхар засах
                    </Link>
                    <Link
                      href={`/building/manage/${id}/website?tab=units&block=${b.id}`}
                    >
                      Байрны мэдээлэл
                    </Link>
                    <button
                      aria-pressed={block?.id === b.id}
                      onClick={() => setSelected(b.id)}
                    >
                      Байрны бүртгэл
                    </button>
                    <Link
                      href={`/building/manage/${id}/preview?block=${b.id}&floor=${b.floors[0]?.number ?? 1}`}
                    >
                      План харах ↗
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
          {!blocks.length ? (
            <div className="erp-empty">Шүүлтүүрт тохирох блок алга.</div>
          ) : (
            block && <BlockDetails block={block} projectId={id} />
          )}
        </>
      )}
    </>
  );
}
