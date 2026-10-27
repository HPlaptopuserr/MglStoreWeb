"use client";
import { buildingPlaceUrl } from "@/features/building/model/building-place-url";
import { useState } from "react";
import Link from "next/link";
import type { WebsiteProject } from "@mgl/types/building-website";
import { ExplorerFloorUnits } from "./ExplorerFloorUnits";
import { getProjectFloorInventory } from "./project-floor-inventory";
import { BuildingFacadeView } from "./BuildingFacadeView";
import { FloorElevation } from "./FloorElevation";
import "./building-explorer.css";
function floorName(number: number) {
  return number < 0
    ? `B${Math.abs(number)}`
    : number === 0
      ? "Гадна талбай"
      : `${number} давхар`;
}
export function ProjectBuildingExplorer({
  project,
  publicBase,
  initialBlockId,
  fullscreen = false,
}: {
  project: WebsiteProject;
  publicBase?: string;
  initialBlockId?: string;
  fullscreen?: boolean;
}) {
  const [blockId, setBlockId] = useState(
    initialBlockId ?? project.blocks[0]?.id ?? "",
  );
  const block =
    project.blocks.find((b) => b.id === blockId) ?? project.blocks[0];
  const [floorNumber, setFloorNumber] = useState<number | null>(null);
  const floors = block
    ? [...block.floors].sort((a, b) => b.number - a.number)
    : [];
  const floor = floors.find((f) => f.number === floorNumber) ?? floors[0];
  if (!block || !floor)
    return (
      <section className="management-empty">
        <h2>Блок, давхраа нэмээрэй</h2>
        <p>Бүртгэсэн давхрууд энд барилгын дүрслэлээр харагдана.</p>
        <Link
          className="building-primary"
          href={`/building/manage/${project.id}/edit`}
        >
          Бүтэц тохируулах →
        </Link>
      </section>
    );
  const { plan, entries, available, prices } = getProjectFloorInventory(
    project,
    block.id,
    floor.number,
    Boolean(
      publicBase?.startsWith("/building/projects/") ||
      publicBase?.startsWith("/building/hotkhon/"),
    ),
  );
  const preview = buildingPlaceUrl(
    project,
    !publicBase || publicBase.includes("/preview"),
    block.name,
    floor.number,
  );
  return (
    <section
      className="admin-building-explorer"
      aria-label="Барилгаас давхар сонгох"
    >
      <div className="admin-explorer-copy">
        {!fullscreen && (
          <>
            <p className="admin-explorer-eyebrow">БЛОК → ДАВХАР → БАЙР</p>
            <h2>
              Эхлээд давхраа.
              <br />
              <em>Дараа нь байраа.</em>
            </h2>
            <p>
              Барилга дээрх давхрыг сонгоод байрны талбай, борлуулалтын төлөв
              болон планыг хараарай.
            </p>
          </>
        )}
        <label className="admin-explorer-block">
          Блок сонгох
          <select
            value={block.id}
            onChange={(e) => {
              setBlockId(e.target.value);
              setFloorNumber(null);
            }}
          >
            {project.blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.floors.length} давхар
              </option>
            ))}
          </select>
        </label>
        <div className="admin-explorer-floor">
          <div className="admin-explorer-floor-heading">
            <label>
              СОНГОСОН ДАВХАР
              <select
                aria-label="Барилгын давхар"
                value={floor.number}
                onChange={(e) => setFloorNumber(Number(e.target.value))}
              >
                {floors.map((f) => (
                  <option key={f.id} value={f.number}>
                    {floorName(f.number)}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <strong>
                {available.length}
                <small> / {entries.length}</small>
              </strong>
              <span>нэгж боломжтой</span>
            </div>
          </div>
          <ExplorerFloorUnits
            key={`${block.id}:${floor.id}`}
            entries={entries}
            preview={preview}
            paginated={fullscreen}
          />
          <p className="admin-explorer-price">
            {prices.length
              ? `${Math.min(...prices).toLocaleString("mn-MN")} ₮-с`
              : "Үнэ оруулаагүй"}
            <small
              title={
                plan ? `Ашиглаж буй план: ${plan.name}` : "План оноогоогүй"
              }
            >
              {floorName(floor.number)} · {entries.length} байр
            </small>
          </p>
          {plan && (
            <Link className="admin-explorer-primary" href={preview}>
              {floorName(floor.number)} · План харах →
            </Link>
          )}
          {!publicBase && (
            <Link
              className="admin-explorer-edit"
              href={`/building/manage/${project.id}/plans/${block.id}`}
            >
              {plan ? "Давхрын план засах" : "План зураг оруулах"} →
            </Link>
          )}
        </div>
        <p className="admin-explorer-legend">
          🟢 Боломжтой · 🟡 Захиалгатай · 🔴 Зарагдсан
        </p>
      </div>
      <div className="admin-explorer-visual">
        <div className="admin-explorer-building-title">
          <strong>{block.name}</strong>
          <span>{floors.length} бүртгэлтэй давхар</span>
        </div>
        <div className="admin-explorer-facade">
          {project.website.facadesByBlock?.[block.id] ? (
            <BuildingFacadeView
              facade={project.website.facadesByBlock[block.id]}
              floors={floors}
              selected={floor.number}
              onSelect={setFloorNumber}
            />
          ) : (
            <FloorElevation
              floors={floors}
              selected={floor.number}
              onSelect={setFloorNumber}
              fitToContainer={fullscreen}
            />
          )}
        </div>
        <p>Давхар сонгох схем · Архитектурын зураг биш</p>
      </div>
    </section>
  );
}
