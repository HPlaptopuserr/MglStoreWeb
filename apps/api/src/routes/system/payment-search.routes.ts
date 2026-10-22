import { Router, type Router as RouterType } from "express";
import type { PaymentSearchResponse } from "@mgl/types";
import { prisma } from "@mgl/database";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  expectedNet,
  parsePaymentSearch,
  paymentSearchWhere,
  PaymentSearchInputError,
} from "../../services/payment-search";

const router: RouterType = Router();
router.get(
  "/admin/payments/search",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const input = parsePaymentSearch(req.query);
      const where = paymentSearchWhere(input);
      const pageSize = 20;
      const [total, payments] = await prisma.$transaction([
        prisma.paymentAttempt.count({ where }),
        prisma.paymentAttempt.findMany({
          where,
          skip: (input.page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            providerRef: true,
            paidAt: true,
            order: {
              select: {
                orderNumber: true,
                phone: true,
                status: true,
                organization: { select: { name: true } },
                customer: {
                  select: { profile: { select: { fullName: true } } },
                },
                items: { select: { productName: true, quantity: true } },
              },
            },
          },
        }),
      ]);
      const response: PaymentSearchResponse = {
        mode: input.mode,
        date: input.date,
        total,
        page: input.page,
        pageSize,
        data: payments.map(({ order, ...payment }) => ({
          ...payment,
          paidAt: payment.paidAt?.toISOString() ?? null,
          amount: payment.amount.toFixed(2),
          expectedNet: expectedNet(payment.amount, input),
          orderNumber: order.orderNumber,
          phone: order.phone,
          customerName: order.customer.profile?.fullName ?? "Нэр бүртгэлгүй",
          storeName: order.organization.name,
          orderStatus: order.status,
          items: order.items,
        })),
      };
      res.json(response);
    } catch (error) {
      if (error instanceof PaymentSearchInputError)
        return res.status(400).json({ message: error.message });
      console.error("[admin/payments/search] failed");
      res
        .status(500)
        .json({ message: "Төлбөр хайхад алдаа гарлаа. Дахин оролдоно уу." });
    }
  },
);
export default router;
