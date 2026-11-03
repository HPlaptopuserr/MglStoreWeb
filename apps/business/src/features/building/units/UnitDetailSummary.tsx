import { unitRoomCount } from "@mgl/types/building-website";
import { UnitRoomInteriors } from "./UnitRoomInteriors";
import Link from "next/link";
import { ArrowUpRight, Phone } from "lucide-react";
import { ProjectStatus } from "../management/ProjectStatus";
import { UnitInquiryButton } from "./UnitInquiryButton";
import { formatUnitPrice, type getUnitDetail } from "./unit-detail-model";

interface UnitDetailSummaryProps {
  projectId: string;
  preview: boolean;
  detail: NonNullable<ReturnType<typeof getUnitDetail>>;
  floorNumber: number;
  phone: string;
  terms: string;
  editUrl?: string;
}

export function UnitDetailSummary({
  detail,
  projectId,
  preview,
  floorNumber,
  phone,
  terms,
  editUrl,
}: UnitDetailSummaryProps) {
  const { block, entry, content, area, rate, total } = detail;
  const rooms =
    unitRoomCount(entry.rooms, entry.label) ??
    content.roomInteriors?.length ??
    0;
  return (
    <section className="unit-detail-copy">
      <p className="unit-detail-eyebrow">
        {block.name} блок ·{" "}
        {floorNumber < 0 ? `B${-floorNumber}` : `${floorNumber}-р давхар`}
      </p>
      <h1>{entry.label}</h1>
      {entry.unitNo && <p className="unit-detail-number">№ {entry.unitNo}</p>}
      <dl className="unit-detail-spec">
        <div>
          <dt>Нийт талбай</dt>
          <dd>
            {area ?? "—"}
            <small>м²</small>
          </dd>
        </div>
        <div>
          <dt>Өрөө</dt>
          <dd>{rooms || "—"}</dd>
        </div>
        <div>
          <dt>Давхар</dt>
          <dd>{floorNumber < 0 ? `B${-floorNumber}` : floorNumber}</dd>
        </div>
      </dl>
      {entry.unit ? (
        <ProjectStatus status={entry.unit.status} />
      ) : (
        <p>Борлуулалтын мэдээлэл нэмэгдэнэ.</p>
      )}
      <UnitRoomInteriors
        count={rooms}
        rooms={content.roomInteriors ?? []}
        editUrl={editUrl}
      />
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
        <div className="unit-contact-actions">
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
          {entry.unit && (
            <UnitInquiryButton
              projectId={projectId}
              unitId={entry.unit.id}
              context={`${block.name} блок · ${floorNumber}-р давхар · № ${entry.unitNo ?? entry.label}`}
              preview={preview}
            />
          )}
        </div>
      </section>
      {content.description && (
        <details className="unit-copy-description">
          <summary>Байрны танилцуулга</summary>
          <p>{content.description}</p>
        </details>
      )}
      {editUrl && (
        <Link className="unit-detail-edit" href={editUrl}>
          Энэ байрны мэдээллийг засах →
        </Link>
      )}
    </section>
  );
}
