import { UnitPaymentOptions } from "./UnitPaymentOptions";
import { BuildingBreadcrumbs } from "../website/BuildingBreadcrumbs";
import { buildingPlaceUrl } from "@/features/building/model/building-place-url";
import Link from "next/link";
import { UnitInformationSections } from "./UnitInformationSections";
import { UnitGallery } from "./UnitGallery";
import { ArrowUpRight, Phone } from "lucide-react";
import type { WebsiteProject } from "@mgl/types/building-website";
import { UnitDetailSummary } from "./UnitDetailSummary";
import { UnitMediaViewer } from "./UnitMediaViewer";
import { getUnitDetail } from "./unit-detail-model";
import { UnitDetailWorkspace } from "./UnitDetailWorkspace";
import "./unit-detail.css";
import "./unit-workspace.css";

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
  const blockName = project.blocks.find((block) => block.id === blockId)?.name;
  const back = buildingPlaceUrl(project, preview, blockName, floorNumber);
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
  const { block, entry, content, total, plan } = detail;
  const terms = content.paymentTerms || project.website.content.paymentTerms;
  const phone = project.website.content.phone;
  return (
    <UnitDetailWorkspace
      title={project.title}
      back={back}
      preview={preview}
      hasGallery={content.gallery.length > 0}
      breadcrumbs={
        <BuildingBreadcrumbs
          project={project}
          block={block.name}
          floor={floorNumber}
          unit={entry.unitNo}
          preview={preview}
        />
      }
      overview={
        <div className="unit-detail-hero" id="unit-layout">
          <UnitDetailSummary
            projectId={project.id}
            preview={preview}
            detail={detail}
            floorNumber={floorNumber}
            phone={phone}
            terms={terms}
            editUrl={
              preview
                ? `/building/manage/${project.id}/website?tab=units&block=${blockId}&floor=${floorNumber}&region=${encodeURIComponent(entry.id)}`
                : undefined
            }
          />
          <UnitMediaViewer
            key={`${entry.id}:${floorNumber}`}
            name={entry.label}
            context={`${block.name} блок · ${floorNumber}-р давхар${entry.unitNo ? ` · № ${entry.unitNo}` : ""}`}
            layout2d={content.layout2d || entry.unit?.planImageUrl || ""}
            layout3d={content.layout3d}
            plan={plan}
            regionId={entry.id}
          />
        </div>
      }
      payment={<UnitPaymentOptions total={total} terms={terms} phone={phone} />}
      gallery={<UnitGallery name={entry.label} images={content.gallery} />}
      project={
        <>
          <UnitInformationSections project={project} />
          {phone && (
            <section className="unit-sales-banner">
              <div>
                <p className="unit-detail-eyebrow">ТАНЫ ИРЭЭДҮЙН ГЭР</p>
                <h2>
                  {entry.unitNo ? `№ ${entry.unitNo} байрыг` : "Байрыг"} үзэх,
                  дэлгэрэнгүй мэдээлэл авах
                </h2>
                <p>
                  Борлуулалтын ажилтантай холбогдож төлбөрийн нөхцөл болон үзэх
                  цагаа тохироорой.
                </p>
              </div>
              <a href={`tel:${phone.replace(/[^+\d]/g, "")}`}>
                <Phone size={16} /> {phone}
              </a>
            </section>
          )}
          <footer className="unit-detail-footer">
            <div className="unit-footer-contact">
              <strong>{project.title}</strong>
              <p>{project.address || project.district}</p>
              {project.website.content.email && (
                <a href={`mailto:${project.website.content.email}`}>
                  {project.website.content.email}
                </a>
              )}
            </div>
            <Link href={back}>
              Бусад байртай танилцах <ArrowUpRight size={16} />
            </Link>
          </footer>
        </>
      }
    />
  );
}
