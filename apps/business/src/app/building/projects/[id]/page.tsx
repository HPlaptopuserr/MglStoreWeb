import { EuroPlazaLanding } from "@/components/building/euro-plaza/EuroPlazaLanding";
import { notFound } from "next/navigation";
import { getWebsiteProject } from "@/lib/server/building-website";
import { WebsiteProjectView } from "@/components/building/content/WebsiteProjectView";
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
