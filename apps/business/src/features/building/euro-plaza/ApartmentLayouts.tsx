"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Maximize2 } from "lucide-react";
import { apartmentLayouts, asset, salesPhones } from "./content";

export function ApartmentLayouts() {
  const [rooms, setRooms] = useState(0);
  const [selectedCode, setSelectedCode] = useState(apartmentLayouts[0].code);
  const visible = apartmentLayouts.filter(
    (layout) => !rooms || layout.rooms === rooms,
  );
  const selected =
    visible.find((layout) => layout.code === selectedCode) ?? visible[0];
  return (
    <section id="layouts" className="euro-section euro-layouts">
      <div className="euro-section-heading">
        <div>
          <p className="euro-eyebrow">03 / ОРОН СУУЦНЫ ТӨЛӨВЛӨЛТ</p>
          <h2>
            Танд тохирох
            <br />
            орон зай.
          </h2>
        </div>
        <p>
          1–3 өрөө · 34.26–71.37 м²
          <br />
          Танилцуулгын 3D зураг. Давхар бүрийн PDF зураглал дахь талбайгаас зөрүүтэй.
        </p>
      </div>
      <div
        className="euro-filters"
        role="group"
        aria-label="Өрөөний тоогоор шүүх"
      >
        {[0, 1, 2, 3].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={rooms === value}
            onClick={() => setRooms(value)}
          >
            {value ? `${value} өрөө` : "Бүх төлөвлөлт"}
          </button>
        ))}
      </div>
      {selected ? (
        <div className="euro-layout-view">
          <div className="euro-plan-image">
            <Image
              key={selected.image}
              src={asset(selected.image)}
              alt={`«${selected.code}» айл — ${selected.rooms} өрөө, ${selected.area.toFixed(2)} м² төлөвлөлт`}
              width={1080}
              height={764}
              sizes="(max-width: 760px) 100vw, 65vw"
            />
            <a
              href={asset(selected.image)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Төлөвлөлтийн зургийг бүтнээр нээх"
            >
              <Maximize2 size={17} /> Томоор харах
            </a>
          </div>
          <div className="euro-plan-details" aria-live="polite">
            <p className="euro-eyebrow">ЕВРО ПЛАЗА / «{selected.code}» АЙЛ</p>
            <h3>
              {selected.area.toFixed(2)} <span>м²</span>
            </h3>
            <p className="euro-room-count">{selected.rooms} өрөө орон сууц</p>
            <dl>
              <div>
                <dt>Төлөвлөлтийн төрөл</dt>
                <dd>«{selected.code}» айл</dd>
              </div>
              <div>
                <dt>Зурагт заасан давхар</dt>
                <dd>4–16</dd>
              </div>
              <div>
                <dt>Үнэ, боломжит байр</dt>
                <dd>Борлуулалтаас лавлах</dd>
              </div>
            </dl>
            <a className="euro-button" href={`tel:${salesPhones[0]}`}>
              Дэлгэрэнгүй лавлах <ArrowUpRight size={18} />
            </a>
            <p className="euro-note">
              Төлөвлөлтийн төрлийг харуулж байна. Тухайн байрны давхар, үнэ,
              борлуулалтын төлөвийг лавлана уу.
            </p>
          </div>
        </div>
      ) : (
        <p role="status">Энэ шүүлтэд тохирох төлөвлөлт алга.</p>
      )}
      <div
        className="euro-plan-options"
        role="group"
        aria-label="Байрны төлөвлөлт сонгох"
      >
        {visible.map((layout) => (
          <button
            type="button"
            key={layout.code}
            aria-pressed={selected?.code === layout.code}
            onClick={() => setSelectedCode(layout.code)}
          >
            <span>
              «{layout.code}» айл <small>{layout.rooms} өрөө</small>
            </span>
            <strong>
              {layout.area.toFixed(2)} <small>м²</small>
            </strong>
          </button>
        ))}
      </div>
    </section>
  );
}
