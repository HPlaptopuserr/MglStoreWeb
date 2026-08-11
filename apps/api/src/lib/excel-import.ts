import * as XLSX from "xlsx";
import JSZip from "jszip";
import crypto from "crypto";
import sharp from "sharp";
import { getSupabase, PRODUCT_IMAGES_BUCKET } from "./supabase";

export const EXCEL_ROW_INDEX_KEY = "__excelRowIndex";
export const PRODUCT_IMPORT_FILE_SIZE_LIMIT_MB = 25;
export const PRODUCT_IMPORT_FILE_SIZE_LIMIT_BYTES =
  PRODUCT_IMPORT_FILE_SIZE_LIMIT_MB * 1024 * 1024;

function parseExcelRowIndex(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function getExcelRowIndex(
  row: Record<string, unknown>,
  fallbackDataIndex: number,
): number {
  return parseExcelRowIndex(row[EXCEL_ROW_INDEX_KEY]) ?? fallbackDataIndex + 1;
}

/**
 * Extract embedded images from an XLSX file buffer.
 * Returns a map: row index (0-based, row 0 = header) → array of image Buffers.
 *
 * Three strategies are tried in order:
 *  1. Place-in-Cell (Excel 365+ richData)
 *  2. Drawing-based floating images
 *  3. Sequential media fallback
 */
export async function extractExcelImages(
  buffer: Buffer,
): Promise<Map<number, Buffer[]>> {
  const rowImages = new Map<number, Buffer[]>();
  try {
    const zip = await JSZip.loadAsync(buffer);
    const allFiles = Object.keys(zip.files);
    const mediaFiles = allFiles.filter((f) => f.startsWith("xl/media/"));
    console.log(
      "[excel-images] Total files:",
      allFiles.length,
      "Media files:",
      mediaFiles.length,
    );

    if (mediaFiles.length === 0) {
      return rowImages;
    }

    // Strategy 1: "Place in Cell" — Excel 365+ richData system
    const richValueRelFile = zip.file("xl/richData/richValueRel.xml");
    const richValueRelRelsFile = zip.file(
      "xl/richData/_rels/richValueRel.xml.rels",
    );
    if (richValueRelFile && richValueRelRelsFile) {
      console.log(
        "[excel-images] Found richData files — trying Place-in-Cell strategy",
      );

      const relsXml = await richValueRelRelsFile.async("text");
      const rIdToMedia = new Map<string, string>();
      for (const m of relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) {
        const target = m[2].startsWith("../")
          ? m[2].replace("../", "xl/")
          : `xl/richData/${m[2]}`;
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
        const vmEntries = metaXml.match(
          /<valueMetadata[\s\S]*?<\/valueMetadata>/,
        );
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

      const sheetPath = zip.file("xl/worksheets/sheet1.xml")
        ? "xl/worksheets/sheet1.xml"
        : allFiles
            .filter((f) => /xl\/worksheets\/sheet\d+\.xml$/.test(f))
            .sort()[0];
      const sheetFile = sheetPath ? zip.file(sheetPath) : null;

      if (sheetFile) {
        const sheetXml = await sheetFile.async("text");
        const cellMatches = sheetXml.matchAll(
          /<c\s+r="([A-Z]+)(\d+)"[^>]*\bvm="(\d+)"[^>]*>/g,
        );
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
          const imgBuffer = Buffer.from(
            await mediaFileEntry.async("arraybuffer"),
          );
          const existing = rowImages.get(row) || [];
          if (existing.length < 5) {
            existing.push(imgBuffer);
            rowImages.set(row, existing);
          }
        }
      }

      if (rowImages.size > 0) {
        console.log(
          "[excel-images] Place-in-Cell strategy: found images for rows:",
          [...rowImages.keys()],
        );
        return rowImages;
      }
    }

    // Strategy 2: "Place over Cells" — drawing-based floating images
    const relsMap = new Map<string, string>();
    const drawingRelsFiles = allFiles.filter((f) =>
      /xl\/drawings\/_rels\/drawing\d+\.xml\.rels/.test(f),
    );
    for (const relsFile of drawingRelsFiles) {
      const relsXml = await zip.file(relsFile)!.async("text");
      const relMatches = relsXml.matchAll(
        /Id="(rId\d+)"[^>]*Target="([^"]+)"/g,
      );
      for (const m of relMatches) {
        const target = m[2].startsWith("../")
          ? m[2].replace("../", "xl/")
          : `xl/drawings/${m[2]}`;
        relsMap.set(m[1], target);
      }
    }

    const drawingFiles = allFiles.filter((f) =>
      /xl\/drawings\/drawing\d+\.xml$/.test(f),
    );
    let drawingImagesFound = false;
    for (const drawingFile of drawingFiles) {
      const xml = await zip.file(drawingFile)!.async("text");
      const anchorBlocks = xml.matchAll(
        /<xdr:(?:twoCellAnchor|oneCellAnchor)[^>]*>([\s\S]*?)<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/g,
      );
      for (const block of anchorBlocks) {
        const content = block[1];
        const rowMatch = content.match(
          /<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/,
        );
        const embedMatch = content.match(/r:embed="(rId\d+)"/);
        if (rowMatch && embedMatch) {
          const row = parseInt(rowMatch[1]);
          const mediaPath = relsMap.get(embedMatch[1]);
          if (mediaPath) {
            const mediaFile = zip.file(mediaPath);
            if (mediaFile) {
              const imgBuffer = Buffer.from(
                await mediaFile.async("arraybuffer"),
              );
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
      console.log("[excel-images] Drawing strategy: found images for rows:", [
        ...rowImages.keys(),
      ]);
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
    const rows = sheetName
      ? XLSX.utils.sheet_to_json<Record<string, unknown>>(
          workbook.Sheets[sheetName],
        )
      : [];
    const rowIndexes = rows.map((row, idx) =>
      getExcelRowIndex(normalizeExcelRow(row), idx),
    );
    const dataRowCount = rowIndexes.length;

    if (sortedMedia.length > 0 && sortedMedia.length <= dataRowCount * 5) {
      const imagesPerRow = Math.ceil(sortedMedia.length / dataRowCount);
      for (let i = 0; i < sortedMedia.length; i++) {
        const mediaFile = zip.file(sortedMedia[i]);
        if (mediaFile) {
          const imgBuffer = Buffer.from(await mediaFile.async("arraybuffer"));
          const rowIdx =
            rowIndexes[Math.floor(i / imagesPerRow)] ??
            Math.floor(i / imagesPerRow) + 1;
          const existing = rowImages.get(rowIdx) || [];
          if (existing.length < 5) {
            existing.push(imgBuffer);
            rowImages.set(rowIdx, existing);
          }
        }
      }
      console.log(
        "[excel-images] Sequential strategy: assigned images to rows:",
        [...rowImages.keys()],
      );
    }
  } catch (err) {
    console.error("extractExcelImages error:", err);
  }
  return rowImages;
}

export function getImageMimeType(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "image/gif";
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  return "image/png";
}

export function getImageExt(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
  };
  return map[mime] || ".png";
}

export async function optimizeProductImageBuffer(buf: Buffer): Promise<Buffer> {
  return sharp(buf, { animated: false })
    .rotate()
    .resize({
      width: 1200,
      height: 1200,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
}

export async function uploadBufferToSupabase(
  buf: Buffer,
): Promise<string | null> {
  try {
    const optimized = await optimizeProductImageBuffer(buf);
    const fileName = `products/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.webp`;

    const { error } = await getSupabase()
      .storage.from(PRODUCT_IMAGES_BUCKET)
      .upload(fileName, optimized, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });

    if (error) {
      console.error("supabase upload error", error);
      return null;
    }

    const { data } = getSupabase()
      .storage.from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (err) {
    console.error("uploadBufferToSupabase error", err);
    return null;
  }
}

/** Bilingual column name mapping for product Excel import */
export const PRODUCT_COL_MAP = {
  name: ["name", "Нэр", "нэр", "Нэр (name)", "Барааны нэр"],
  sku: ["sku", "SKU", "Код", "код", "SKU (sku)", "№"],
  barcode: ["barcode", "Barcode", "Баркод", "баркод", "Баркод (barcode)"],
  businessCategory: [
    "businessCategory",
    "businessCategoryId",
    "category",
    "categoryId",
    "Ангилал",
    "ангилал",
    "Ангилал (businessCategory)",
    "Барааны ангилал",
  ],
  price: ["price", "Үнэ", "үнэ", "Үнэ (price)", "Ф50", "Ф100"],
  wholesalePrice: [
    "wholesalePrice",
    "Wholesale price",
    "Бөөний үнэ",
    "бөөний үнэ",
    "Бөөний үнэ (wholesalePrice)",
  ],
  orderPrice: [
    "orderPrice",
    "Order price",
    "Захиалгын үнэ",
    "захиалгын үнэ",
    "Захиалгын үнэ (orderPrice)",
  ],
  costPrice: ["costPrice", "Өртөг", "өртөг", "Өртөг (costPrice)", "Өртөг үнэ"],
  stock: ["stock", "Нөөц", "нөөц", "Нөөц (stock)", "Тоо ширхэг"],
  expiryDate: [
    "expiryDate",
    "Expiry date",
    "Дуусах хугацаа",
    "дуусах хугацаа",
    "Дуусах хугацаа (expiryDate)",
  ],
  taxType: [
    "taxType",
    "Tax type",
    "Татварын төрөл",
    "татварын төрөл",
    "Татварын төрөл (taxType)",
  ],
  cityTaxRate: [
    "cityTaxRate",
    "City tax rate",
    "Хотын татвар",
    "хотын татвар",
    "Хотын татвар %",
    "Хотын татвар (cityTaxRate)",
  ],
  classificationCode: [
    "classificationCode",
    "Classification code",
    "Ангиллын код",
    "ангиллын код",
    "Ангиллын код (classificationCode)",
  ],
  taxProductCode: [
    "taxProductCode",
    "Tax product code",
    "Татварын ангиллын код",
    "татварын ангиллын код",
    "Татварын ангиллын код (taxProductCode)",
  ],
  marketplacePriority: [
    "marketplacePriority",
    "Marketplace priority",
    "Marketplace дараалал",
    "marketplace дараалал",
    "Marketplace дараалал (marketplacePriority)",
  ],
  description: ["description", "Тайлбар", "тайлбар", "Тайлбар (description)"],
  preorderLeadTimeDays: [
    "preorderLeadTimeDays",
    "Ирэх хоног",
    "ирэх хоног",
    "Ирэх хоног (preorderLeadTimeDays)",
    "Захиалгын хугацаа",
  ],
  preorderNote: [
    "preorderNote",
    "Захиалгын тайлбар",
    "захиалгын тайлбар",
    "Захиалгын тайлбар (preorderNote)",
    "Ирэх нөхцөл",
  ],
  images: [
    "images",
    "Зураг",
    "зураг",
    "Зураг URL",
    "Зураг URL (images)",
    "Image",
    "image",
  ],
};

export function resolveCol(
  row: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "")
      return row[key];
  }

  const normalizedKeys = new Set(keys.map((key) => key.trim().toLowerCase()));
  for (const [rowKey, value] of Object.entries(row)) {
    if (value === undefined || value === null || value === "") continue;
    if (normalizedKeys.has(rowKey.trim().toLowerCase())) return value;
  }

  return undefined;
}

export function normalizeExcelRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  const rowIndex = parseExcelRowIndex(
    (row as { __rowNum__?: unknown }).__rowNum__,
  );
  if (rowIndex !== null) normalized[EXCEL_ROW_INDEX_KEY] = rowIndex;

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key.trim();
    if (!normalizedKey || normalizedKey === "__rowNum__") continue;
    normalized[normalizedKey] = value;
  }
  return normalized;
}

export type ImportBusinessCategoryOption = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

type ImportBusinessCategoryNode = ImportBusinessCategoryOption & {
  children: ImportBusinessCategoryNode[];
};

export type ImportBusinessCategoryChoice = {
  id: string;
  name: string;
  slug: string;
  label: string;
};

function normalizeImportCategoryValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function buildBusinessCategoryChoices(
  categories: ImportBusinessCategoryOption[],
): ImportBusinessCategoryChoice[] {
  const nodeById = new Map<string, ImportBusinessCategoryNode>();
  for (const category of categories) {
    nodeById.set(category.id, { ...category, children: [] });
  }

  const roots: ImportBusinessCategoryNode[] = [];
  for (const node of nodeById.values()) {
    const parent = node.parentId ? nodeById.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const choices: ImportBusinessCategoryChoice[] = [];
  const visit = (node: ImportBusinessCategoryNode, path: string[]) => {
    const nextPath = [...path, node.name];
    choices.push({
      id: node.id,
      name: node.name,
      slug: node.slug,
      label: nextPath.join(" / "),
    });
    for (const child of node.children.sort((a, b) =>
      a.name.localeCompare(b.name, "mn"),
    )) {
      visit(child, nextPath);
    }
  };

  for (const root of roots.sort((a, b) => a.name.localeCompare(b.name, "mn"))) {
    visit(root, []);
  }

  return choices;
}

export function resolveBusinessCategoryIdFromChoices(
  value: unknown,
  choices: ImportBusinessCategoryChoice[],
): string | null | undefined {
  const normalized = normalizeImportCategoryValue(value);
  if (!normalized) return null;

  const matched = choices.find((choice) =>
    [choice.id, choice.slug, choice.name, choice.label].some(
      (candidate) => normalizeImportCategoryValue(candidate) === normalized,
    ),
  );

  return matched?.id;
}

export async function addCategoryDropdownToWorkbook(
  buffer: Buffer,
  categoryCount: number,
  taxTypeColumn = "J",
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const sheetPath = "xl/worksheets/sheet1.xml";
  const sheetFile = zip.file(sheetPath);
  if (!sheetFile) return buffer;

  let sheetXml = await sheetFile.async("text");
  const validations = [
    ...(categoryCount > 0
      ? [
          `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Ангилал буруу" error="Жагсаалтаас ангиллаа сонгоно уу" sqref="D2:D1001">` +
            `<formula1>&apos;Ангиллууд&apos;!$A$2:$A$${categoryCount + 1}</formula1>` +
            `</dataValidation>`,
        ]
      : []),
    `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Татварын төрөл буруу" error="Жагсаалтаас татварын төрлөө сонгоно уу" sqref="${taxTypeColumn}2:${taxTypeColumn}1001">` +
      `<formula1>&apos;Татварын төрөл&apos;!$A$2:$A$5</formula1>` +
      `</dataValidation>`,
  ];
  const validationXml =
    `<dataValidations count="${validations.length}">` +
    validations.join("") +
    `</dataValidations>`;

  sheetXml = sheetXml.replace(
    /<dataValidations\b[^>]*>[\s\S]*?<\/dataValidations>/,
    "",
  );

  if (sheetXml.includes("<ignoredErrors")) {
    sheetXml = sheetXml.replace(
      /(<ignoredErrors\b)/,
      (_match, ignoredErrorsTag) => `${validationXml}${ignoredErrorsTag}`,
    );
  } else if (sheetXml.includes("<pageMargins")) {
    sheetXml = sheetXml.replace(
      /(<pageMargins\b[^>]*\/>)/,
      (_match, pageMarginsTag) => `${validationXml}${pageMarginsTag}`,
    );
  } else {
    sheetXml = sheetXml.replace("</worksheet>", `${validationXml}</worksheet>`);
  }

  zip.file(sheetPath, sheetXml);

  return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}
