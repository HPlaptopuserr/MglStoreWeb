import { getBuildingProjects } from "@/lib/building-api";
import { getWebsiteProject } from "@/lib/server/building-website";
import { suppliedInventory } from "./supplied-inventory";
import { mapPublishedInventory, type MasterplanInventory } from "./inventory";
import { InteractiveMasterplan } from "./InteractiveMasterplan";

export async function MasterplanSection() {
  let inventory: MasterplanInventory;
  try {
    const projects = await getBuildingProjects();
    const reference = projects.find((project) => project.slug === "euro-plaza");
    if (reference) {
      const project = await getWebsiteProject(reference.id);
      inventory = project
        ? mapPublishedInventory(project)
        : { mode: "error", blocks: {} };
    } else {
      inventory = suppliedInventory;
    }
  } catch {
    inventory = { mode: "error", blocks: {} };
  }
  return <InteractiveMasterplan inventory={inventory} />;
}
