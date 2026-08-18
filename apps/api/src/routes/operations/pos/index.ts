import { Router, type Router as ExpressRouter } from "express";
import cardPaymentsRoutes from "./card-payments.routes";
import qpayRoutes from "./qpay.routes";
import salesRoutes from "./sales.routes";
import shiftsRoutes from "./shifts.routes";
import catalogRoutes from "./catalog.routes";
import registersRoutes from "./registers.routes";
import restaurantRoutes from "./restaurant.routes";
import goodsReceiptsRoutes from "./goods-receipts.routes";

const router: ExpressRouter = Router();

router.use(cardPaymentsRoutes);
router.use(qpayRoutes);
router.use(salesRoutes);
router.use(shiftsRoutes);
router.use(catalogRoutes);
router.use(registersRoutes);
router.use(restaurantRoutes);
router.use(goodsReceiptsRoutes);

export default router;
