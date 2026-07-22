export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new HttpError(`Request failed with status ${response.status}`, response.status, url);
  }
  return (await response.json()) as T;
}

export function getUserFacingHttpError(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 404) return "Хүссэн мэдээлэл олдсонгүй.";
    if (error.status >= 500) return "Сервер түр хугацаанд хариу өгөхгүй байна.";
  }
  return "Сүлжээний холболтоо шалгаад дахин оролдоно уу.";
}
