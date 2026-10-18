import { ProjectEdit } from "@/components/building/manage/ProjectEdit";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectEdit id={id} />;
}
