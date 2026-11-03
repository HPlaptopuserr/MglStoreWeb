import type { WebsiteProject } from "@mgl/types/building-website";
import {
  buildingProjectDetailsUrl,
  buildingBlockSelectionUrl,
} from "@/features/building/model/building-place-url";
import { ProjectLandingHero } from "./ProjectLandingHero";
import { ProjectSiteLayout } from "./ProjectSiteLayout";

export function ManagedProjectSite({
  project,
  preview = false,
}: {
  project: WebsiteProject;
  preview?: boolean;
}) {
  const content = project.website.content;
  const details = buildingProjectDetailsUrl(project, preview);
  return (
    <ProjectSiteLayout project={project} preview={preview} landing>
      <ProjectLandingHero
        title={content.heroTitle || project.title}
        eyebrow={content.eyebrow || project.title}
        description={content.heroSubtitle || project.description}
        image={content.heroImageUrl || project.coverImageUrl}
        imageAlt={project.title}
        location={[project.district, project.address]
          .filter(Boolean)
          .join(" · ")}
        chooseHref={buildingBlockSelectionUrl(project, preview)}
        detailsHref={details}
      />
    </ProjectSiteLayout>
  );
}
