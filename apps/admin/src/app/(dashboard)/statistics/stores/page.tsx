import { SalesStoresDirectory } from "../_components/SalesStoresDirectory";
import type { StatisticsWindow } from "../_components/statistics-format";

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const days: StatisticsWindow =
    params.days === "7"
      ? 7
      : params.days === "30"
        ? 30
        : params.days === "90"
          ? 90
          : "all";
  const status =
    params.status === "active" || params.status === "inactive"
      ? params.status
      : "all";
  return (
    <SalesStoresDirectory
      key={`${days}:${status}`}
      initialDays={days}
      initialStatus={status}
    />
  );
}
