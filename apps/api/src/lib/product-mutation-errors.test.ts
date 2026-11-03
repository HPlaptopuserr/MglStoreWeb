import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@mgl/database";
import { ProductInventoryConflictError } from "../services/vendor-inventory-warehouse.service";
import { productMutationErrorResponse } from "./product-mutation-errors";

test("warehouse conflicts expose an actionable message instead of a generic 500", () => {
  const message = "Бараа олон агуулахад байна. Агуулахыг тодорхой сонгоно уу.";
  assert.deepEqual(productMutationErrorResponse(new ProductInventoryConflictError(message)), {
    status: 409, message,
  });
});

test("database conflicts return safe client errors without leaking database details", () => {
  for (const [code, status] of [["P2002", 409], ["P2003", 409], ["P2025", 404], ["P2034", 409]] as const) {
    const error = new Prisma.PrismaClientKnownRequestError("private database detail", {
      code, clientVersion: "5.22.0",
    });
    const response = productMutationErrorResponse(error);
    assert.equal(response.status, status);
    assert.ok(!response.message.includes("private database detail"));
  }
});

test("unknown failures remain server errors and do not expose exception messages", () => {
  assert.deepEqual(productMutationErrorResponse(new Error("private database detail")), {
    status: 500, message: "Бараа засахад алдаа гарлаа",
  });
});
