import { Router, type Router as ExpressRouter } from "express";
import {
  validateVendorSetupToken,
  setVendorPassword,
  regenerateInviteToken,
} from "../services/vendor-setup.service";

const router: ExpressRouter = Router();

/**
 * GET /vendor-setup/validate
 * Validate the setup token and return user info
 */
router.get("/vendor-setup/validate", async (req, res) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).json({
        valid: false,
        error: "Token шаардлагатай",
      });
    }

    const result = await validateVendorSetupToken(token);

    if (!result.valid) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("validate token error", error);
    return res.status(500).json({
      valid: false,
      error: "Серверийн алдаа",
    });
  }
});

/**
 * POST /vendor-setup/set-password
 * Set password for vendor using the setup token
 */
router.post("/vendor-setup/set-password", async (req, res) => {
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

    const result = await setVendorPassword(token, password);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("set password error", error);
    return res.status(500).json({
      success: false,
      message: "Серверийн алдаа",
    });
  }
});

/**
 * POST /vendor-setup/regenerate-token
 * Regenerate invite token for a registration request (admin only)
 */
router.post("/vendor-setup/regenerate-token", async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "Request ID шаардлагатай",
      });
    }

    const result = await regenerateInviteToken(requestId);

    return res.json({
      success: true,
      message: "Token амжилттай шинэчлэгдлээ",
      data: result,
    });
  } catch (error) {
    console.error("regenerate token error", error);
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Token шинэчлэхэд алдаа гарлаа",
    });
  }
});

export default router;
