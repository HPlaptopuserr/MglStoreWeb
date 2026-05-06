/**
 * Migrates base64 product images stored in DB → Supabase Storage.
 * Safe to re-run: skips already-migrated records (non-base64 URLs).
 *
 * Usage:
 *   cd apps/api
 *   npx ts-node --project tsconfig.json src/scripts/migrate-base64-images.ts
 */

import "../config/env";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();
const BUCKET = "product-images";
const BATCH = 50;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
  return createClient(url, key);
}

function base64ToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  return map[mime] ?? ".jpg";
}

async function main() {
  const supabase = getSupabase();

  const total = await prisma.productImage.count({
    where: { url: { startsWith: "data:" } },
  });

  if (total === 0) {
    console.log("✓ Base64 зураг олдсонгүй — migration шаардлагагүй.");
    return;
  }

  console.log(`▶ ${total} ширхэг base64 зураг migration хийнэ...\n`);

  let processed = 0;
  let success = 0;
  let failed = 0;
  let skip = 0;

  while (true) {
    const batch = await prisma.productImage.findMany({
      where: { url: { startsWith: "data:" } },
      select: { id: true, url: true, productId: true },
      take: BATCH,
    });

    if (batch.length === 0) break;

    for (const img of batch) {
      processed++;
      const parsed = base64ToBuffer(img.url);

      if (!parsed) {
        console.warn(`  [${processed}/${total}] SKIP — base64 parse амжилтгүй: ${img.id}`);
        // Not a valid base64, clear it to avoid bloat
        await prisma.productImage.delete({ where: { id: img.id } });
        skip++;
        continue;
      }

      const ext = mimeToExt(parsed.mimeType);
      const fileName = `products/${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, parsed.buffer, {
          contentType: parsed.mimeType,
          upsert: false,
        });

      if (error) {
        console.error(`  [${processed}/${total}] FAIL — upload алдаа (${img.id}): ${error.message}`);
        failed++;
        continue;
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

      await prisma.productImage.update({
        where: { id: img.id },
        data: { url: urlData.publicUrl },
      });

      console.log(`  [${processed}/${total}] OK — ${img.id} → ${urlData.publicUrl.slice(0, 60)}...`);
      success++;
    }
  }

  console.log(`\n✓ Дууслаа: ${success} амжилттай, ${failed} алдаа, ${skip} алгасав`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
