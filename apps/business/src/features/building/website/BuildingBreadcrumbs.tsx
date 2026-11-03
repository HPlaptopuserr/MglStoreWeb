import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buildingPlaceUrl } from "@/features/building/model/building-place-url";
import type { WebsiteProject } from "@mgl/types/building-website";

export function BuildingBreadcrumbs({
  project,
  block,
  floor,
  unit,
  preview,
}: {
  project: WebsiteProject;
  block: string;
  floor: number;
  unit?: string;
  preview: boolean;
}) {
  const items = [
    { label: project.title, href: buildingPlaceUrl(project, preview) },
    { label: `${block} блок`, href: buildingPlaceUrl(project, preview, block) },
    {
      label: `${floor}-р давхар`,
      href: buildingPlaceUrl(project, preview, block, floor),
    },
    ...(unit ? [{ label: `№ ${unit}`, href: "" }] : []),
  ];
  return (
    <nav
      className="building-place-breadcrumbs"
      aria-label="Хотхон, блок, давхар, тоот"
    >
      <ol>
        {items.map((item, index) => (
          <li key={item.label}>
            {index > 0 && <ChevronRight size={13} aria-hidden="true" />}
            {index === items.length - 1 ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <Link href={item.href}>{item.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
