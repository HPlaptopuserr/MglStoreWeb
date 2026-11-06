import fs from "node:fs/promises";
import { setTimeout as pause } from "node:timers/promises";
import { ReelUploadError } from "./policy";

const CHUNK_BYTES = 6 * 1024 * 1024;

/** TUS keeps encoder output off the JS heap and recovers ambiguous PATCH replies. */
export async function uploadReelOutput(input: {
  file: string;
  bucket: string;
  path: string;
  signal?: AbortSignal;
  endpoint: string;
  serviceKey: string;
  send?: typeof fetch;
}): Promise<void> {
  const send = input.send ?? fetch;
  const size = (await fs.stat(input.file)).size;
  const headers = {
    authorization: `Bearer ${input.serviceKey}`,
    apikey: input.serviceKey,
    "Tus-Resumable": "1.0.0",
  };
  const signal = () =>
    input.signal
      ? AbortSignal.any([input.signal, AbortSignal.timeout(180000)])
      : AbortSignal.timeout(180000);
  const metadata = Object.entries({
    bucketName: input.bucket,
    objectName: input.path,
    contentType: "video/mp4",
    cacheControl: "3600",
  })
    .map(([key, value]) => `${key} ${Buffer.from(value).toString("base64")}`)
    .join(",");
  let created: Response | undefined;
  for (let attempt = 0; ; attempt++) {
    try {
      created = await send(input.endpoint, {
        method: "POST",
        headers: {
          ...headers,
          "Upload-Length": String(size),
          "Upload-Metadata": metadata,
        },
        signal: signal(),
        redirect: "error",
      });
      if (created.status === 413)
        throw new ReelUploadError(
          "Видео хадгалах үйлчилгээний багтаамжийг нэмэгдүүлэх шаардлагатай байна.",
          413,
        );
      if (created.status === 429 || created.status >= 500)
        throw new Error("Reel storage temporarily unavailable");
      if (created.status !== 201 || !created.headers.get("location")) {
        throw new ReelUploadError(
          "Видео хадгалах үйлчилгээний тохиргоог шалгана уу.",
          503,
        );
      }
      break;
    } catch (error: unknown) {
      if (
        error instanceof ReelUploadError ||
        input.signal?.aborted ||
        attempt >= 5
      )
        throw error;
      await pause(1000 * 2 ** attempt, undefined, { signal: input.signal });
    }
  }
  const url = new URL(created.headers.get("location")!, input.endpoint);
  // Never forward a service credential to a location supplied by another origin.
  if (url.origin !== new URL(input.endpoint).origin) {
    throw new Error("Unexpected reel storage origin");
  }
  const file = await fs.open(input.file, "r");
  try {
    let offset = 0;
    let failures = 0;
    while (offset < size) {
      input.signal?.throwIfAborted();
      const chunk = Buffer.allocUnsafe(Math.min(CHUNK_BYTES, size - offset));
      const { bytesRead } = await file.read(chunk, 0, chunk.length, offset);
      if (bytesRead !== chunk.length)
        throw new Error("Reel output changed during upload");
      try {
        const response = await send(url, {
          method: "PATCH",
          headers: {
            ...headers,
            "Upload-Offset": String(offset),
            "Content-Type": "application/offset+octet-stream",
          },
          body: chunk,
          signal: signal(),
          redirect: "error",
        });
        if (response.status === 413)
          throw new ReelUploadError(
            "Видео хадгалах үйлчилгээний багтаамжийг нэмэгдүүлэх шаардлагатай байна.",
            413,
          );
        if ([400, 401, 403, 404, 410, 415].includes(response.status)) {
          throw new ReelUploadError(
            "Видео хадгалах үйлчилгээний тохиргоог шалгана уу.",
            503,
          );
        }
        if (
          response.status !== 204 ||
          Number(response.headers.get("upload-offset")) !== offset + bytesRead
        ) {
          throw new Error("Reel output chunk was not acknowledged");
        }
        offset += bytesRead;
        failures = 0;
      } catch (error: unknown) {
        if (
          error instanceof ReelUploadError ||
          input.signal?.aborted ||
          failures >= 5
        )
          throw error;
        await pause(1000 * 2 ** failures++, undefined, {
          signal: input.signal,
        });
        // A lost response may follow a committed chunk. HEAD also handles 409.
        try {
          const state = await send(url, {
            method: "HEAD",
            headers,
            signal: signal(),
            redirect: "error",
          });
          const value = state.headers.get("upload-offset");
          const committed = value === null ? NaN : Number(value);
          if (
            state.ok &&
            Number.isSafeInteger(committed) &&
            (committed === offset || committed === offset + bytesRead)
          ) {
            offset = committed;
          }
        } catch {
          input.signal?.throwIfAborted();
          // Retry the same immutable bytes when the network is still unavailable.
        }
      }
    }
  } finally {
    await file.close();
  }
}
