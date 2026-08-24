import {
  prisma,
  ReelAssetKind,
  ReelInteractionType,
  ReelProcessingStatus,
  ReelStatus,
  ReelVisibility,
  VendorContentReviewStatus,
  type Prisma,
} from "@mgl/database";
import { getReviewStatusForVendorMutation } from "./vendor-content-review.service";

export interface CreateReelInput {
  organizationId: string;
  authorId: string;
  title?: string | null;
  caption?: string | null;
  description?: string | null;
  businessCategoryId?: string | null;
  productId?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  fileSizeBytes?: bigint | null;
  mimeType?: string | null;
  tags?: string[];
  metadata?: Prisma.InputJsonValue;
}

export interface ListReelsInput {
  organizationId?: string;
  businessCategoryId?: string;
  productId?: string;
  authorId?: string;
  includePending?: boolean;
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface RecordReelInteractionInput {
  reelId: string;
  userId?: string;
  visitorId?: string;
  type: ReelInteractionType;
  watchSeconds?: number | null;
  watchPercent?: number | null;
  source?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface SetReelLikeInput {
  reelId: string;
  liked: boolean;
  userId?: string;
  visitorId?: string;
  source?: string | null;
}

const createReelInclude = () =>
  ({
    organization: {
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        isVerified: true,
      },
    },
    author: {
      select: {
        id: true,
        profile: {
          select: {
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    },
    businessCategory: {
      select: {
        id: true,
        slug: true,
        name: true,
        icon: true,
      },
    },
    product: {
      select: {
        id: true,
        name: true,
        price: true,
        supplyType: true,
        discounts: {
          where: { isActive: true, validUntil: { gte: new Date() } },
          select: { percent: true, validUntil: true },
          take: 1,
        },
        images: {
          take: 1,
          select: {
            url: true,
          },
        },
      },
    },
    assets: true,
  }) satisfies Prisma.ReelInclude;

function normalizeLimit(limit?: number) {
  if (!Number.isFinite(limit || NaN)) return 20;
  return Math.min(50, Math.max(1, Math.floor(limit || 20)));
}

async function assertOrganizationExists(organizationId: string) {
  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!organization) {
    throw new Error("Байгууллага олдсонгүй");
  }
}

async function assertOptionalRelations(input: CreateReelInput) {
  if (input.businessCategoryId) {
    const category = await prisma.businessCategory.findFirst({
      where: { id: input.businessCategoryId, isActive: true },
      select: { id: true },
    });
    if (!category) throw new Error("Бизнес ангилал олдсонгүй");
  }

  if (input.productId) {
    const product = await prisma.product.findFirst({
      where: {
        id: input.productId,
        organizationId: input.organizationId,
        deletedAt: null,
      },
      select: { id: true, businessCategoryId: true },
    });
    if (!product) throw new Error("Бүтээгдэхүүн олдсонгүй");
  }
}

export async function createReel(input: CreateReelInput) {
  await assertOrganizationExists(input.organizationId);
  await assertOptionalRelations(input);

  const review = await getReviewStatusForVendorMutation();
  const publishedAt =
    review.reviewStatus === VendorContentReviewStatus.APPROVED
      ? new Date()
      : null;

  return prisma.reel.create({
    data: {
      organizationId: input.organizationId,
      authorId: input.authorId,
      title: input.title,
      caption: input.caption,
      description: input.description,
      businessCategoryId: input.businessCategoryId,
      productId: input.productId,
      videoUrl: input.videoUrl,
      thumbnailUrl: input.thumbnailUrl,
      storageBucket: input.storageBucket,
      storagePath: input.storagePath,
      durationSeconds: input.durationSeconds,
      width: input.width,
      height: input.height,
      fileSizeBytes: input.fileSizeBytes,
      mimeType: input.mimeType,
      tags: input.tags || [],
      metadata: input.metadata,
      status: ReelStatus.READY,
      visibility: ReelVisibility.PUBLIC,
      reviewStatus: review.reviewStatus,
      reviewedAt: review.reviewedAt,
      reviewedById: review.reviewedById,
      publishedAt,
      assets: {
        create: {
          kind: ReelAssetKind.ORIGINAL,
          url: input.videoUrl,
          storageBucket: input.storageBucket,
          storagePath: input.storagePath,
          mimeType: input.mimeType,
          width: input.width,
          height: input.height,
          durationSeconds: input.durationSeconds,
          fileSizeBytes: input.fileSizeBytes,
        },
      },
      processingJobs: {
        create: {
          status: ReelProcessingStatus.SUCCEEDED,
          provider: "direct-upload",
          finishedAt: new Date(),
        },
      },
    },
    include: createReelInclude(),
  });
}

export async function listReels(input: ListReelsInput) {
  const limit = normalizeLimit(input.limit);
  const where: Prisma.ReelWhereInput = {
    deletedAt: null,
    status: ReelStatus.READY,
    visibility: ReelVisibility.PUBLIC,
    ...(input.includePending
      ? {}
      : { reviewStatus: VendorContentReviewStatus.APPROVED }),
    ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    ...(input.businessCategoryId
      ? { businessCategoryId: input.businessCategoryId }
      : {}),
    ...(input.productId ? { productId: input.productId } : {}),
    ...(input.authorId ? { authorId: input.authorId } : {}),
  };

  const reels = await prisma.reel.findMany({
    where,
    include: createReelInclude(),
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit + 1,
    ...(input.cursor
      ? { cursor: { id: input.cursor }, skip: 1 }
      : input.offset
        ? { skip: Math.max(0, Math.floor(input.offset)) }
        : {}),
  });

  const hasMore = reels.length > limit;
  const items = hasMore ? reels.slice(0, limit) : reels;
  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]?.id || null : null,
  };
}

export async function getReelById(id: string, includePending = false) {
  return prisma.reel.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(includePending
        ? {}
        : { reviewStatus: VendorContentReviewStatus.APPROVED }),
    },
    include: createReelInclude(),
  });
}

