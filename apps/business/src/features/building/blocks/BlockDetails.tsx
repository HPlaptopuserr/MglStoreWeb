import Link from "next/link";
import type { WebsiteProject } from "@mgl/types/building-website";
import { InventoryDashboard } from "../management/InventoryDashboard";
type Block = WebsiteProject["blocks"][number];
export function BlockDetails({
  block,
  projectId,
}: {
  block: Block;
  projectId: string;
}) {
  return (
    <section className="erp-card block-details">
      <header className="erp-section-heading">
        <div>
          <p className="erp-eyebrow">СОНГОСОН БЛОК</p>
          <h2>{block.name} · Нарийвчилсан менежмент</h2>
          <p>{block.floors.length} давхар · Байрны нэгдсэн бүртгэл</p>
        </div>
        <div className="erp-actions">
          <Link
            href={`/building/manage/${projectId}/website?tab=facade&block=${block.id}`}
          >
            Фасад, давхар засах
          </Link>
          <Link
            href={`/building/manage/${projectId}/website?tab=units&block=${block.id}`}
          >
            Байрны мэдээлэл
          </Link>
          <Link href={`/building/manage/${projectId}/edit`}>
            Блок засварлах
          </Link>
          <Link href={`/building/manage/${projectId}/plans/${block.id}`}>
            План засах
          </Link>
        </div>
      </header>
      <InventoryDashboard
        key={`${projectId}:${block.id}`}
        scope={{ project: projectId, block: block.id }}
      />
    </section>
  );
}
