import { ProjectSelectionPage } from "@/features/building/website/ProjectSelectionPage";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProjectSelectionPage slug={slug} />;
}
