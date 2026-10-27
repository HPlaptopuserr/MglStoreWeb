import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Building2 } from "lucide-react";
import type { WebsiteProject } from "@mgl/types/building-website";
import { ProjectMasterplanView } from "../masterplan/ProjectMasterplanView";
import "./project-block-selection.css";

/** All counts and images come from the same managed project as its public page. */
export function ProjectBlockSelection({
  project,
  base,
}: {
  project: WebsiteProject;
  base: string;
}) {
  const masterplan = project.website.masterplan;
  return (
    <section id="choose-block" className="euro-section public-block-selection">
      <header className="public-block-heading">
        <div>
          <p className="euro-eyebrow">02 / БЛОК → ДАВХАР → БАЙР</p>
          <h2>Өөрийн байраа сонгох</h2>
        </div>
        <p>
          Блокоо сонгоод давхар, байрны талбай болон борлуулалтын төлөвийг
          хараарай.
        </p>
      </header>
      {masterplan?.image && (
        <ProjectMasterplanView
          project={project}
          value={masterplan}
          base={base}
        />
      )}
      {project.blocks.length ? (
        <div className="public-block-grid">
          {project.blocks.map((block) => {
            const units = block.floors.flatMap((floor) => floor.units);
            const available = units.filter(
              (unit) => unit.status === "AVAILABLE",
            ).length;
            const sold = units.filter((unit) => unit.status === "SOLD").length;
            const image = project.website.facadesByBlock?.[block.id]?.image;
            return (
              <Link
                key={block.id}
                href={`${base}/${encodeURIComponent(block.name)}`}
                className="public-block-card"
              >
                <div className="public-block-image">
                  {image ? (
                    <Image
                      src={image}
                      alt={`${block.name} барилгын зураг`}
                      fill
                      unoptimized
                      sizes="(max-width:760px) 100vw, 33vw"
                    />
                  ) : (
                    <Building2 size={48} strokeWidth={1} aria-hidden="true" />
                  )}
                </div>
                <div className="public-block-copy">
                  <h3>
                    {block.name}
                    <ArrowUpRight size={20} />
                  </h3>
                  <p>
                    {block.floors.length} давхар · {units.length} байр, талбай
                  </p>
                  <div className="public-block-status">
                    <span>{available} боломжтой</span>
                    <span>{sold} зарагдсан</span>
                  </div>
                  <span className="public-block-action">Давхар сонгох →</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p role="status">Блокийн мэдээлэл удахгүй нэмэгдэнэ.</p>
      )}
    </section>
  );
}
