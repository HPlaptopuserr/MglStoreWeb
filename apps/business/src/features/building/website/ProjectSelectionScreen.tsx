"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Expand,
  Minus,
  Plus,
} from "lucide-react";
import type { MasterplanSelection } from "../masterplan/masterplan-selection.types";
import { MasterplanBlockPin } from "../masterplan/MasterplanBlockPin";
import { useMasterplanViewport } from "../masterplan/useMasterplanViewport";

export function ProjectSelectionScreen({
  project,
  base,
  preview,
}: {
  project: MasterplanSelection;
  base: string;
  preview: boolean;
}) {
  const map = project.masterplan;
  const {
    viewportRef,
    geometry,
    loaded,
    failed,
    zoom,
    mode,
    onImageLoad,
    onImageError,
    zoomIn,
    zoomOut,
    fit,
    dragHandlers,
  } = useMasterplanViewport();
  const pins =
    map?.pins.filter((pin) =>
      project.blocks.some((block) => block.id === pin.blockId),
    ) ?? [];
  const hasImage = Boolean(map?.image) && !failed;

  return (
    <main
      className="project-selection-screen"
      aria-labelledby="selection-title"
    >
      <div
        className="selection-map-viewport"
        ref={viewportRef}
        tabIndex={hasImage ? 0 : -1}
        role="region"
        aria-label="Хотхоны зураглал. Зургийг чирж хөдөлгөх эсвэл сумтай товчоор гүйлгэнэ."
        {...dragHandlers}
      >
        {hasImage && map && (
          <div
            className="selection-map-space"
            style={{ width: geometry.spaceWidth, height: geometry.spaceHeight }}
          >
            <div
              className="selection-map-image"
              style={{
                width: geometry.width,
                height: geometry.height,
                left: geometry.left,
                top: geometry.top,
              }}
            >
              <Image
                src={map.image}
                alt={`${project.title} хотхоны ерөнхий төлөвлөгөө`}
                fill
                priority
                unoptimized
                sizes="100vw"
                draggable={false}
                onLoad={(event) => onImageLoad(event.currentTarget)}
                onError={onImageError}
              />
              {loaded &&
                pins.map((pin) => {
                  const block = project.blocks.find(
                    (item) => item.id === pin.blockId,
                  );
                  return block ? (
                    <MasterplanBlockPin
                      key={pin.blockId}
                      block={block}
                      x={pin.x}
                      y={pin.y}
                      base={base}
                    />
                  ) : null;
                })}
            </div>
          </div>
        )}
      </div>
      <div className="selection-map-shade" aria-hidden="true" />
      <header className="selection-page-heading">
        <Link className="selection-back" href={base}>
          <ArrowLeft size={16} aria-hidden="true" />
          Буцах
        </Link>
        <p className="selection-project-name">
          {project.title}
          {preview && <span>Урьдчилан харах</span>}
        </p>
        <h1 id="selection-title">Орон сууц сонгох</h1>
        <p>
          Зураг дээрх блокоо сонгоод
          <br />
          давхар, байраа сонгоорой.
        </p>
      </header>
      {hasImage && !loaded && (
        <p className="selection-map-loading" role="status">
          Хотхоны зураг ачаалж байна…
        </p>
      )}
      {!hasImage && (
        <div className="selection-map-empty" role="status">
          <Building2 size={40} aria-hidden="true" />
          <p>
            {failed
              ? "Хотхоны зургийг ачаалж чадсангүй."
              : "Хотхоны зураг хараахан нэмэгдээгүй байна."}
          </p>
          <p>Доорх жагсаалтаас блокоо сонгоно уу.</p>
          {failed && (
            <button onClick={() => window.location.reload()}>
              Дахин оролдох
            </button>
          )}
        </div>
      )}
      {hasImage && (
        <div className="selection-map-controls" aria-label="Зургийн хэмжээ">
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= 2.5}
            aria-label="Зураг томруулах"
          >
            <Plus size={20} />
          </button>
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= 0.5}
            aria-label="Зураг жижигрүүлэх"
          >
            <Minus size={20} />
          </button>
          <button
            type="button"
            onClick={fit}
            aria-label={
              mode === "fill"
                ? "Зургийг бүтнээр харах"
                : "Зургийг дэлгэц дүүргэж харах"
            }
            aria-pressed={mode === "fit"}
          >
            <Expand size={19} />
          </button>
        </div>
      )}
      <footer className="selection-page-footer">
        <span>
          Блок <ArrowRight size={12} /> Давхар <ArrowRight size={12} /> Байр
        </span>
        <details
          className="selection-block-list"
          open={!hasImage || !pins.length}
        >
          <summary>
            <Building2 size={16} aria-hidden="true" />
            Блокууд ({project.blocks.length})
          </summary>
          <nav aria-label="Блок сонгох">
            {project.blocks.map((block) => (
              <Link
                key={block.id}
                href={`${base}/${encodeURIComponent(block.name)}`}
              >
                <span>
                  {block.name} блок<small>{block.floorCount} давхар</small>
                </span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ))}
            {!project.blocks.length && (
              <p>Блокийн мэдээлэл удахгүй нэмэгдэнэ.</p>
            )}
          </nav>
        </details>
      </footer>
    </main>
  );
}
