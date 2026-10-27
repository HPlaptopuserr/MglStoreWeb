"use client";

import { useState } from "react";
import { FloorPlanUnitCards } from "./FloorPlanUnitCards";
import type { FloorPlanUnit } from "./floor-plan-units";

export function ExplorerFloorUnits({
  entries,
  preview,
  paginated,
}: {
  entries: FloorPlanUnit[];
  preview: string;
  paginated: boolean;
}) {
  const [page, setPage] = useState(0);
  const count = entries.length;
  const pageSize = 12;
  const pageCount = Math.ceil(count / pageSize);
  const first = paginated ? page * pageSize : 0;
  const end = paginated ? first + pageSize : count;
  return (
    <div className="explorer-floor-unit-preview">
      <FloorPlanUnitCards
        entries={entries.slice(first, end)}
        preview={preview}
        compact={paginated}
      />
      {paginated && pageCount > 1 && (
        <nav
          className="floor-unit-pagination"
          aria-label="Давхрын байрны жагсаалт"
        >
          <button
            type="button"
            onClick={() => setPage((value) => value - 1)}
            disabled={page === 0}
            aria-label="Өмнөх байрууд"
          >
            ←
          </button>
          <span aria-live="polite">
            {first + 1}–{Math.min(end, count)} / {count} байр
          </span>
          <button
            type="button"
            onClick={() => setPage((value) => value + 1)}
            disabled={page + 1 >= pageCount}
            aria-label="Дараагийн байрууд"
          >
            →
          </button>
        </nav>
      )}
    </div>
  );
}
