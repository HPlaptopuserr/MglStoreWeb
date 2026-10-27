import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { apartmentLayouts, asset } from "../content";

export function BlockLayoutList() {
  return (
    <details className="masterplan-layout-list">
      <summary>Байрны төлөвлөлт · {apartmentLayouts.length} төрөл</summary>
      <div>
        {apartmentLayouts.map((layout) => (
          <a
            key={layout.code}
            href={asset(layout.image)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`«${layout.code}» айл, ${layout.rooms} өрөө, ${layout.area.toFixed(2)} м² — зургийг нээх`}
          >
            <Image
              src={asset(layout.image)}
              alt={`«${layout.code}» айлын план`}
              width={70}
              height={50}
              sizes="70px"
            />
            <span>
              <strong>
                «{layout.code}» айл · {layout.rooms} өрөө
              </strong>
              <small>{layout.area.toFixed(2)} м²</small>
            </span>
            <ArrowUpRight size={14} />
          </a>
        ))}
      </div>
    </details>
  );
}
