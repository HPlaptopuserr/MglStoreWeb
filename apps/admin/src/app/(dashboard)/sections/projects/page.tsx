"use client";

import { useSiteSettings } from "@/hooks/sections/useSiteSettings";
import { ProjectsSection } from "@/components/organisms/sections/projects/ProjectsSection";
import { SectionsRouteFrame } from "../_components/SectionsRouteFrame";
import { SectionContent } from "../_components/SectionContent";

export default function ProjectsSectionPage() {
  const { projects, setProjects, saving, saved, saveProjects } = useSiteSettings();

  return (
    <SectionsRouteFrame
      active="projects"
      onSave={saveProjects}
      saving={saving}
      saved={saved}
    >
      <SectionContent>
        <ProjectsSection
          projects={projects}
          setProjects={setProjects}
          onSave={saveProjects}
          saving={saving}
          saved={saved}
        />
      </SectionContent>
    </SectionsRouteFrame>
  );
}