export async function updateReel(
  id: string,
  data: {
    title?: string | null;
    caption?: string | null;
    description?: string | null;
    businessCategoryId?: string | null;
    productId?: string | null;
    thumbnailUrl?: string | null;
    tags?: string[];
  },
) {
  return prisma.reel.update({
    where: { id },
    data,
    include: createReelInclude(),
  });
}

export async function softDeleteReel(id: string) {
  return prisma.reel.update({
    where: { id },
    data: { deletedAt: new Date(), status: ReelStatus.ARCHIVED },
    select: { id: true },
  });
}

export async function reviewReel(
  id: string,
  reviewedById: string,
  reviewStatus: VendorContentReviewStatus,
) {
  return prisma.reel.update({
    where: { id },
    data: {
      reviewStatus,
      reviewedById,
      reviewedAt: new Date(),
      publishedAt:
        reviewStatus === VendorContentReviewStatus.APPROVED ? new Date() : null,
    },
    include: createReelInclude(),
  });
}

export async function recordReelInteraction(input: RecordReelInteractionInput) {
  const reel = await prisma.reel.findFirst({
    where: { id: input.reelId, deletedAt: null },
    select: { id: true, organizationId: true },
  });
  if (!reel) throw new Error("Reel олдсонгүй");

  const counterUpdate: Prisma.ReelUpdateInput = {};
  if (input.type === ReelInteractionType.VIEW) {
    counterUpdate.viewCount = { increment: 1 };
  } else if (input.type === ReelInteractionType.LIKE) {
    counterUpdate.likeCount = { increment: 1 };
  } else if (input.type === ReelInteractionType.SAVE) {
    counterUpdate.saveCount = { increment: 1 };
  } else if (input.type === ReelInteractionType.SHARE) {
    counterUpdate.shareCount = { increment: 1 };
  } else if (input.type === ReelInteractionType.COMMENT) {
    counterUpdate.commentCount = { increment: 1 };
  }

  return prisma.$transaction(async (tx) => {
    const interaction = await tx.reelInteraction.create({
      data: {
        reelId: input.reelId,
        userId: input.userId,
        visitorId: input.visitorId,
        organizationId: reel.organizationId,
        type: input.type,
        watchSeconds: input.watchSeconds,
        watchPercent: input.watchPercent,
        source: input.source,
        metadata: input.metadata,
      },
    });

    if (Object.keys(counterUpdate).length > 0) {
      await tx.reel.update({
        where: { id: input.reelId },
        data: counterUpdate,
      });
    }

    return interaction;
  });
}

export async function setReelLike(input: SetReelLikeInput) {
  if (!input.userId && !input.visitorId) {
    throw new Error("visitorId шаардлагатай");
  }

  return prisma.$transaction(async (tx) => {
    const reel = await tx.reel.findFirst({
      where: { id: input.reelId, deletedAt: null },
      select: { id: true, organizationId: true, likeCount: true },
    });
    if (!reel) throw new Error("Reel олдсонгүй");

    const identityWhere: Prisma.ReelInteractionWhereInput = input.userId
      ? { userId: input.userId }
      : { visitorId: input.visitorId };
    const where: Prisma.ReelInteractionWhereInput = {
      reelId: input.reelId,
      type: ReelInteractionType.LIKE,
      ...identityWhere,
    };
    const existing = await tx.reelInteraction.findFirst({
      where,
      select: { id: true },
    });

    if (input.liked) {
      if (!existing) {
        await tx.reelInteraction.create({
          data: {
            reelId: input.reelId,
            userId: input.userId,
            visitorId: input.visitorId,
            organizationId: reel.organizationId,
            type: ReelInteractionType.LIKE,
            source: input.source,
          },
        });
        await tx.reel.update({
          where: { id: input.reelId },
          data: { likeCount: { increment: 1 } },
        });
      }
    } else if (existing) {
      await tx.reelInteraction.deleteMany({ where });
      await tx.reel.update({
        where: { id: input.reelId },
        data: { likeCount: { decrement: Math.min(1, reel.likeCount) } },
      });
    }

    const updated = await tx.reel.findUnique({
      where: { id: input.reelId },
      select: { id: true, likeCount: true },
    });

    return {
      liked: input.liked,
      likeCount: updated?.likeCount || 0,
    };
  });
}
