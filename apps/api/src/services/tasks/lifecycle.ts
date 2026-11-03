import { OrganizationTaskStatus } from "@mgl/database";

export function taskStatus(
  assignees: readonly { status: string }[],
): OrganizationTaskStatus {
  const active = assignees.filter((a) => a.status !== "CANCELLED");
  if (!active.length && assignees.length)
    return OrganizationTaskStatus.CANCELLED;
  if (active.length && active.every((a) => a.status === "DONE"))
    return OrganizationTaskStatus.DONE;
  if (active.some((a) => a.status === "PENDING_REVIEW"))
    return OrganizationTaskStatus.PENDING_REVIEW;
  if (active.some((a) => a.status === "IN_PROGRESS" || a.status === "DONE"))
    return OrganizationTaskStatus.IN_PROGRESS;
  return OrganizationTaskStatus.PENDING;
}

export function taskStatusWhere(
  status: OrganizationTaskStatus,
): import("@mgl/database").Prisma.OrganizationTaskWhereInput {
  const active = { status: { not: OrganizationTaskStatus.CANCELLED } };
  switch (status) {
    case "DONE":
      return {
        assignees: {
          some: active,
          every: { status: { in: ["DONE", "CANCELLED"] } },
        },
      };
    case "CANCELLED":
      return { assignees: { some: {}, every: { status: "CANCELLED" } } };
    case "PENDING_REVIEW":
      return { assignees: { some: { status: "PENDING_REVIEW" } } };
    case "IN_PROGRESS":
      return {
        AND: [
          {
            assignees: {
              some: { status: { in: ["IN_PROGRESS", "DONE"] } },
              none: { status: "PENDING_REVIEW" },
            },
          },
          { NOT: taskStatusWhere(OrganizationTaskStatus.DONE) },
        ],
      };
    case "PENDING":
      return {
        OR: [
          { assignees: { none: {} } },
          {
            assignees: {
              some: { status: "PENDING" },
              every: { status: { in: ["PENDING", "CANCELLED"] } },
            },
          },
        ],
      };
  }
}
