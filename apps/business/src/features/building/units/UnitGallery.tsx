"use client";
import { useState } from "react";
import { BuildingDialog } from "../management/BuildingDialog";
import Image from "next/image";

export function UnitGallery({
  name,
  images,
}: {
  name: string;
  images: string[];
}) {
  const [selected, setSelected] = useState<number | null>(null);
  if (!images.length) return null;
  return (
    <section
      id="unit-gallery"
      className="unit-gallery-section"
      aria-labelledby="unit-gallery-title"
    >
      <header className="unit-section-title">
        <div>
          <p className="unit-detail-eyebrow">ОРОН ЗАЙН МЭДРЭМЖ</p>
          <h2 id="unit-gallery-title">Интерьер зураг</h2>
        </div>
        <span>{String(images.length).padStart(2, "0")} зураг</span>
      </header>
      <div className="unit-detail-gallery">
        {images.map((url, index) => (
          <figure key={`${url}-${index}`}>
            <button type="button" className="unit-gallery-open" aria-label={`Зураг ${index + 1} томруулах`} onClick={() => setSelected(index)}>
            <Image
              src={url}
              alt={`${name} · зураг ${index + 1}`}
              width={1400}
              height={1000}
              unoptimized
              loading="lazy"
            />
            </button>
            <figcaption>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {name}
            </figcaption>
          </figure>
        ))}
      </div>
      {selected !== null && <BuildingDialog title={`${name} · Интерьер зураг`} subtitle={`${selected + 1} / ${images.length}`} onClose={() => setSelected(null)}>
        <Image className="unit-gallery-preview" src={images[selected]} alt={`${name} · зураг ${selected + 1}`} width={1600} height={1200} unoptimized />
      </BuildingDialog>}
    </section>
  );
}
