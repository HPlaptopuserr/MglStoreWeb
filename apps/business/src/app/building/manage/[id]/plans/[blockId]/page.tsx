import { PlanEditor } from "@/components/building/plans/PlanEditor";
export default async function ProjectPlansPage({
  params,
}: {
  params: Promise<{ id: string; blockId: string }>;
}) {
  const { id, blockId } = await params;
  return (
    <PlanEditor key={`${id}-${blockId}`} projectId={id} blockId={blockId} />
  );
}
