import { ProjectDetailsPage } from "@/features/building/website/ProjectDetailsPage";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProjectDetailsPage slug={slug} />;
}
