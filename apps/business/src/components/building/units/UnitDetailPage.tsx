import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, Phone } from "lucide-react";
import type { WebsiteProject } from "@mgl/types/building-website";
import { ProjectStatus } from "../manage/ProjectStatus";
import { UnitMediaViewer } from "./UnitMediaViewer";
import { formatUnitPrice, getUnitDetail } from "./unit-detail-model";
import "./unit-detail.css";

export function UnitDetailPage({
  project,
  blockId,
  floorNumber,
  regionId,
  preview,
}: {
  project: WebsiteProject;
  blockId: string;
  floorNumber: number;
  regionId: string;
  preview: boolean;
}) {
  const base = preview
    ? `/building/manage/${project.id}/preview`
    : `/building/projects/${project.id}`;
  const back = `${base}?block=${blockId}&floor=${floorNumber}&region=${encodeURIComponent(regionId)}`;
  const detail = getUnitDetail(
    project,
    blockId,
    floorNumber,
    regionId,
    !preview,
  );
  if (!detail)
    return (
      <main className="unit-detail unit-detail-empty">
        <h1>Байр олдсонгүй</h1>
        <p>Байрны мэдээлэл өөрчлөгдсөн байж болно.</p>
        <Link href={back}>Давхар руу буцах</Link>
      </main>
    );
  const { block, entry, content, area, rate, total, plan } = detail;
  const terms = content.paymentTerms || project.website.content.paymentTerms;
  const phone = project.website.content.phone;
  return (
    <main className="unit-detail">
      <header className="unit-detail-header">
        <Link href={back}>
          <ArrowLeft size={18} /> Давхар руу буцах
        </Link>
        <span>{project.title}</span>
        <small>{preview ? "УРЬДЧИЛАН ХАРАХ" : "БАЙРНЫ ДЭЛГЭРЭНГҮЙ"}</small>
      </header>
      <div className="unit-detail-hero">
        <section className="unit-detail-copy">
          <p className="unit-detail-eyebrow">
            {block.name} блок ·{" "}
            {floorNumber < 0 ? `B${-floorNumber}` : `${floorNumber}-р давхар`}
          </p>
          <h1>{entry.label}</h1>
          {entry.unitNo && (
            <p className="unit-detail-number">№ {entry.unitNo}</p>
          )}
          <div className="unit-detail-spec">
            <strong>
              {area ?? "—"}
              <small>м²</small>
            </strong>
            <span>
              {entry.rooms !== null
                ? `${entry.rooms} өрөө`
                : "Өрөөний мэдээлэл нэмэгдэнэ"}
            </span>
          </div>
          {entry.unit ? (
            <ProjectStatus status={entry.unit.status} />
          ) : (
            <p>Борлуулалтын мэдээлэл нэмэгдэнэ.</p>
          )}
          <section
            className="unit-detail-pricing"
            aria-label="Үнэ, төлбөрийн нөхцөл"
          >
            <dl>
              <div>
                <dt>1 м²-ийн үнэ</dt>
                <dd>{formatUnitPrice(rate)}</dd>
              </div>
              <div>
                <dt>Нийт үнэ</dt>
                <dd>{formatUnitPrice(total)}</dd>
              </div>
            </dl>
            {terms && <p>{terms}</p>}
            {phone ? (
              <a
                className="unit-detail-contact"
                href={`tel:${phone.replace(/[^+\d]/g, "")}`}
              >
                <Phone size={18} /> Борлуулалттай холбогдох{" "}
                <ArrowUpRight size={18} />
              </a>
            ) : (
              <p>Холбоо барих мэдээлэл удахгүй нэмэгдэнэ.</p>
            )}
          </section>
          {preview && (
            <Link
              className="unit-detail-edit"
              href={`/building/manage/${project.id}/website?tab=units&block=${blockId}&floor=${floorNumber}&region=${encodeURIComponent(entry.id)}`}
            >
              Энэ байрны мэдээллийг засах →
            </Link>
          )}
        </section>
        <UnitMediaViewer
          name={entry.label}
          layout2d={content.layout2d || entry.unit?.planImageUrl || ""}
          layout3d={content.layout3d}
          plan={plan}
          regionId={entry.id}
        />
      </div>
      {content.description && (
        <section className="unit-detail-description">
          <p className="unit-detail-eyebrow">ТАНЫ ОРОН ЗАЙ</p>
          <h2>Байрны танилцуулга</h2>
          <p>{content.description}</p>
        </section>
      )}
      {!!content.gallery.length && (
        <section
          className="unit-detail-gallery"
          aria-label="Байрны зургийн цомог"
        >
          {content.gallery.map((url, index) => (
            <Image
              key={url}
              src={url}
              alt={`${entry.label} интерьер ${index + 1}`}
              width={1200}
              height={850}
              unoptimized
              loading="lazy"
            />
          ))}
        </section>
      )}
    </main>
  );
}
