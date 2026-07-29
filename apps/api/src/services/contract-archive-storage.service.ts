import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import type { Request } from "express";
import { getSupabase, PRODUCT_IMAGES_BUCKET } from "../lib/supabase";

export const LOCAL_CONTRACT_UPLOADS_DIR = path.resolve(
  __dirname,
  "../../uploads/contracts",
);

export class ContractStorageConfigurationError extends Error {
  constructor() {
    super("Contract archive storage is not configured");
    this.name = "ContractStorageConfigurationError";
  }
}

function createStoredFileName(originalName: string): string {
  const extension = path.extname(originalName).toLowerCase() || ".pdf";
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
}

function getApiBaseUrl(req: Request): string {
  return String(
    process.env.API_PUBLIC_URL ||
      process.env.API_URL ||
      `${req.protocol}://${req.get("host")}`,
  ).replace(/\/$/, "");
}

export async function storeScannedContractFile(
  req: Request,
  file: Express.Multer.File,
): Promise<string> {
  const storedName = createStoredFileName(file.originalname);

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const storagePath = `contracts/${storedName}`;
    const supabase = getSupabase();
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });
    if (error) throw error;
    return supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(storagePath).data.publicUrl;
  }

  if (process.env.MGL_LOCAL_DEV !== "true") {
    throw new ContractStorageConfigurationError();
  }

  await fs.mkdir(LOCAL_CONTRACT_UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_CONTRACT_UPLOADS_DIR, storedName), file.buffer, {
    flag: "wx",
  });
  return `${getApiBaseUrl(req)}/api/contracts/uploads/${encodeURIComponent(storedName)}`;
}
