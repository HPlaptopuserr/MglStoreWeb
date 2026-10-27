import { notFound } from "next/navigation";
import { getWebsiteProject } from "@/features/building/server/building-website";
import { ProjectSiteLayout } from "./ProjectSiteLayout";
import { ProjectDetailsContent } from "./ProjectDetailsContent";

export async function ProjectDetailsPage({
  slug,
  preview = false,
}: {
  slug: string;
  preview?: boolean;
}) {
  const project = await getWebsiteProject(slug, preview);
  if (!project) notFound();
  return (
    <ProjectSiteLayout project={project} preview={preview}>
      <ProjectDetailsContent project={project} preview={preview} />
    </ProjectSiteLayout>
  );
}
