"use client";
import { useState } from "react";
import Image from "next/image";
import { Expand, Minus, Plus } from "lucide-react";
import type { FloorPlan } from "@mgl/types/building-plans";
import { BuildingDialog } from "../manage/BuildingDialog";

export function UnitMediaViewer({
  name,
  layout2d,
  layout3d,
  plan,
  regionId,
}: {
  name: string;
  layout2d: string;
  layout3d: string;
  plan?: FloorPlan;
  regionId: string;
}) {
  const options = [
    ...(layout3d ? [{ id: "3d", label: "3D зураг", image: layout3d }] : []),
    ...(layout2d ? [{ id: "2d", label: "2D план", image: layout2d }] : []),
    ...(plan ? [{ id: "floor", label: "Давхар дахь байрлал", image: "" }] : []),
  ];
  const [mode, setMode] = useState(options[0]?.id ?? "");
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState("");
  const selected = options.find((item) => item.id === mode) ?? options[0];
  const shape = plan?.shapes.find((item) => item.id === regionId);
  const visual = selected?.image ? (
    failed === selected.image ? (
      <p role="alert">Зураг ачаалж чадсангүй.</p>
    ) : (
      <Image
        src={selected.image}
        alt={`${name} · ${selected.label}`}
        width={1200}
        height={1000}
        unoptimized
        onError={() => setFailed(selected.image)}
      />
    )
  ) : plan ? (
    <svg
      viewBox="0 0 1000 800"
      role="img"
      aria-label={`${name} байрны давхар дахь байрлал`}
    >
      {plan.background && (
        <image
          href={plan.background}
          width={1000}
          height={800}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
      {shape && (
        <polygon
          points={shape.points
            .map((point) => `${point.x},${point.y}`)
            .join(" ")}
          fill="#d8bd8466"
          stroke="#eacf8e"
          strokeWidth={4}
        />
      )}
    </svg>
  ) : (
    <p>Байрны зураг удахгүй нэмэгдэнэ.</p>
  );
  return (
    <section className="unit-media" aria-label="Байрны зураг">
      <div className="unit-media-tabs" role="group" aria-label="Зургийн төрөл">
        {options.map((option) => (
          <button
            key={option.id}
            aria-pressed={selected?.id === option.id}
            onClick={() => {
              setMode(option.id);
              setZoom(1);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="unit-media-viewport">
        <div style={{ transform: `scale(${zoom})` }}>{visual}</div>
      </div>
      {selected && (
        <div className="unit-media-controls">
          <button
            aria-label="Жижигрүүлэх"
            disabled={zoom <= 1}
            onClick={() => setZoom((value) => Math.max(1, value - 0.25))}
          >
            <Minus size={18} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            aria-label="Томруулах"
            disabled={zoom >= 2}
            onClick={() => setZoom((value) => Math.min(2, value + 0.25))}
          >
            <Plus size={18} />
          </button>
          <button onClick={() => setExpanded(true)}>
            <Expand size={18} /> Бүтэн дэлгэц
          </button>
        </div>
      )}
      {!layout2d && !layout3d && (
        <p className="unit-media-note">
          Байрны тусдаа зураг нэмэгдээгүй. Давхар дахь байрлалыг харуулж байна.
        </p>
      )}
      {expanded && (
        <BuildingDialog
          title={name}
          subtitle={selected?.label ?? "Байрны зураг"}
          onClose={() => setExpanded(false)}
        >
          <div className="unit-media-expanded">{visual}</div>
        </BuildingDialog>
      )}
    </section>
  );
}
