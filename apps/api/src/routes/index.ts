export { authRoutes } from "./auth";

export {
  associationRoutes,
  businessDashboardRoutes,
  investorRoutes,
  orgJoinRoutes,
  orgMemberRoutes,
  orgTaskRoutes,
  orgGamesRoutes,
  partnerRequestRoutes,
  partnerRoutes,
  personalOrganizationRoutes,
  vendorSetupRoutes,
  warehouseSetupRoutes,
} from "./business";

export { businessCategoriesRoutes, productsRoutes } from "./catalog";

export {
  servicePostsRoutes,
  postsRoutes,
  reelsRoutes,
  vendorContentReviewRoutes,
} from "./content";

export { jobApplicationRoutes, jobPositionRoutes } from "./jobs";

export {
  posRoutes,
  serviceRequestsRoutes,
  stockRequestsRoutes,
  warehousesRoutes,
  deliveriesRoutes,
  deliveryPartnershipsRoutes,
} from "./operations";

export {
  dashboardRoutes,
  siteSettingsRoutes,
  teamRoutes,
  upgradePlansRoutes,
  adminGrantPlanRoutes,
  appVersionRoutes,
} from "./system";

export { formRoutes } from "./forms";

export { attendanceRoutes } from "./attendance";

export { chatRoutes, dmRoutes } from "./chat";

export {
  storeCheckoutRoutes,
  vendorOrderRoutes,
  storeLoyaltyRoutes,
  storeBranchRoutes,
} from "./store";
export { default as vendorMerchantRoutes } from "./vendor/vendor-merchant.routes";
export { default as vendorUpgradeRoutes } from "./vendor/vendor-upgrade.routes";
export { default as vendorCardTerminalRoutes } from "./vendor/vendor-card-terminal.routes";
export { metaMarketingRoutes } from "./marketing";
