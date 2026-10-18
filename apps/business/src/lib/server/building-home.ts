import type { BuildingAdminProject } from '@mgl/types';
import { getBuildingProjects } from '../building-api';
import { buildingApiBase, buildingToken } from './building-session';

export interface HomeProjectOption { id: string; title: string; preview: boolean }
export async function getBuildingHomeProjects(): Promise<HomeProjectOption[]> {
  const token = await buildingToken();
  const [published, owned] = await Promise.all([
    getBuildingProjects(),
    token ? fetch(`${buildingApiBase}/api/building/admin/projects`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    }).then(async response => {
      if ([401, 403].includes(response.status)) return [];
      if (!response.ok) throw new Error('Таны төслүүдийг ачаалж чадсангүй');
      return ((await response.json()) as { projects: BuildingAdminProject[] }).projects;
    }) : Promise.resolve([]),
  ]);
  const options: HomeProjectOption[] = published.map(p => ({ id: p.id, title: p.title, preview: false }));
  for (const project of owned) {
    if (!options.some(p => p.id === project.id)) options.push({ id: project.id, title: project.title, preview: true });
  }
  return options;
}
