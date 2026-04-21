import * as XLSX from "xlsx";
import JSZip from "jszip";
import crypto from "crypto";
import { getSupabase, PRODUCT_IMAGES_BUCKET } from "./supabase";

/**
 * Extract embedded images from an XLSX file buffer.
 * Returns a map: row index (0-based, row 0 = header) → array of image Buffers.
 *
 * Three strategies are tried in order:
 *  1. Place-in-Cell (Excel 365+ richData)
 *  2. Drawing-based floating images
 *  3. Sequential media fallback
 */
export async function extractExcelImages(buffer: Buffer): Promise<Map<number, Buffer[]>> {
  const rowImages = new Map<number, Buffer[]>();
  try {
    const zip = await JSZip.loadAsync(buffer);
    const allFiles = Object.keys(zip.files);
    const mediaFiles = allFiles.filter((f) => f.startsWith("xl/media/"));
    console.log("[excel-images] Total files:", allFiles.length, "Media files:", mediaFiles.length);

    if (mediaFiles.length === 0) {
      return rowImages;
    }

    // Strategy 1: "Place in Cell" — Excel 365+ richData system
    const richValueRelFile = zip.file("xl/richData/richValueRel.xml");
    const richValueRelRelsFile = zip.file("xl/richData/_rels/richValueRel.xml.rels");
    if (richValueRelFile && richValueRelRelsFile) {
      console.log("[excel-images] Found richData files — trying Place-in-Cell strategy");

      const relsXml = await richValueRelRelsFile.async("text");
      const rIdToMedia = new Map<string, string>();
      for (const m of relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) {
        const target = m[2].startsWith("../") ? m[2].replace("../", "xl/") : `xl/richData/${m[2]}`;
        rIdToMedia.set(m[1], target);
      }

      const relXml = await richValueRelFile.async("text");
      const orderedRIds: string[] = [];
      for (const m of relXml.matchAll(/<rel\s[^>]*r:id="(rId\d+)"/g)) {
        orderedRIds.push(m[1]);
      }

      const rdRichValueFile = zip.file("xl/richData/rdrichvalue.xml");
      const rvToRelIndex: number[] = [];
      if (rdRichValueFile) {
        const rvXml = await rdRichValueFile.async("text");
        const rvBlocks = rvXml.matchAll(/<rv\s[^>]*>([\s\S]*?)<\/rv>/g);
        for (const block of rvBlocks) {
          const firstV = block[1].match(/<v>(\d+)<\/v>/);
          rvToRelIndex.push(firstV ? parseInt(firstV[1]) : -1);
        }
      }

      const metadataFile = zip.file("xl/metadata.xml");
      const vmToRvIndex = new Map<number, number>();
      if (metadataFile) {
        const metaXml = await metadataFile.async("text");
        const rvbIndices: number[] = [];
        for (const m of metaXml.matchAll(/<xlrd:rvb\s+i="(\d+)"/g)) {
          rvbIndices.push(parseInt(m[1]));
        }
        const vmEntries = metaXml.match(/<valueMetadata[\s\S]*?<\/valueMetadata>/);
        if (vmEntries) {
          const rcMatches = vmEntries[0].matchAll(/<rc\s+t="\d+"\s+v="(\d+)"/g);
          let vmIdx = 1;
          for (const rc of rcMatches) {
            const futureIdx = parseInt(rc[1]);
            if (futureIdx < rvbIndices.length) {
              vmToRvIndex.set(vmIdx, rvbIndices[futureIdx]);
            }
            vmIdx++;
          }
        }
      }

      const sheetFile = zip.file("xl/worksheets/sheet1.xml") ||
        allFiles.filter(f => /xl\/worksheets\/sheet\d+\.xml$/.test(f)).sort()[0]
          ? zip.file(allFiles.filter(f => /xl\/worksheets\/sheet\d+\.xml$/.test(f)).sort()[0])
          : null;

      if (sheetFile) {
        const sheetXml = await sheetFile.async("text");
        const cellMatches = sheetXml.matchAll(/<c\s+r="([A-Z]+)(\d+)"[^>]*\bvm="(\d+)"[^>]*>/g);
        for (const cm of cellMatches) {
          const row = parseInt(cm[2]) - 1;
          const vm = parseInt(cm[3]);
          const rvIdx = vmToRvIndex.get(vm);
          if (rvIdx === undefined) continue;
          const relIdx = rvToRelIndex[rvIdx];
          if (relIdx === undefined || relIdx < 0) continue;
          const rId = orderedRIds[relIdx];
          if (!rId) continue;
          const mediaPath = rIdToMedia.get(rId);
          if (!mediaPath) continue;
          const mediaFileEntry = zip.file(mediaPath);
          if (!mediaFileEntry) continue;
          const imgBuffer = Buffer.from(await mediaFileEntry.async("arraybuffer"));
          const existing = rowImages.get(row) || [];
          if (existing.length < 5) {
            existing.push(imgBuffer);
            rowImages.set(row, existing);
          }
        }
      }

      if (rowImages.size > 0) {
        console.log("[excel-images] Place-in-Cell strategy: found images for rows:", [...rowImages.keys()]);
        return rowImages;
      }
    }

    // Strategy 2: "Place over Cells" — drawing-based floating images
    const relsMap = new Map<string, string>();
    const drawingRelsFiles = allFiles.filter(
      (f) => /xl\/drawings\/_rels\/drawing\d+\.xml\.rels/.test(f)
    );
    for (const relsFile of drawingRelsFiles) {
      const relsXml = await zip.file(relsFile)!.async("text");
      const relMatches = relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g);
      for (const m of relMatches) {
        const target = m[2].startsWith("../") ? m[2].replace("../", "xl/") : `xl/drawings/${m[2]}`;
        relsMap.set(m[1], target);
      }
    }

    const drawingFiles = allFiles.filter(
      (f) => /xl\/drawings\/drawing\d+\.xml$/.test(f)
    );
    let drawingImagesFound = false;
    for (const drawingFile of drawingFiles) {
      const xml = await zip.file(drawingFile)!.async("text");
      const anchorBlocks = xml.matchAll(/<xdr:(?:twoCellAnchor|oneCellAnchor)[^>]*>([\s\S]*?)<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/g);
      for (const block of anchorBlocks) {
        const content = block[1];
        const rowMatch = content.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/);
        const embedMatch = content.match(/r:embed="(rId\d+)"/);
        if (rowMatch && embedMatch) {
          const row = parseInt(rowMatch[1]);
          const mediaPath = relsMap.get(embedMatch[1]);
          if (mediaPath) {
            const mediaFile = zip.file(mediaPath);
            if (mediaFile) {
              const imgBuffer = Buffer.from(await mediaFile.async("arraybuffer"));
              const existing = rowImages.get(row) || [];
              existing.push(imgBuffer);
              rowImages.set(row, existing);
              drawingImagesFound = true;
            }
          }
        }
      }
    }

    if (drawingImagesFound) {
      console.log("[excel-images] Drawing strategy: found images for rows:", [...rowImages.keys()]);
      return rowImages;
    }

    // Strategy 3: Sequential fallback
    console.log("[excel-images] Trying sequential media assignment...");
    const sortedMedia = mediaFiles.sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.match(/\d+/)?.[0] || "0");
      return numA - numB;
    });

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows = sheetName ? XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) : [];
    const dataRowCount = rows.length;

    if (sortedMedia.length > 0 && sortedMedia.length <= dataRowCount * 5) {
      const imagesPerRow = Math.ceil(sortedMedia.length / dataRowCount);
      for (let i = 0; i < sortedMedia.length; i++) {
        const mediaFile = zip.file(sortedMedia[i]);
        if (mediaFile) {
          const imgBuffer = Buffer.from(await mediaFile.async("arraybuffer"));
          const rowIdx = Math.floor(i / imagesPerRow) + 1;
          const existing = rowImages.get(rowIdx) || [];
          if (existing.length < 5) {
            existing.push(imgBuffer);
            rowImages.set(rowIdx, existing);
          }
        }
      }
      console.log("[excel-images] Sequential strategy: assigned images to rows:", [...rowImages.keys()]);
    }
  } catch (err) {
    console.error("extractExcelImages error:", err);
  }
  return rowImages;
}

