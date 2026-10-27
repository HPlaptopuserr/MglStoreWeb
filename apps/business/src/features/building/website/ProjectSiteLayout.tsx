import Link from "next/link";
import type { ReactNode } from "react";
import type { WebsiteProject } from "@mgl/types/building-website";
import { ProjectSiteHeader } from "./ProjectSiteHeader";
import "../euro-plaza/euro-plaza.css";
import "../project-site/project.css";
import "./managed-site.css";
import "./project-site-shell.css";

export function ProjectSiteLayout({
  project,
  preview = false,
  landing = false,
  children,
}: {
  project: WebsiteProject;
  preview?: boolean;
  landing?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`euro-plaza managed-public-site${landing ? " managed-project-landing" : ""}`}
    >
      <ProjectSiteHeader project={project} preview={preview} />
      <main>{children}</main>
      {!landing && (
        <footer className="residence-footer">
          <span>{project.title}</span>
          <Link href="/building">Бүх төслүүд</Link>
          <span>MGL Business</span>
        </footer>
      )}
    </div>
  );
}
