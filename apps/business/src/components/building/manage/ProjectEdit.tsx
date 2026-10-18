"use client";
import { readWebsiteRecord } from "@mgl/types/building-website";
import { useEffect, useState } from "react";
import { managementFetch, responseError } from "@/lib/building-management";
import { ProjectCreateForm, type ProjectEditData } from "./ProjectCreateForm";
import { newType } from "./inventory-draft";
interface SavedProject {
  documents?: unknown;
  id: string;
  slug: string;
  updatedAt: string;
  title: string;
  district: string | null;
  address: string | null;
  description: string | null;
  coverImageUrl: string | null;
  blocks: Array<{
    id: string;
    name: string;
    floors: Array<{
      id: string;
      number: number;
      units: Array<{
        id: string;
        unitNo: string;
        typeLabel: string | null;
        rooms: number | null;
        areaM2: string | null;
      }>;
    }>;
  }>;
}
export function ProjectEdit({ id }: { id: string }) {
  const [data, setData] = useState<ProjectEditData | null>(null),
    [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setError("");
      try {
        const response = await managementFetch(`admin/projects/${id}`, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            await responseError(response, "Төсөл ачаалж чадсангүй"),
          );
        const { project: p } = (await response.json()) as {
          project: SavedProject;
        };
        if (controller.signal.aborted) return;
        setData({
          id: p.id,
          slug: p.slug,
          updatedAt: p.updatedAt,
          basics: {
            title: p.title,
            district: p.district ?? "",
            address: p.address ?? "",
            description: p.description ?? "",
            coverImageUrl: p.coverImageUrl ?? "",
          },
          blocks: p.blocks.map((b) => ({
            id: b.id,
            facade: readWebsiteRecord(p.documents).facadesByBlock?.[b.id],
            name: b.name,
            floorTemplates: (readWebsiteRecord(p.documents)
              .inventoryTemplatesByBlock?.[b.id]?.length
              ? readWebsiteRecord(p.documents).inventoryTemplatesByBlock?.[b.id]
              : undefined
            )?.map(({ floorNumbers, ...template }) => ({
              ...template,
              floorIds: b.floors
                .filter((floor) => floorNumbers.includes(floor.number))
                .map((floor) => floor.id),
            })),
            floorCount: String(
              Math.max(0, ...b.floors.map((floor) => floor.number)),
            ),
            types: b.floors[0]?.units.map((u) => ({
              ...newType(),
              typeLabel: u.typeLabel ?? "",
              rooms: String(u.rooms ?? ""),
              areaM2: u.areaM2 ?? "",
            })) ?? [newType()],
            floors: b.floors.map((f) => ({
              id: f.id,
              number: String(f.number),
              units: f.units.map((u) => ({
                id: u.id,
                unitNo: u.unitNo,
                typeLabel: u.typeLabel ?? "",
                rooms: String(u.rooms ?? ""),
                areaM2: u.areaM2 ?? "",
              })),
            })),
          })),
        });
      } catch (e: unknown) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Алдаа гарлаа");
      }
    }
    void load();
    return () => controller.abort();
  }, [id, attempt]);
  if (error)
    return (
      <div role="alert" className="building-alert">
        <p>{error}</p>
        <button
          className="building-secondary"
          onClick={() => setAttempt((v) => v + 1)}
        >
          Дахин оролдох
        </button>
      </div>
    );
  return data ? (
    <ProjectCreateForm initial={data} />
  ) : (
    <p role="status">Төслийн мэдээлэл ачаалж байна…</p>
  );
}
