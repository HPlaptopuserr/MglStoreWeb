import { API } from "@/lib/api";
import { compressImageForUpload } from "@mgl/ui";

export const MAX_PRODUCT_IMAGES = 5;
export const MAX_PRODUCT_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_PRODUCT_UPLOAD_BYTES = 5 * 1024 * 1024;

const ACCEPTED_PRODUCT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type AuthFetch = (url: string, init?: RequestInit) => Promise<Response>;

type UploadResponse = {
  message?: string;
  url?: string;
};

export class ProductImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductImageUploadError";
  }
}

function validateProductImage(file: File): void {
  if (!ACCEPTED_PRODUCT_IMAGE_TYPES.has(file.type)) {
    throw new ProductImageUploadError(
      `${file.name}: JPG, PNG, WebP эсвэл GIF зураг сонгоно уу.`,
    );
  }
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new ProductImageUploadError(
      `${file.name}: зургийн хэмжээ 15 MB-аас бага байх ёстой.`,
    );
  }
}

async function readUploadResponse(response: Response): Promise<UploadResponse> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return {};
  const body: unknown = await response.json().catch(() => null);
  if (!body || typeof body !== "object") return {};
  const candidate = body as Record<string, unknown>;
  return {
    message:
      typeof candidate.message === "string" ? candidate.message : undefined,
    url: typeof candidate.url === "string" ? candidate.url : undefined,
  };
}

async function uploadProductImage(
  file: File,
  authFetch: AuthFetch,
): Promise<string> {
  validateProductImage(file);
  const uploadFile = await compressImageForUpload(file, {
    maxDimension: 1600,
    quality: 0.82,
  });
  if (uploadFile.size > MAX_PRODUCT_UPLOAD_BYTES) {
    throw new ProductImageUploadError(
      `${file.name}: шахсаны дараах хэмжээ 5 MB-аас их байна.`,
    );
  }
  const formData = new FormData();
  formData.append("image", uploadFile);

  const response = await authFetch(`${API}/products/upload-image`, {
    method: "POST",
    body: formData,
  });
  const body = await readUploadResponse(response);
  if (!response.ok || !body.url) {
    throw new ProductImageUploadError(
      body.message || `${file.name}: зураг upload хийхэд алдаа гарлаа.`,
    );
  }
  return body.url;
}

export async function uploadProductImages({
  authFetch,
  files,
  remainingSlots,
}: {
  authFetch: AuthFetch;
  files: FileList | File[] | null;
  remainingSlots: number;
}): Promise<string[]> {
  if (!files || remainingSlots <= 0) return [];
  const selectedFiles = Array.from(files).slice(0, remainingSlots);
  selectedFiles.forEach(validateProductImage);

  // Keep concurrency bounded so mobile devices and the API are not flooded by
  // five simultaneous image encodes/uploads.
  const uploaded: string[] = [];
  for (const file of selectedFiles) {
    uploaded.push(await uploadProductImage(file, authFetch));
  }
  return uploaded;
}
