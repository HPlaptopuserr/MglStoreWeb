import { Router, type Router as ExpressRouter } from "express";
import {
  registerWarehouseOperator,
  validateWarehouseSetupToken,
  setWarehouseOperatorPassword,
  regenerateWarehouseSetupToken,
  searchPersonalAccounts,
  assignPersonalAccountToWarehouse,
} from "../../services/warehouse-setup.service";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";
import { Permission } from "@mgl/types";

const router: ExpressRouter = Router();

router.get(
  "/warehouse-setup/personal-accounts",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_WAREHOUSES),
  async (req, res) => {
    try {
      const search =
        typeof req.query.search === "string" ? req.query.search : "";
      const warehouseId =
        typeof req.query.warehouseId === "string" ? req.query.warehouseId : "";
      if (!warehouseId) {
        return res.status(400).json({ message: "warehouseId шаардлагатай" });
      }
      return res.json(await searchPersonalAccounts(search, warehouseId));
    } catch (error) {
      console.error("search personal warehouse accounts error", error);
      return res
        .status(500)
        .json({ message: "Personal account хайхад алдаа гарлаа" });
    }
  },
);

router.post(
  "/warehouse-setup/assign-personal-account",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_WAREHOUSES),
  async (req, res) => {
    try {
      const { userId, warehouseId } = req.body;
      if (!userId || !warehouseId) {
        return res
          .status(400)
          .json({ message: "userId болон warehouseId шаардлагатай" });
      }
      const result = await assignPersonalAccountToWarehouse({
        userId,
        warehouseId,
      });
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("assign personal warehouse account error", error);
      return res
        .status(500)
        .json({ message: "Personal account онооход алдаа гарлаа" });
    }
  },
);

/**
 * POST /warehouse-setup/register
 * Admin registers a warehouse operator — generates 8-digit ID and setup link (5 min)
 */
router.post(
  "/warehouse-setup/register",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_WAREHOUSES),
  async (req, res) => {
    try {
      const { email, fullName, phoneNumber, warehouseId } = req.body;

      if (!email || !fullName || !warehouseId) {
        return res.status(400).json({
          success: false,
          message: "Имэйл, нэр, агуулахын ID шаардлагатай",
        });
      }

      const result = await registerWarehouseOperator({
        email,
        fullName,
        phoneNumber,
        warehouseId,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (error) {
      console.error("register warehouse operator error", error);
      return res.status(500).json({
        success: false,
        message: "Серверийн алдаа",
      });
    }
  },
);

/**
 * GET /warehouse-setup/validate
 * Validate the setup token and return operator info
 */
router.get("/warehouse-setup/validate", async (req, res) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).json({
        valid: false,
        error: "Token шаардлагатай",
      });
    }

    const result = await validateWarehouseSetupToken(token);

    if (!result.valid) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("validate warehouse token error", error);
    return res.status(500).json({
      valid: false,
      error: "Серверийн алдаа",
    });
  }
});

/**
 * POST /warehouse-setup/set-password
 * Set password for warehouse operator using the setup token
 */
router.post("/warehouse-setup/set-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token шаардлагатай",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Нууц үг шаардлагатай",
      });
    }

    const result = await setWarehouseOperatorPassword(token, password);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("set warehouse operator password error", error);
    return res.status(500).json({
      success: false,
      message: "Серверийн алдаа",
    });
  }
});

/**
 * POST /warehouse-setup/regenerate-token
 * Regenerate setup token for warehouse operator (admin only, 5 min expiry)
 */
router.post(
  "/warehouse-setup/regenerate-token",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_WAREHOUSES),
  async (req, res) => {
    try {
      const { userId, warehouseId } = req.body;

      if (!userId || !warehouseId) {
        return res.status(400).json({
          success: false,
          message: "userId болон warehouseId шаардлагатай",
        });
      }

      const result = await regenerateWarehouseSetupToken(userId, warehouseId);

      return res.json({
        success: true,
        message: "Token амжилттай шинэчлэгдлээ (5 минут)",
        data: result,
      });
    } catch (error: any) {
      console.error("regenerate warehouse token error", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Серверийн алдаа",
      });
    }
  },
);

export default router;
