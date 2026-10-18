import { ProjectMasterplanView } from "../masterplan/ProjectMasterplanView";
import { ProjectBuildingExplorer } from "./ProjectBuildingExplorer";
import Image from "next/image";
import Link from "next/link";
import type { WebsiteProject } from "@mgl/types/building-website";
import { ArrowUpRight, MapPin, Phone, Mail } from "lucide-react";
import { ProjectNavigation } from "../project/ProjectNavigation";
import "../project/project.css";
import "./managed-site.css";
export function ManagedProjectSite({
  project,
  preview = false,
}: {
  project: WebsiteProject;
  preview?: boolean;
}) {
  const c = project.website.content,
    base = preview
      ? `/building/manage/${project.id}/preview`
      : `/building/projects/${project.id}`,
    image = c.heroImageUrl || project.coverImageUrl;
  const floors = project.blocks.flatMap((block) => block.floors),
    units = floors.flatMap((floor) => floor.units),
    areas = units.flatMap((unit) => (unit.areaM2 ? [Number(unit.areaM2)] : []));
  return (
    <div className="residence">
      <ProjectNavigation title={project.title} href={base} />
      {preview && (
        <div className="website-preview-label">
          Удирдлагын урьдчилан харах · {project.status} · Нийтлэгдээгүй нэгжүүд
          мөн харагдана
        </div>
      )}
      <main>
        <section className="residence-hero">
          {image && (
            <Image
              src={image}
              alt={project.title}
              fill
              unoptimized
              priority
              className="residence-hero-image"
            />
          )}
          <div className="residence-hero-shade" />
          <div className="residence-hero-content">
            <p className="residence-eyebrow">
              <span />
              {c.eyebrow ||
                [project.district, project.address]
                  .filter(Boolean)
                  .join(" · ") ||
                project.title}
            </p>
            <h1>{c.heroTitle || project.title}</h1>
            <p className="residence-hero-description">
              {c.heroSubtitle || project.description}
            </p>
            <a href="#choose-floor" className="residence-button">
              Байр, талбай сонгох
              <ArrowUpRight size={18} />
            </a>
          </div>
          <div className="residence-hero-bottom">
            <span>{project.title}</span>
            {!image && <span>Нүүр зураг оруулаагүй байна</span>}
            <a href="#about">Төслийн тухай ↓</a>
          </div>
        </section>
        {project.website.masterplan?.image && <section id="choose-block" className="residence-section"><ProjectMasterplanView project={project} value={project.website.masterplan} base={base} /></section>}
        <section className="residence-facts">
          {[
            [String(project.blocks.length), "БЛОК"],
            [String(floors.length), "БҮРТГЭЛТЭЙ ДАВХАР"],
            [String(units.length), "НЭГЖ"],
            [
              areas.length
                ? `${Math.min(...areas)}–${Math.max(...areas)}`
                : "—",
              "М² ТАЛБАЙ",
            ],
          ].map(([v, label]) => (
            <div key={label}>
              <strong>{v}</strong>
              <span>{label}</span>
            </div>
          ))}
        </section>
        <section id="about" className="residence-section managed-about">
          <div>
            <p className="residence-eyebrow">ТӨСЛИЙН ТУХАЙ</p>
            <h2>{c.aboutTitle || project.title}</h2>
            <p>
              {c.aboutText ||
                project.description ||
                "Танилцуулга удахгүй нэмэгдэнэ."}
            </p>
          </div>
          <div>
            <dl>
              {[
                [
                  "Байршил",
                  [project.district, project.address]
                    .filter(Boolean)
                    .join(" · ") || "Мэдээлэл оруулаагүй",
                ],
                [
                  "Барилгын явц",
                  (
                    {
                      PLANNED: "Төлөвлөсөн",
                      UNDER_CONSTRUCTION: "Баригдаж буй",
                      COMPLETED: "Дууссан",
                      HANDED_OVER: "Хүлээлгэн өгсөн",
                    } as Record<string, string>
                  )[project.constructionStatus] || project.constructionStatus,
                ],
                [
                  "Ашиглалтад орох хугацаа",
                  c.completionLabel || "Мэдээлэл оруулаагүй",
                ],
              ].map(([label, v]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {c.mapUrl && (
              <a
                href={c.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="residence-text-link"
              >
                <MapPin size={16} />
                Газрын зураг дээр харах
              </a>
            )}
          </div>
        </section>
        {c.amenities.length > 0 && (
          <section className="residence-section managed-amenities">
            <p className="residence-eyebrow">ТӨСЛИЙН ДАВУУ ТАЛ</p>
            <div>
              {c.amenities.map((item, i) => (
                <article key={i}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>
        )}
        {c.gallery.length > 0 && (
          <section id="gallery" className="residence-section managed-gallery">
            <p className="residence-eyebrow">ЗУРГИЙН ЦОМОГ</p>
            <h2>Төслийн дүр төрх</h2>
            <div>
              {c.gallery.map((item, i) => (
                <figure key={i}>
                  <div>
                    <Image
                      src={item.url}
                      alt={item.caption || `${project.title} — зураг ${i + 1}`}
                      fill
                      unoptimized
                      sizes="(max-width:760px) 100vw, 50vw"
                    />
                  </div>
                  <figcaption>{item.caption}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
        <section id="choose-floor" className="residence-section">
          <ProjectBuildingExplorer project={project} publicBase={base} />
        </section>
        {c.paymentTerms && (
          <section className="residence-section managed-payment">
            <p className="residence-eyebrow">ТӨЛБӨРИЙН НӨХЦӨЛ</p>
            <h2>Танд тохирох нөхцөл.</h2>
            <p>{c.paymentTerms}</p>
          </section>
        )}
        {c.faqs.length > 0 && (
          <section className="residence-section residence-questions">
            <div>
              <p className="residence-eyebrow">АСУУЛТ, ХАРИУЛТ</p>
              <h2>Мэдэхэд илүүдэхгүй.</h2>
            </div>
            <div>
              {c.faqs.map((item, i) => (
                <details key={i}>
                  <summary>
                    {item.question}
                    <span>+</span>
                  </summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}
        <section className="residence-final-cta">
          <p className="residence-eyebrow">ХОЛБОО БАРИХ</p>
          <h2>Таны шинэ эхлэл.</h2>
          <div className="managed-contact">
            {c.phone && (
              <a
                href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}
                className="residence-button"
              >
                <Phone size={16} />
                {c.phone}
              </a>
            )}
            {c.email && (
              <a href={`mailto:${c.email}`} className="residence-text-link">
                <Mail size={16} />
                {c.email}
              </a>
            )}
            {!c.phone && !c.email && (
              <p>
                Борлуулалтын холбоо барих мэдээлэл хараахан нэмэгдээгүй байна.
              </p>
            )}
          </div>
        </section>
      </main>
      <footer className="residence-footer">
        <span>{project.title}</span>
        <Link href="/building">Бүх төслүүд</Link>
        <span>MGL Business</span>
      </footer>
    </div>
  );
}
