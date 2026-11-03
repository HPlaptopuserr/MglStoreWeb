export interface ReelUploadProgress {
  stage: "uploading" | "processing";
  percent: number;
}
interface UploadState {
  uploadId: string;
  status:
    | "UPLOADING"
    | "QUEUED"
    | "PROCESSING"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED";
  partSize: number;
  partCount: number;
  receivedParts: number[];
  reel?: Record<string, unknown>;
  message?: string;
}
export interface ReelUploadInput {
  api: string;
  file: File;
  organizationId: string;
  title: string;
  caption: string;
  tags?: string;
  productId?: string;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onProgress?: (progress: ReelUploadProgress) => void;
  signal?: AbortSignal;
}
const pause = (signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    signal?.throwIfAborted();
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, 3000);
    const abort = () => {
      clearTimeout(timer);
      reject(new Error("Илгээлт зогссон."));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
async function cacheKey(input: ReelUploadInput): Promise<string> {
  // Bounded-memory content fingerprint; lastModified disambiguates edited files.
  const metadata = new TextEncoder().encode(
    JSON.stringify([
      input.api,
      input.organizationId,
      input.file.name,
      input.file.size,
      input.file.lastModified,
      input.title.trim(),
      input.caption.trim(),
      input.tags,
      input.productId,
    ]),
  );
  const samples = await new Blob([
    metadata,
    input.file.slice(0, 65536),
    input.file.slice(-65536),
  ]).arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", samples);
  return `mgl_reel_upload_v1_${Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
function savedId(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function saveId(key: string, id?: string) {
  try {
    if (id) localStorage.setItem(key, id);
    else localStorage.removeItem(key);
  } catch {
    /* In-memory retries remain available when persistence is unavailable. */
  }
}
export async function uploadReel(
  input: ReelUploadInput,
): Promise<Record<string, unknown>> {
  const { file, signal, authFetch, onProgress } = input;
  if (file.size < 12 || file.size > 1024 * 1024 * 1024)
    throw new Error("1 GB хүртэлх видео сонгоно уу.");
  const key = await cacheKey(input);
  let id = savedId(key) || crypto.randomUUID();
  const request = async (
    path: string,
    body?: Record<string, unknown>,
  ): Promise<UploadState> => {
    const response = await authFetch(`${input.api}${path}`, {
      method: body ? "POST" : "GET",
      cache: "no-store",
      signal,
      ...(body
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    });
    const data = (await response.json()) as UploadState;
    if (!response.ok)
      throw Object.assign(new Error(data.message || "Видео илгээгдсэнгүй."), {
        status: response.status,
      });
    return data;
  };
  let state: UploadState | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    saveId(key, id);
    try {
      state = await request("/reel-uploads", {
        uploadId: id,
        fileName: file.name,
        sizeBytes: file.size,
        mimeType:
          file.type ||
          (file.name.toLowerCase().endsWith(".mov")
            ? "video/quicktime"
            : "video/mp4"),
        organizationId: input.organizationId,
        title: input.title.trim(),
        caption: input.caption.trim(),
        productId: input.productId || "",
        tags: input.tags || "",
      });
      break;
    } catch (error) {
      if (
        attempt === 0 &&
        error instanceof Error &&
        "status" in error &&
        [409, 410].includes(Number(error.status))
      ) {
        id = crypto.randomUUID();
        continue;
      }
      throw error;
    }
  }
  if (!state) throw new Error("Видео илгээж чадсангүй.");
  const path = `/reel-uploads/${id}`;
  if (state.status === "UPLOADING") {
    const { partSize, partCount } = state;
    if (
      !Number.isInteger(partSize) ||
      partSize <= 0 ||
      partSize > 6 * 1024 * 1024 ||
      partCount !== Math.ceil(file.size / partSize)
    ) {
      throw new Error("Видео илгээх тохиргоо буруу байна.");
    }
    const received = new Set(state.receivedParts);
    for (let index = 0; index < partCount; index++) {
      if (received.has(index)) continue;
      for (let attempt = 0; ; attempt++) {
        signal?.throwIfAborted();
        try {
          const ticketResponse = await authFetch(
            `${input.api}${path}/parts/${index}`,
            { method: "POST", signal },
          );
          const ticket = (await ticketResponse.json()) as {
            url?: string;
            message?: string;
          };
          if (!ticketResponse.ok || !ticket.url)
            throw Object.assign(
              new Error(ticket.message || "Илгээх холбоос үүссэнгүй."),
              { status: ticketResponse.status },
            );
          const external = /^https:\/\//.test(ticket.url);
          if (!external && !ticket.url.startsWith("/api/reel-uploads/"))
            throw new Error("Илгээх холбоос буруу байна.");
          const response = await (external ? fetch : authFetch)(
            external
              ? ticket.url
              : `${input.api.replace(/\/api\/?$/, "")}${ticket.url}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/octet-stream" },
              body: file.slice(
                index * partSize,
                Math.min(file.size, (index + 1) * partSize),
              ),
              signal,
              credentials: "omit",
              redirect: "error",
            },
          );
          if (!response.ok)
            throw Object.assign(new Error("Видео хэсэг илгээгдсэнгүй."), {
              status: response.status,
            });
          break;
        } catch (error) {
          if (
            signal?.aborted ||
            attempt >= 3 ||
            (error instanceof Error &&
              "status" in error &&
              [400, 401, 403, 404, 410, 413].includes(Number(error.status)))
          )
            throw error;
          const latest = await request(path);
          if (latest.receivedParts.includes(index)) break;
          await pause(signal);
        }
      }
      received.add(index);
      onProgress?.({
        stage: "uploading",
        percent: Math.round((received.size / partCount) * 100),
      });
    }
  }
  if (state.status !== "SUCCEEDED")
    state = await request(`${path}/complete`, {});
  onProgress?.({ stage: "processing", percent: 100 });
  const deadline = Date.now() + 15 * 60 * 1000;
  for (;;) {
    if (state.status === "SUCCEEDED" && state.reel) {
      saveId(key);
      return state.reel;
    }
    if (["FAILED", "CANCELLED"].includes(state.status))
      throw new Error(state.message || "Видео боловсруулж чадсангүй.");
    if (Date.now() > deadline)
      throw new Error(
        "Видео хадгалагдсан, боловсруулж байна. Түр хүлээгээд дахин шалгана уу.",
      );
    await pause(signal);
    state = await request(path);
  }
}
