import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SelectableBlock } from "./masterplan-selection.types";
export function MasterplanBlockPin({
  block,
  x,
  y,
  base,
}: {
  block: SelectableBlock;
  x: number;
  y: number;
  base: string;
}) {
  return (
    <Link
      href={`${base}/${encodeURIComponent(block.name)}`}
      className="selection-block-pin"
      style={{ left: `${x}%`, top: `${y}%` }}
      aria-label={`${block.name} блок — Давхар сонгох`}
    >
      <span className="selection-pin-label">{block.name}</span>
      <span className="selection-pin-hint">
        <strong>{block.name} блок</strong>
        <span>{block.floorCount} давхар</span>
        <span>
          Давхар сонгох <ArrowRight size={14} aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
