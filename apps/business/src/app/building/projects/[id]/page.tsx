import { EuroPlazaLanding } from "@/features/building/euro-plaza/EuroPlazaLanding";
import { notFound } from "next/navigation";
import { getWebsiteProject } from "@/features/building/server/building-website";
import { WebsiteProjectView } from "@/features/building/website/WebsiteProjectView";
export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ block?: string; floor?: string; region?: string; view?: string }>;
}) {
  const { id } = await params;
  if (id === "euro-plaza") return <EuroPlazaLanding />;
  const project = await getWebsiteProject(id);
  if (!project) notFound();
  return <WebsiteProjectView project={project} query={await searchParams} />;
}
