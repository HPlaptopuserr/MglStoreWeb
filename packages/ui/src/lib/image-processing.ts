export type ImageCompressionOptions = {
  maxDimension?: number;
  quality?: number;
};

const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.82;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Зураг унших боломжгүй байна"));
    };
    image.src = objectUrl;
  });
}

function canvasToWebp(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Зураг шахахад алдаа гарлаа")),
      "image/webp",
      quality,
    );
  });
}

export async function compressImageForUpload(
  file: File,
  options: ImageCompressionOptions = {},
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;
  if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
    throw new Error("Зургийн хэмжээний тохиргоо буруу байна");
  }
  if (!Number.isFinite(quality) || quality <= 0 || quality > 1) {
    throw new Error("Зургийн чанарын тохиргоо буруу байна");
  }

  const image = await loadImage(file);
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, maxDimension / longestSide);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Зураг боловсруулах боломжгүй байна");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const compressed = await canvasToWebp(canvas, quality);

  // Avoid replacing an already-small source with a larger encoded file.
  if (compressed.size >= file.size) return file;
  const baseName = file.name.replace(/\.[^.]+$/, "") || "product-image";
  return new File([compressed], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: file.lastModified,
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
