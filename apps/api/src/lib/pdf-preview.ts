import { PDFDocument } from "pdf-lib";

const DEFAULT_PREVIEW_PAGE_COUNT = 3;

export async function createPdfPreviewBuffer(
  source: Buffer,
  pageCount = DEFAULT_PREVIEW_PAGE_COUNT,
) {
  const sourcePdf = await PDFDocument.load(source, { ignoreEncryption: true });
  const previewPdf = await PDFDocument.create();
  const previewPageCount = Math.min(
    Math.max(0, pageCount),
    sourcePdf.getPageCount(),
  );

  if (previewPageCount === 0) {
    return null;
  }

  const pageIndexes = Array.from(
    { length: previewPageCount },
    (_unused, index) => index,
  );
  const pages = await previewPdf.copyPages(sourcePdf, pageIndexes);
  pages.forEach((page) => previewPdf.addPage(page));

  return Buffer.from(await previewPdf.save());
}
