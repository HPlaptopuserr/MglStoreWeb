"use client";
import { useState } from "react";
import type { WorkforceEmployeeDetails } from "@mgl/types";
import { useWorkforceResource } from "../useWorkforceResource";
export function useEmployeeDetails(
  employeeId: string,
  organizationId: string | undefined,
  enabled = true,
) {
  const [revision, setRevision] = useState(0);
  const resource = useWorkforceResource<WorkforceEmployeeDetails>(
    organizationId && enabled
      ? `employees/${employeeId}?${new URLSearchParams({ organizationId })}`
      : null,
    null,
    revision,
  );
  return {
    ...resource,
    revision,
    retry: () => setRevision((value) => value + 1),
  };
}
