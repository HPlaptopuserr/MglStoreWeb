import type { Request, Response, RequestHandler } from "express";
import { GroupError } from "../../services/organization-groups/policy";
export function endpoint(
  run: (req: Request, res: Response) => Promise<unknown>,
): RequestHandler {
  return (req, res) => {
    void run(req, res).catch((error: unknown) => {
      if (error instanceof GroupError) {
        res.status(error.status).json({ message: error.message });
        return;
      }
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        ["P2002", "P2034"].includes(String(error.code))
      ) {
        res.status(409).json({
          message: "Давхардсан үйлдэл байна. Шинэчлээд дахин оролдоно уу.",
        });
        return;
      }
      console.error("[organization-groups]", error);
      res.status(500).json({
        message:
          "Группийн мэдээллийг боловсруулж чадсангүй. Дахин оролдоно уу.",
      });
    });
  };
}
export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string" || !value || value.length > 160)
    throw new GroupError(400, "ID буруу байна.");
  return value;
}
