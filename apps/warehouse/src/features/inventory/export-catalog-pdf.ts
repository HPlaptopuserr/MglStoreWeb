import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import type { CatalogGroup } from "./catalog-data";
import { getOptimizedProductImageUrl } from "./product-image.utils";

const INK = rgb(0.09, 0.14, 0.24);
const MUTED = rgb(0.38, 0.43, 0.51);
const BLUE = rgb(0.16, 0.29, 0.72);
const BORDER = rgb(0.85, 0.88, 0.92);
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PER_PAGE = 12;

export interface CatalogPdfOptions {
  groups: CatalogGroup[];
  warehouseName: string;
  scopeLabel: string;
  generatedAt?: Date;
  signal: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
}

// Measure every line, including long SKUs and names without spaces.
function fitLines(
  text: string,
  font: PDFFont,
  width: number,
  size: number,
): string[] {
  const supported = new Set(font.getCharacterSet());
  const clean = Array.from(text.replace(/\s+/g, " ").trim())
    .map((character) =>
      supported.has(character.codePointAt(0) ?? 0) ? character : "?",
    )
    .join("");
  const lines: string[] = [];
  let line = "";
  for (const character of clean) {
    if (line && font.widthOfTextAtSize(line + character, size) > width) {
      const lastSpace = line.lastIndexOf(" ");
      if (lastSpace > 0) {
        lines.push(line.slice(0, lastSpace));
        line = line.slice(lastSpace + 1) + character;
      } else {
        lines.push(line);
        line = character.trimStart();
      }
    } else {
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function loadCatalogImage(
  url: string,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const response = await fetch(getOptimizedProductImageUrl(url, 240, 80), {
    signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)]),
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error("Зураг татаж чадсангүй");
  const bitmap = await createImageBitmap(await response.blob());
  try {
    const scale = Math.min(1, 240 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Зураг боловсруулах боломжгүй");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("Зураг боловсруулах боломжгүй")),
        "image/jpeg",
        0.85,
      );
    });
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    bitmap.close();
  }
}

