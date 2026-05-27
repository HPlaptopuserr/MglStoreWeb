import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { requireAuth } from "../../middleware/auth";

const router: ExpressRouter = Router();

// ── GET /deliveries — courier's assigned delivery jobs
router.get("/deliveries", requireAuth, async (req, res) => {
  try {
    const courierId = (req as any).user.id;
    const deliveries = await prisma.delivery.findMany({
      where: {
        courierId,
      },
      include: {
        order: {
          include: {
            customer: {
              select: {
                email: true,
                profile: {
                  select: {
                    fullName: true,
                    phoneNumber: true,
                  },
                },
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(deliveries);
  } catch (error) {
    console.error("GET /deliveries error", error);
    res.status(500).json({ message: "Хүргэлтийн жагсаалт авахад алдаа гарлаа" });
  }
});

// ── GET /deliveries/:id — delivery detail
router.get("/deliveries/:id", requireAuth, async (req, res) => {
  try {
    const delivery = await prisma.delivery.findFirst({
      where: {
        id: req.params.id,
        courierId: (req as any).user.id,
      },
      include: {
        order: {
          include: {
            customer: {
              select: {
                email: true,
                profile: {
                  select: {
                    fullName: true,
                    phoneNumber: true,
                  },
                },
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!delivery) {
      res.status(404).json({ message: "Хүргэлт олдсонгүй" });
      return;
    }

    res.json(delivery);
  } catch (error) {
    console.error("GET /deliveries/:id error", error);
    res.status(500).json({ message: "Хүргэлтийн мэдээлэл авахад алдаа гарлаа" });
  }
});

// ── POST/PATCH /deliveries/:id/status — update delivery status
const updateStatusHandler = async (req: any, res: any) => {
  try {
    const { status, proofImage } = req.body;
    const deliveryId = req.params.id;
    const courierId = req.user.id;

    const delivery = await prisma.delivery.findFirst({
      where: { id: deliveryId, courierId },
    });

    if (!delivery) {
      res.status(404).json({ message: "Хүргэлт олдсонгүй" });
      return;
    }

    const validStatuses = ["WAITING", "PICKING", "DELIVERING", "COMPLETED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: "Буруу статус" });
      return;
    }

    const updateData: any = {
      status: status as any,
    };

    if (status === "DELIVERING" && !delivery.pickupTime) {
      updateData.pickupTime = new Date();
    }

    if (status === "COMPLETED") {
      updateData.deliveredAt = new Date();
      if (proofImage) {
        updateData.proofImage = proofImage;
      }
    }

    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: updateData,
    });

    // Update associated Order status
    let orderStatus = "SHIPPING";
    if (status === "COMPLETED") {
      orderStatus = "COMPLETED";
    } else if (status === "CANCELLED") {
      orderStatus = "CANCELLED";
    } else if (status === "PICKING" || status === "DELIVERING") {
      orderStatus = "SHIPPING";
    }

    await prisma.order.update({
      where: { id: delivery.orderId },
      data: { status: orderStatus as any },
    });

    res.json(updated);
  } catch (error) {
    console.error("Update delivery status error", error);
    res.status(500).json({ message: "Хүргэлтийн статус шинэчлэхэд алдаа гарлаа" });
  }
};

router.post("/deliveries/:id/status", requireAuth, updateStatusHandler);
router.patch("/deliveries/:id/status", requireAuth, updateStatusHandler);

// ── POST /driver/location — submit courier real-time GPS location
router.post("/driver/location", requireAuth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const userId = (req as any).user.id;

    if (typeof lat !== "number" || typeof lng !== "number") {
      res.status(400).json({ message: "Буруу координат" });
      return;
    }

    const location = await prisma.courierLocationHistory.create({
      data: {
        userId,
        lat,
        lng,
      },
    });

    res.status(201).json(location);
  } catch (error) {
    console.error("POST /driver/location error", error);
    res.status(500).json({ message: "Байршил хадгалахад алдаа гарлаа" });
  }
});

export default router;
