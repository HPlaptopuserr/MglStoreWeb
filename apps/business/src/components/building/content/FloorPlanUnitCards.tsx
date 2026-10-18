import Link from "next/link";
import { ProjectStatus } from "../manage/ProjectStatus";
import type { FloorPlanUnit } from "./floor-plan-units";

function UnitDetails({ entry }: { entry: FloorPlanUnit }) {
  return <>
    <strong>{entry.label}</strong>
    {entry.unitNo && <span>№ {entry.unitNo}</span>}
    <span>{entry.areaM2 ?? "—"} м²{entry.rooms !== null ? ` · ${entry.rooms} өрөө` : ""}</span>
    {entry.unit ? <ProjectStatus status={entry.unit.status} /> : <span>Бүртгэлтэй холбоогүй</span>}
  </>;
}

export function FloorPlanUnitCards({ entries, preview }: {
  entries: FloorPlanUnit[];
  preview?: string;
}) {
  if (!entries.length) return <p role="status">Байрны бүс бүртгэгдээгүй.</p>;
  return <div className="admin-explorer-units">
    {entries.map(entry => preview ? <Link
      key={entry.id}
      className={`explorer-unit-${entry.unit?.status.toLowerCase() ?? "unlinked"}`}
      href={`${preview}&region=${encodeURIComponent(entry.id)}`}
      target="_blank"
    ><UnitDetails entry={entry} /></Link> : <div key={entry.id} className="explorer-unit-unlinked">
      <UnitDetails entry={entry} />
    </div>)}
  </div>;
}
