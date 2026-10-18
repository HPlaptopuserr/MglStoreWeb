import { ProjectLanding } from "@/components/building/project/ProjectLanding";
import { PropertyViewer } from "@/components/building/viewer/PropertyViewer";
import { createDemoInventory } from "@/components/building/sales/demo-inventory";
export async function BuildingExperience({
  searchParams,
}: {
  searchParams: Promise<{ floor?: string; unit?: string }>;
}) {
  const params = await searchParams;
  if (params.floor === undefined) return <ProjectLanding />;
  const parsed = Number(params.floor ?? 14);
  const floor =
    Number.isInteger(parsed) && parsed >= -2 && parsed <= 16 ? parsed : 14;
  const unit = createDemoInventory().find(
    (value) => value.id === params.unit && value.floor === floor,
  );
  return (
    <PropertyViewer
      key={`${floor}-${unit?.id ?? ""}`}
      initialFloor={floor}
      initialUnit={unit?.id ?? null}
    />
  );
}
