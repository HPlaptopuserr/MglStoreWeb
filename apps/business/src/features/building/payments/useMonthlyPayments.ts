"use client";
import { useCallback, useEffect, useState } from "react";
import type { BuildingPaymentsReport } from "@mgl/types/building-payments";
import { managementFetch, responseError } from "../api/management-client";

interface ReportResource {
  key: string;
  data?: BuildingPaymentsReport;
  error?: string;
}
export function useMonthlyPayments(year: number, project: string) {
  const [version, setVersion] = useState(0);
  const [resource, setResource] = useState<ReportResource | null>(null);
  const key = `${year}:${project}:${version}`;
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      year: String(year),
      ...(project ? { project } : {}),
    });
    void managementFetch(`admin/payments-report?${params}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            await responseError(
              response,
              "Төлөлтийн мэдээлэл ачаалж чадсангүй.",
            ),
          );
        return response.json() as Promise<BuildingPaymentsReport>;
      })
      .then((data) => {
        if (!controller.signal.aborted) setResource({ key, data });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setResource({
            key,
            error: cause instanceof Error ? cause.message : "Алдаа гарлаа.",
          });
      });
    return () => controller.abort();
  }, [key, year, project]);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return {
    data: resource?.key === key ? resource.data : undefined,
    error: resource?.key === key ? resource.error : undefined,
    loading: resource?.key !== key,
    reload,
  };
}
