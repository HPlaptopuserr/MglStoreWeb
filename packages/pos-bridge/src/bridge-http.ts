import http from "node:http";
import https from "node:https";

export function secureApiUrl(raw: string): URL {
  const url = new URL(raw);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "API URL must use HTTPS, or HTTP on localhost for development",
    );
  return url;
}

export type JsonResponse = { status: number; data: unknown };

/** No redirects, bounded responses, and native HTTP for the portable Windows runtime. */
export function postJson(
  rawUrl: string,
  value: unknown,
  timeoutMs = 8_000,
): Promise<JsonResponse> {
  const url = secureApiUrl(rawUrl);
  const body = JSON.stringify(value);
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const request = transport.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          Accept: "application/json",
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        let length = 0;
        response.on("data", (chunk: Buffer) => {
          length += chunk.length;
          if (length > 65_536) {
            response.destroy(new Error("API response exceeds maximum size"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => {
          try {
            resolve({
              status: response.statusCode || 0,
              data: JSON.parse(
                Buffer.concat(chunks).toString("utf8"),
              ) as unknown,
            });
          } catch {
            reject(new Error("API returned an invalid JSON response"));
          }
        });
      },
    );
    const deadline = setTimeout(
      () => request.destroy(new Error("API request timed out")),
      timeoutMs,
    );
    request.on("close", () => clearTimeout(deadline));
    request.on("error", reject);
    request.end(body);
  });
}
