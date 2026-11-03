import { DividendDecisionStatus } from "./dividends/DividendDecisionStatus";
import { DividendChoiceDialog } from "./dividends/DividendChoiceDialog";
import { DividendAmountCard } from "./dividends/DividendAmountCard";
import type { WarehouseMonthlyDividend } from "@mgl/types";

export function MonthlyDividendCard({
  dividend,
  aggregate = false,
  warehouseId,
  onConfirmed,
}: {
  dividend: WarehouseMonthlyDividend;
  aggregate?: boolean;
  warehouseId: string;
  onConfirmed: () => void;
}) {
  return (
    <DividendAmountCard dividend={dividend} aggregate={aggregate}>
      {dividend.decision && (
        <DividendDecisionStatus decision={dividend.decision} />
      )}
      {!aggregate &&
      dividend.id &&
      typeof dividend.version === "number" &&
      !dividend.decision &&
      Number(dividend.amount) > 0 ? (
        <DividendChoiceDialog
          key={`${dividend.id}:${dividend.version}`}
          dividend={{ ...dividend, id: dividend.id, version: dividend.version }}
          warehouseId={warehouseId}
          onConfirmed={onConfirmed}
        />
      ) : null}
    </DividendAmountCard>
  );
}
