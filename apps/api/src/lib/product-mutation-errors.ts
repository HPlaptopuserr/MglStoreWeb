import { Prisma } from "@mgl/database";
import { ProductInventoryConflictError } from "../services/vendor-inventory-warehouse.service";

/** Only known, safe messages are returned to the vendor. Log the cause separately. */
export function productMutationErrorResponse(error: unknown): {
  status: number;
  message: string;
} {
  if (error instanceof ProductInventoryConflictError) {
    return { status: 409, message: error.message };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return {
          status: 409,
          message: "Барааны код (SKU) давхардсан байна. Өөр код оруулна уу.",
        };
      case "P2003":
        return {
          status: 409,
          message: "Барааны холбоотой мэдээлэл өөрчлөгдсөн байна. Хуудсыг шинэчлээд дахин оролдоно уу.",
        };
      case "P2025":
        return { status: 404, message: "Бараа эсвэл холбоотой мэдээлэл олдсонгүй." };
      case "P2034":
        return {
          status: 409,
          message: "Барааг зэрэг шинэчилсэн байна. Хуудсыг шинэчлээд дахин оролдоно уу.",
        };
    }
  }
  return { status: 500, message: "Бараа засахад алдаа гарлаа" };
}
