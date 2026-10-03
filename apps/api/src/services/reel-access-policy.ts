import {
  ReelStatus,
  ReelVisibility,
  VendorContentReviewStatus,
  type Prisma,
} from "@mgl/database";

export const publicReelAccess: Prisma.ReelWhereInput = {
  deletedAt: null,
  status: ReelStatus.READY,
  visibility: ReelVisibility.PUBLIC,
  reviewStatus: VendorContentReviewStatus.APPROVED,
};

/** Private visibility is only available in the authenticated personal library. */
export function reelListAccess(input: {
  includePrivate?: boolean;
  includePending?: boolean;
  authorId?: string;
  organizationId?: string | null;
}): Prisma.ReelWhereInput {
  return {
    ...publicReelAccess,
    ...(input.includePrivate && input.authorId && input.organizationId === null
      ? {
          visibility: { in: [ReelVisibility.PUBLIC, ReelVisibility.PRIVATE] },
          authorId: input.authorId,
          organizationId: null,
        }
      : {}),
    ...(input.includePending ? { reviewStatus: undefined } : {}),
  };
}
