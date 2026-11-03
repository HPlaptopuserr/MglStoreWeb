import Link from "next/link";
import { notFound } from "next/navigation";
import { getBuildingHomeProjects } from "@/features/building/server/building-home";
import { getWebsiteProject } from "@/features/building/server/building-website";
import { WebsiteProjectView } from "../website/WebsiteProjectView";
import "./building-home.css";

export async function BuildingHome({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; block?: string; floor?: string }>;
}) {
  const query = await searchParams;
  const projects = await getBuildingHomeProjects();
  const selected = query.project
    ? projects.find((p) => p.id === query.project)
    : projects[0];
  if (query.project && !selected) notFound();
  const project = selected
    ? await getWebsiteProject(selected.id, selected.preview)
    : null;
  if (selected && !project) notFound();
  return (
    <div className="building-home-page">
      {project && selected ? (
        <WebsiteProjectView
          canonical
          project={project}
          query={query}
          preview={selected.preview}
        />
      ) : (
        <main className="building-home-empty">
          <p>ТАНЫ ШИНЭ ОРОН ЗАЙ</p>
          <h1>Барилгын төслүүд</h1>
          <p>Нийтэлсэн төсөл хараахан байхгүй байна.</p>
          <Link href="/building/manage/content">Төслөө удирдах →</Link>
        </main>
      )}
    </div>
  );
}
