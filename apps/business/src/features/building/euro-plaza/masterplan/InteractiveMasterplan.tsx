"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ArrowDown, MousePointer2 } from "lucide-react";
import { asset } from "../content";
import { BlockHoverCard } from "./BlockHoverCard";
const BlockElevationView = dynamic(() => import("./BlockElevationView"), {
  ssr: false,
});
import {
  mapBlocks,
  type MapBlock,
  type MasterplanInventory,
} from "./inventory";
import "./masterplan.css";
import "./elevation-view.css";
import "./floor-plan-explorer.css";

export function InteractiveMasterplan({
  inventory,
}: {
  inventory: MasterplanInventory;
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const [imageState, setImageState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const active = mapBlocks.find((block) => block.key === activeKey);
  function selectBlock(marker: MapBlock) {
    if (activeKey !== marker.key) {
      setActiveKey(marker.key);
    }
  }
  function closePanel() {
    const previous = activeKey;
    setActiveKey(null);
    setPreviewDismissed(true);
    if (previous) buttons.current.get(previous)?.focus({ preventScroll: true });
  }
  return (
    <section
      id="choose-block"
      className="masterplan-section"
      aria-labelledby="masterplan-heading"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          closePanel();
        }
      }}
    >
      <div className="masterplan-heading">
        <div>
          <p className="euro-eyebrow">БЛОК → ДАВХАР → БАЙР</p>
          <h2 id="masterplan-heading">Орон сууцаа сонгох</h2>
          <p>
            Блок дээр хулганаа аваачиж товч мэдээлэл, товшиж дэлгэрэнгүйг
            хараарай.
          </p>
        </div>
        <a href="#layouts">
          Байрны төлөвлөлт <ArrowDown size={16} />
        </a>
      </div>
      <div className="masterplan-toolbar">
        <span>
          <MousePointer2 size={15} />{" "}
          {active
            ? `${active.label} блок сонгосон`
            : "Зураг дээрээс блок сонгоорой"}
        </span>
        <span className="masterplan-data-label">
          {inventory.mode === "provisional"
            ? "Евро Плаза · Танилцуулгын мэдээлэл"
            : inventory.mode === "error"
              ? "Мэдээлэл ачаалахад алдаа гарлаа"
              : "Нийтлэгдсэн байрны бүртгэл"}
        </span>
      </div>
      <div className={`masterplan-workspace${active ? " has-selection" : ""}`}>
        <div
          className="masterplan-image-scroll"
          tabIndex={0}
          aria-label="Хотхоны интерактив зураг. Жижиг дэлгэц дээр хажуу тийш гүйлгэнэ."
        >
          <div
            className="masterplan-canvas"
            aria-busy={imageState === "loading"}
          >
            <Image
              src={asset("vision.png")}
              alt="Хотхоны ерөнхий төлөвлөлт. Хамгийн урд барилга нь Евро Плаза."
              width={1672}
              height={941}
              sizes="(max-width: 760px) 900px, 100vw"
              onLoad={() => setImageState("ready")}
              onError={() => setImageState("error")}
            />
            {imageState === "loading" && (
              <span className="masterplan-image-status" role="status">
                Зураг ачаалж байна…
              </span>
            )}
            {imageState === "error" && (
              <p className="masterplan-image-status" role="alert">
                Зураг ачаалсангүй. Доорх жагсаалтаас блок сонгоно уу.
              </p>
            )}
            {imageState !== "error" &&
              mapBlocks.map((marker) => (
                <div
                  key={marker.key}
                  className={`masterplan-pin${marker.y > 50 ? " preview-above" : ""}${marker.x > 65 ? " preview-left" : ""}${previewDismissed || activeKey ? " preview-hidden" : ""}`}
                  style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                  onPointerEnter={() => setPreviewDismissed(false)}
                >
                  <button
                    ref={(element) => {
                      if (element) buttons.current.set(marker.key, element);
                      else buttons.current.delete(marker.key);
                    }}
                    type="button"
                    className={`masterplan-marker${inventory.blocks[marker.key] ? " has-data" : ""}`}
                    aria-describedby={
                      !previewDismissed && !activeKey
                        ? `block-preview-${marker.key}`
                        : undefined
                    }
                    aria-label={`${marker.label} блок${inventory.blocks[marker.key] ? ", мэдээлэлтэй" : ", бүртгэл хүлээгдэж байна"}`}
                    aria-expanded={activeKey === marker.key}
                    aria-controls={
                      activeKey === marker.key ? "elevation-title" : undefined
                    }
                    onClick={() => selectBlock(marker)}
                    onBlur={() => setPreviewDismissed(false)}
                  >
                    {marker.label}
                    <span className="masterplan-marker-stem" />
                  </button>
                  <BlockHoverCard
                    marker={marker}
                    block={inventory.blocks[marker.key]}
                  />
                </div>
              ))}
            <span className="masterplan-image-credit">
              MGL RESIDENCES · ЕРӨНХИЙ ТӨЛӨВЛӨЛТ
            </span>
          </div>
        </div>
        {active && (
          <BlockElevationView
            marker={active}
            block={inventory.blocks[active.key]}
            onClose={closePanel}
          />
        )}
      </div>
      <div
        className="masterplan-block-list"
        role="group"
        aria-label="Блокийн жагсаалт"
      >
        {mapBlocks.map((marker) => (
          <button
            key={marker.key}
            type="button"
            aria-pressed={activeKey === marker.key}
            onClick={() => selectBlock(marker)}
          >
            {marker.label}
            {inventory.blocks[marker.key] && <span> · Мэдээлэлтэй</span>}
          </button>
        ))}
      </div>
      <p className="masterplan-help">
        Евро Плаза — хамгийн урд барилга. Бусад блокийн дугаар түр
        тэмдэглэгээтэй. Зураг дээрх товчийг дарж мэдээллийг нээлттэй байлгана.
        Хаах: Esc.
        {inventory.mode === "provisional" &&
          " Евро Плазагийн илгээсэн мэдээллийг оруулсан."}
      </p>
    </section>
  );
}
