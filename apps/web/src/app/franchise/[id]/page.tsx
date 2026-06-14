"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  PaidAccessDetailError,
  PaidAccessDetailLoading,
} from "@/components/molecules/paid-access/PaidAccessDetailState";
import { FranchiseDetailContent } from "../_components/FranchiseDetailContent";
import type { FranchiseProject } from "../_lib/franchise";

export default function FranchiseDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { authFetch } = useAuth();
  const [project, setProject] = useState<FranchiseProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!projectId) {
      setError("Franchise ID олдсонгүй");
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
          `${API}/site-settings/franchise/${projectId}/detail${query}`,
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(
            data.message || "Franchise мэдээлэл авахад алдаа гарлаа",
          );
        }
        setProject(data.project as FranchiseProject);
      } catch (fetchError) {
        console.error(fetchError);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Franchise мэдээлэл авахад алдаа гарлаа",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [authFetch, params.id, searchParams]);

  if (loading) {
    return (
      <PaidAccessDetailLoading label="Franchise мэдээлэл уншиж байна..." />
    );
  }

  if (error || !project) {
    return (
      <PaidAccessDetailError
        title="Franchise нээгдсэнгүй"
        message={error || "Franchise мэдээлэл олдсонгүй"}
        backLabel="Franchise руу буцах"
        onBack={() => router.push("/franchise")}
      />
    );
  }

  return (
    <FranchiseDetailContent
      project={project}
      onBack={() => router.push("/franchise")}
    />
  );
}
