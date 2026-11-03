export async function managementFetch(path: string, init?: RequestInit) {
  const response = await fetch(`/api/building/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (response.status === 401) {
    window.location.assign("/building/login");
    throw new Error("Нэвтрэх хугацаа дууссан байна");
  }
  return response;
}
export async function responseError(response: Response, fallback: string) {
  const value: unknown = await response.json().catch(() => null);
  return value &&
    typeof value === "object" &&
    "message" in value &&
    typeof value.message === "string"
    ? value.message
    : fallback;
}
