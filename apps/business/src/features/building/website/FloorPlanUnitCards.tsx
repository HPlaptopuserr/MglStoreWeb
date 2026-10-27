import Link from "next/link";
import { ProjectStatus } from "../management/ProjectStatus";
import type { FloorPlanUnit } from "./floor-plan-units";

function UnitDetails({
  entry,
  compact,
}: {
  entry: FloorPlanUnit;
  compact: boolean;
}) {
  return (
    <>
      <strong title={entry.label}>{entry.label}</strong>
      {!compact && entry.unitNo && <span>№ {entry.unitNo}</span>}
      <span>
        {compact && entry.unitNo && `№ ${entry.unitNo} · `}
        {entry.areaM2 ?? "—"} м²
        {!compact && entry.rooms !== null ? ` · ${entry.rooms} өрөө` : ""}
      </span>
      {entry.unit ? (
        <ProjectStatus status={entry.unit.status} />
      ) : (
        <span>Бүртгэлтэй холбоогүй</span>
      )}
    </>
  );
}

export function FloorPlanUnitCards({
  entries,
  preview,
  compact = false,
}: {
  entries: FloorPlanUnit[];
  preview?: string;
  compact?: boolean;
}) {
  if (!entries.length) return <p role="status">Байрны бүс бүртгэгдээгүй.</p>;
  return (
    <div className="admin-explorer-units">
      {entries.map((entry) =>
        preview && entry.unit ? (
          <Link
            key={entry.id}
            className={`explorer-unit-${entry.unit?.status.toLowerCase() ?? "unlinked"}`}
            href={`${preview}/${encodeURIComponent(entry.unit.unitNo)}`}
          >
            <UnitDetails entry={entry} compact={compact} />
          </Link>
        ) : (
          <div key={entry.id} className="explorer-unit-unlinked">
            <UnitDetails entry={entry} compact={compact} />
          </div>
        ),
      )}
    </div>
  );
}
