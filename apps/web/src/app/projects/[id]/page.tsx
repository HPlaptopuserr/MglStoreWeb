"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  PaidAccessDetailError,
  PaidAccessDetailLoading,
} from "@/components/molecules/paid-access/PaidAccessDetailState";
import { ProjectDetailContent } from "@/components/molecules/projects/ProjectDetailContent";
import type { ProjectItem } from "@/components/molecules/projects/project-types";

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { authFetch } = useAuth();
  const [project, setProject] = useState<ProjectItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!projectId) {
      setError("Төслийн ID олдсонгүй");
      setLoading(false);
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError("");
        const invoiceId = searchParams.get("invoiceId");
        const query = invoiceId
          ? `?${new URLSearchParams({ invoiceId }).toString()}`
          : "";
        const res = await authFetch(
          `${API}/site-settings/projects/${projectId}/detail${query}`,
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(
            data.message || "Төслийн мэдээлэл авахад алдаа гарлаа",
          );
        }
        setProject(data.project as ProjectItem);
      } catch (fetchError) {
        console.error(fetchError);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Төслийн мэдээлэл авахад алдаа гарлаа",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [authFetch, params.id, searchParams]);

  if (loading) {
    return <PaidAccessDetailLoading label="Төслийн мэдээлэл уншиж байна..." />;
  }

  if (error || !project) {
    return (
      <PaidAccessDetailError
        title="Төсөл нээгдсэнгүй"
        message={error || "Төслийн мэдээлэл олдсонгүй"}
        backLabel="Төслүүд рүү буцах"
        onBack={() => router.push("/projects")}
      />
    );
  }

  return (
    <ProjectDetailContent
      project={project}
      onBack={() => router.push("/projects")}
    />
  );
}
