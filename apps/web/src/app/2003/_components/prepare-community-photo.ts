const MAX_SOURCE_BYTES = 30 * 1024 * 1024;
const PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
export function validateCommunityPhoto(
  file: Pick<File, "size" | "type" | "name">,
): void {
  const recognized =
    PHOTO_TYPES.has(file.type.toLowerCase()) ||
    (!file.type && /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name));
  if (!recognized)
    throw new Error("JPG, PNG, WebP эсвэл HEIC зураг сонгоно уу.");
  if (!file.size || file.size > MAX_SOURCE_BYTES)
    throw new Error("30 MB хүртэл хэмжээтэй зураг сонгоно уу.");
}
// Phone cameras commonly produce photos larger than the API upload limit.
// Decode locally and upload a small JPEG rather than rejecting the original.
export async function prepareCommunityPhoto(file: File): Promise<File> {
  validateCommunityPhoto(file);
  const url = URL.createObjectURL(file);
  const image = new window.Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(
          new Error(
            "Энэ зургийг нээж чадсангүй. Өөр зураг эсвэл JPG хувилбар сонгоно уу.",
          ),
        );
      image.src = url;
    });
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    if (!sourceSize)
      throw new Error("Зургийг уншиж чадсангүй. Өөр зураг сонгоно уу.");
    const size = Math.min(1280, sourceSize);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Зураг бэлдэж чадсангүй. Дахин оролдоно уу.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size, size);
    context.drawImage(
      image,
      (image.naturalWidth - sourceSize) / 2,
      (image.naturalHeight - sourceSize) / 2,
      sourceSize,
      sourceSize,
      0,
      0,
      size,
      size,
    );
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error("Зургийг хөрвүүлж чадсангүй.")),
        "image/jpeg",
        0.85,
      ),
    );
    return new File([blob], "community-photo.jpg", { type: "image/jpeg" });
  } finally {
    image.onload = null;
    image.onerror = null;
    URL.revokeObjectURL(url);
  }
}
