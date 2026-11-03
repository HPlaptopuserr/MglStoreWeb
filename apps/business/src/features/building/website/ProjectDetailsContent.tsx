import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import type { WebsiteProject } from "@mgl/types/building-website";
import { buildingPlaceUrl } from "@/features/building/model/building-place-url";
import { ProjectBlockSelection } from "./ProjectBlockSelection";

/** The complete project information, preserved on its own page. */
export function ProjectDetailsContent({
  project,
  preview = false,
}: {
  project: WebsiteProject;
  preview?: boolean;
}) {
  const c = project.website.content;
  const base = buildingPlaceUrl(project, preview);
  const floors = project.blocks.flatMap((block) => block.floors);
  const units = floors.flatMap((floor) => floor.units);
  const areas = units.flatMap((unit) =>
    unit.areaM2 ? [Number(unit.areaM2)] : [],
  );
  return (
    <>
      <header className="euro-section project-details-heading">
        <Link href={base} className="euro-text-link">
          ← Төслийн нүүр
        </Link>
        <p className="euro-eyebrow">ТӨСЛИЙН ДЭЛГЭРЭНГҮЙ</p>
        <h1>{project.title}</h1>
      </header>
      <section className="euro-facts">
        {[
          [String(project.blocks.length), "БЛОК"],
          [String(floors.length), "БҮРТГЭЛТЭЙ ДАВХАР"],
          [String(units.length), "НЭГЖ"],
          [
            areas.length ? `${Math.min(...areas)}–${Math.max(...areas)}` : "—",
            "М² ТАЛБАЙ",
          ],
        ].map(([v, label]) => (
          <div key={label}>
            <strong>{v}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>
      <section id="about" className="euro-section managed-about">
        <div>
          <p className="euro-eyebrow">ТӨСЛИЙН ТУХАЙ</p>
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
              className="euro-text-link"
            >
              <MapPin size={16} />
              Газрын зураг дээр харах
            </a>
          )}
        </div>
      </section>
      {c.amenities.length > 0 && (
        <section className="euro-section managed-amenities">
          <p className="euro-eyebrow">ТӨСЛИЙН ДАВУУ ТАЛ</p>
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
        <section id="gallery" className="euro-section managed-gallery">
          <p className="euro-eyebrow">ЗУРГИЙН ЦОМОГ</p>
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
      <ProjectBlockSelection project={project} base={base} />
      {c.paymentTerms && (
        <section className="euro-section managed-payment">
          <p className="euro-eyebrow">ТӨЛБӨРИЙН НӨХЦӨЛ</p>
          <h2>Танд тохирох нөхцөл.</h2>
          <p>{c.paymentTerms}</p>
        </section>
      )}
      {c.faqs.length > 0 && (
        <section className="euro-section residence-questions">
          <div>
            <p className="euro-eyebrow">АСУУЛТ, ХАРИУЛТ</p>
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
        <p className="euro-eyebrow">ХОЛБОО БАРИХ</p>
        <h2>Таны шинэ эхлэл.</h2>
        <div className="managed-contact">
          {c.phone && (
            <a
              href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}
              className="euro-button"
            >
              <Phone size={16} />
              {c.phone}
            </a>
          )}
          {c.email && (
            <a href={`mailto:${c.email}`} className="euro-text-link">
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
    </>
  );
}
