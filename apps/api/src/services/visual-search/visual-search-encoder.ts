import sharp from "sharp";
import path from "node:path";
import {
  cacheDirectory,
  MODEL_ID,
  MODEL_REVISION,
  normalizeVector,
} from "./visual-search-index";

import { VisualSearchError } from "./visual-search-errors";
import { VisualSearchQueue } from "./visual-search-queue";
export { VisualSearchError } from "./visual-search-errors";

/** Decode before inference; remove EXIF/GPS, bound decompression and preserve the whole object. */
export async function prepareSearchImage(bytes: Buffer): Promise<Buffer> {
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) {
    throw new VisualSearchError(
      413,
      "IMAGE_TOO_LARGE",
      "5 MB-аас бага хэмжээтэй зураг сонгоно уу.",
    );
  }
  try {
    const decoder = sharp(bytes, {
      limitInputPixels: 24_000_000,
      failOn: "warning",
      animated: false,
    });
    const metadata = await decoder.metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format || "") ||
      !metadata.width ||
      !metadata.height ||
      metadata.width < 32 ||
      metadata.height < 32 ||
      (metadata.pages ?? 1) > 1
    )
      throw new Error("Unsupported image");
    return await decoder
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize(224, 224, { fit: "contain", background: "#ffffff" })
      .png()
      .toBuffer();
  } catch {
    throw new VisualSearchError(
      422,
      "INVALID_IMAGE",
      "JPG, PNG эсвэл WebP хэлбэрийн тод зураг сонгоно уу.",
    );
  }
}

async function createEncoder(download: boolean) {
  const { env, pipeline, RawImage } = await import("@huggingface/transformers");
  env.cacheDir = path.join(cacheDirectory(), "models");
  env.allowRemoteModels = download;
  if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 2;
  const extractor = await pipeline("image-feature-extraction", MODEL_ID, {
    dtype: "q8",
    revision: MODEL_REVISION,
    session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
  });
  return async (prepared: Buffer) => {
    const raw = await RawImage.fromBlob(
      new Blob([new Uint8Array(prepared)], { type: "image/png" }),
    );
    const tensor = await extractor(raw);
    return normalizeVector(Array.from(tensor.data, Number));
  };
}
let encoder: ReturnType<typeof createEncoder> | undefined;
const inferenceQueue = new VisualSearchQueue();

export async function warmVisualEncoder(download = false) {
  encoder ??= createEncoder(download).catch((error: unknown) => {
    encoder = undefined;
    throw error;
  });
  return encoder;
}

export async function encodeSearchImage(
  bytes: Buffer,
  download = false,
  signal?: AbortSignal,
): Promise<number[]> {
  return inferenceQueue.run(async () => {
    const prepared = await prepareSearchImage(bytes);
    return (await warmVisualEncoder(download))(prepared);
  }, signal);
}
