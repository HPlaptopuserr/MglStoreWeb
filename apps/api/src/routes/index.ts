export { authRoutes } from "./auth";

export {
  associationRoutes,
  businessDashboardRoutes,
  investorRoutes,
  orgJoinRoutes,
  orgMemberRoutes,
  orgTaskRoutes,
  partnerRequestRoutes,
  partnerRoutes,
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
} from "./operations";

export {
  dashboardRoutes,
  siteSettingsRoutes,
  teamRoutes,
  upgradePlansRoutes,
  adminGrantPlanRoutes,
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
