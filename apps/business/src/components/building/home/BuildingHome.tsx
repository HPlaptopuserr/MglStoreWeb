import Link from "next/link";
import { EuroPlazaLanding } from "../euro-plaza/EuroPlazaLanding";
import { notFound } from "next/navigation";
import { getBuildingHomeProjects } from "@/lib/server/building-home";
import { getWebsiteProject } from "@/lib/server/building-website";
import { WebsiteProjectView } from "../content/WebsiteProjectView";
import "./building-home.css";

export async function BuildingHome({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; block?: string; floor?: string }>;
}) {
  const query = await searchParams;
  if (!query.project || query.project === "euro-plaza")
    return <EuroPlazaLanding />;
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
    <>
      <header className="building-home-switcher">
        <Link href="/building" className="building-home-brand">
          MGL Property
        </Link>
        <nav aria-label="Төсөл сонгох">
          {projects.map((item) => (
            <Link
              key={item.id}
              href={`/building?project=${item.id}`}
              aria-current={selected?.id === item.id ? "page" : undefined}
            >
              {item.title}
              {item.preview && <small>Урьдчилан харах</small>}
            </Link>
          ))}
        </nav>
        <Link href="/building/manage/content">Удирдлага ↗</Link>
      </header>
      {project && selected ? (
        <WebsiteProjectView
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
    </>
  );
}
