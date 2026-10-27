import { managementFetch, responseError } from "../api/management-client";
import { readPlanImage } from "../plans/plan-storage";

export async function uploadUnitImage(
  projectId: string,
  file: File,
): Promise<string> {
  const image = await readPlanImage(file);
  const response = await managementFetch(`admin/projects/${projectId}/media`, {
    method: "POST",
    body: JSON.stringify({ image }),
  });
  if (!response.ok)
    throw new Error(await responseError(response, "Зураг оруулж чадсангүй."));
  const result = (await response.json()) as { url: string };
  return result.url;
}