export function getImageMimeType(buf: Buffer): string {
  if (buf[0] === 0xFF && buf[1] === 0xD8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "image/gif";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return "image/png";
}

export function getImageExt(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg", "image/png": ".png",
    "image/gif": ".gif", "image/webp": ".webp",
  };
  return map[mime] || ".png";
}

export async function uploadBufferToSupabase(buf: Buffer): Promise<string | null> {
  try {
    const mime = getImageMimeType(buf);
    const ext = getImageExt(mime);
    const fileName = `products/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;

    const { error } = await getSupabase().storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(fileName, buf, { contentType: mime, upsert: false });

    if (error) {
      console.error("supabase upload error", error);
      return null;
    }

    const { data } = getSupabase().storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (err) {
    console.error("uploadBufferToSupabase error", err);
    return null;
  }
}

/** Bilingual column name mapping for product Excel import */
export const PRODUCT_COL_MAP = {
  name:        ["name", "Нэр", "нэр", "Нэр (name)", "Барааны нэр"],
  sku:         ["sku", "SKU", "Код", "код", "SKU (sku)", "№"],
  price:       ["price", "Үнэ", "үнэ", "Үнэ (price)", "Ф50", "Ф100"],
  costPrice:   ["costPrice", "Өртөг", "өртөг", "Өртөг (costPrice)", "Өртөг үнэ"],
  stock:       ["stock", "Нөөц", "нөөц", "Нөөц (stock)", "Тоо ширхэг"],
  description: ["description", "Тайлбар", "тайлбар", "Тайлбар (description)"],
  images:      ["images", "Зураг", "зураг", "Зураг URL", "Зураг URL (images)", "Image", "image"],
};

export function resolveCol(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return undefined;
}