export async function createCatalogPdf(
  options: CatalogPdfOptions,
  assets?: {
    fontBytes: Uint8Array;
    loadImage: (url: string, signal: AbortSignal) => Promise<Uint8Array>;
  },
): Promise<{ bytes: Uint8Array; missingImages: number; itemCount: number }> {
  const { groups, warehouseName, scopeLabel, signal, onProgress } = options;
  const generatedAt = options.generatedAt ?? new Date();
  const itemCount = groups.reduce(
    (count, group) => count + group.items.length,
    0,
  );
  if (!itemCount) throw new Error("Каталогт оруулах бараа олдсонгүй.");
  signal.throwIfAborted();
  let fontBytes = assets?.fontBytes;
  if (!fontBytes) {
    const response = await fetch("/fonts/NotoSans-Regular.ttf", {
      signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
    });
    if (!response.ok)
      throw new Error("PDF-ийн фонт ачаалсангүй. Дахин оролдоно уу.");
    fontBytes = new Uint8Array(await response.arrayBuffer());
  }
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  pdf.setTitle(`${warehouseName} - Худалдааны каталог`);
  pdf.setCreationDate(generatedAt);
  let completed = 0;
  let missingImages = 0;
  const totalPages = groups.reduce(
    (count, group) => count + Math.ceil(group.items.length / PER_PAGE),
    0,
  );

  for (const group of groups) {
    for (let start = 0; start < group.items.length; start += PER_PAGE) {
      signal.throwIfAborted();
      const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      const text = (
        value: string,
        x: number,
        y: number,
        size: number,
        width: number,
        maxLines = 1,
        color = INK,
      ) => {
        const lines = fitLines(value, font, width, size);
        lines.slice(0, maxLines).forEach((line, index) => {
          const visible =
            index === maxLines - 1 && lines.length > maxLines
              ? `${line.slice(0, -3)}...`
              : line;
          page.drawText(visible, {
            x,
            y: y - index * (size + 3),
            size,
            font,
            color,
          });
        });
      };
      text("MGL STORE / ХУДАЛДААНЫ КАТАЛОГ", 28, 810, 16, 540, 1, BLUE);
      const date = generatedAt.toLocaleDateString("mn-MN", {
        timeZone: "Asia/Ulaanbaatar",
      });
      text(
        `${warehouseName} | ${date} | ${itemCount} бараа`,
        28,
        790,
        9,
        540,
        1,
        MUTED,
      );
      text(scopeLabel, 28, 773, 8, 540, 1, MUTED);
      text(
        "Харилцагч: ____________________  Утас: ______________  Төлөөлөгч: ______________",
        28,
        754,
        9,
        540,
      );
      text(group.name, 28, 731, 11, 540, 2, BLUE);

      const batch = group.items.slice(start, start + PER_PAGE);
      // Bound image work to four concurrent requests and release decoded bitmaps immediately.
      const images: (PDFImage | null)[] = [];
      for (let offset = 0; offset < batch.length; offset += 4) {
        const loaded = await Promise.all(
          batch.slice(offset, offset + 4).map(async (item) => {
            const url = item.product.images[0]?.url;
            if (!url) return null;
            try {
              const bytes = await (assets?.loadImage ?? loadCatalogImage)(
                url,
                signal,
              );
              signal.throwIfAborted();
              return await pdf.embedJpg(bytes);
            } catch {
              signal.throwIfAborted();
              return null;
            }
          }),
        );
        images.push(...loaded);
        completed += loaded.length;
        onProgress?.(completed, itemCount);
      }

      batch.forEach((item, index) => {
        const x = 28 + (index % 2) * 274;
        const top = 700 - Math.floor(index / 2) * 108;
        page.drawRectangle({
          x,
          y: top - 100,
          width: 265,
          height: 100,
          borderWidth: 0.5,
          borderColor: BORDER,
        });
        const image = images[index];
        if (image) {
          const dimensions = image.scaleToFit(66, 72);
          page.drawImage(image, {
            x: x + 8 + (66 - dimensions.width) / 2,
            y: top - 80 + (72 - dimensions.height) / 2,
            ...dimensions,
          });
        } else {
          missingImages += 1;
          text(
            item.product.images.length ? "Зураг ачаалсангүй" : "Зураггүй",
            x + 8,
            top - 40,
            8,
            66,
            2,
            MUTED,
          );
        }
        text(item.product.name, x + 82, top - 15, 9, 174, 3);
        text(
          `Код: ${item.product.sku || item.product.barcode || "-"}`,
          x + 82,
          top - 57,
          7.5,
          174,
          1,
          MUTED,
        );
        const price = Number(item.product.price);
        text(
          Number.isFinite(price) && price >= 0
            ? `${price.toLocaleString("mn-MN")} ₮ / ${item.product.unit || "ш"}`
            : "Үнэ тодруулах",
          x + 82,
          top - 73,
          11,
          174,
          1,
          BLUE,
        );
        text(
          `Захиалах тоо: __________ ${item.product.unit || "ш"}`,
          x + 8,
          top - 92,
          8,
          249,
        );
      });
      text(
        "Үнэ, нөөцийг захиалга баталгаажуулах үед нягтална.",
        28,
        28,
        8,
        450,
        1,
        MUTED,
      );
      text(`${pdf.getPageCount()} / ${totalPages}`, 515, 28, 8, 52, 1, MUTED);
      // Give the browser a chance to update progress and handle cancellation.
      if (typeof window !== "undefined")
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
  }
  signal.throwIfAborted();
  const bytes = await pdf.save();
  signal.throwIfAborted();
  return { bytes, missingImages, itemCount };
}

export async function downloadCatalogPdf(options: CatalogPdfOptions) {
  const result = await createCatalogPdf(options);
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(result.bytes)], { type: "application/pdf" }),
  );
  const anchor = document.createElement("a");
  const name =
    options.warehouseName.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60) ||
    "warehouse";
  const date = (options.generatedAt ?? new Date()).toLocaleDateString("sv-SE", {
    timeZone: "Asia/Ulaanbaatar",
  });
  anchor.href = url;
  anchor.download = `${name}-catalog-${date}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return result;
}
