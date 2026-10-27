"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { WebsiteProject } from "@mgl/types/building-website";
import { managementFetch, responseError } from "@/features/building/api/management-client";
export function ProjectHighlights({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<WebsiteProject | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    void managementFetch(`admin/projects/${projectId}/website`, {
      signal: c.signal,
    })
      .then(async (r) => {
        if (!r.ok)
          throw new Error(
            await responseError(r, "Төслийн мэдээлэл ачаалж чадсангүй"),
          );
        return r.json() as Promise<{ project: WebsiteProject }>;
      })
      .then((r) => {
        if (!c.signal.aborted) setProject(r.project);
      })
      .catch((e: unknown) => {
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : "Алдаа гарлаа");
      });
    return () => c.abort();
  }, [projectId]);
  if (error) return <p role="alert">{error}</p>;
  if (!project) return <p role="status">Төслийн зургууд ачаалж байна…</p>;
  const content = project.website.content;
  const image = content.heroImageUrl || project.coverImageUrl;
  return (
    <div className="erp-highlight-grid">
      <section className="erp-card">
        <p className="erp-eyebrow">АРХИТЕКТУР ДИЗАЙН</p>
        <h2>{project.title}</h2>
        {image ? (
          <Image
            src={image}
            width={600}
            height={360}
            unoptimized
            alt={`${project.title} гадна зураг`}
          />
        ) : (
          <p className="erp-empty">Гадна зураг оруулаагүй</p>
        )}
        <Link href={`/building/manage/${project.id}/website`}>
          Зураг, танилцуулга удирдах →
        </Link>
      </section>
      <section className="erp-card">
        <p className="erp-eyebrow">БАЙРШИЛ & ДЭД БҮТЭЦ</p>
        <h2>{project.district || "Байршил"}</h2>
        <p>{project.address || "Хаяг оруулаагүй байна."}</p>
        {content.mapUrl ? (
          <a href={content.mapUrl} target="_blank" rel="noopener noreferrer">
            Газрын зураг нээх ↗
          </a>
        ) : (
          <p className="erp-empty">Газрын зургийн холбоос бүртгэгдээгүй</p>
        )}
        <p>
          {content.amenities.map((a) => a.title).join(" · ") ||
            "Дэд бүтцийн мэдээлэл оруулаагүй."}
        </p>
      </section>
      <section className="erp-card">
        <p className="erp-eyebrow">ИНЖЕНЕРИЙН ЯВЦ</p>
        <h2>Барилгын гүйцэтгэл</h2>
        <p>
          {(
            {
              PLANNED: "Төлөвлөсөн",
              UNDER_CONSTRUCTION: "Баригдаж буй",
              COMPLETED: "Дууссан",
              HANDED_OVER: "Хүлээлгэн өгсөн",
            } as Record<string, string>
          )[project.constructionStatus] || project.constructionStatus}
        </p>
        <p>Ашиглалтад орох: {content.completionLabel || "Оруулаагүй"}</p>
        <div className="erp-empty">
          Инженерийн гүйцэтгэлийн хувь тусдаа бүртгэгдээгүй.
        </div>
        <Link href={`/building/manage/${project.id}/website`}>
          Төслийн мэдээлэл шинэчлэх →
        </Link>
      </section>
    </div>
  );
}
