"use client";

import { useState } from "react";
import { StoreEmployees } from "@/features/employees/StoreEmployees";

function getOrganizationId() {
  if (typeof window === "undefined") return "";
  try {
    const user = JSON.parse(localStorage.getItem("vendor_user") || "{}") as {
      organizationId?: unknown;
    };
    return typeof user.organizationId === "string" ? user.organizationId : "";
  } catch {
    return "";
  }
}

export default function EmployeesPage() {
  const [organizationId] = useState(getOrganizationId);
  return (
    <StoreEmployees key={organizationId} organizationId={organizationId} />
  );
}
