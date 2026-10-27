import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown } from "lucide-react";

interface ProjectOption {
  id: string;
  title: string;
  preview: boolean;
}

/** Native disclosure keeps project switching accessible without client-side state. */
export function ProjectSwitcher({
  projects,
  selectedId,
  managing,
}: {
  projects: readonly ProjectOption[];
  selectedId: string;
  managing: boolean;
}) {
  if (projects.length < 2 && !managing) return null;
  return (
    <details className="project-switcher">
      <summary>
        Төслүүд <ChevronDown size={14} aria-hidden="true" />
      </summary>
      <nav className="project-switcher-menu" aria-label="Төсөл солих">
        <p>ТӨСӨЛ СОНГОХ</p>
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/building?project=${encodeURIComponent(project.id)}`}
            aria-current={project.id === selectedId ? "page" : undefined}
          >
            <span>
              {project.title}
              {project.preview && <small>Урьдчилан харах</small>}
            </span>
            {project.id === selectedId && (
              <Check size={16} aria-hidden="true" />
            )}
          </Link>
        ))}
        {managing && (
          <Link
            href="/building/manage/content"
            className="project-switcher-manage"
          >
            Удирдлага <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        )}
      </nav>
    </details>
  );
}
