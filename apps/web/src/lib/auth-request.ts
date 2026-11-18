type SessionRequestOptions = {
  getToken: () => string | null;
  onUnauthorized: () => void;
};

/** A rejected old request must never sign out a newly established session. */
export async function requestWithSession(
  url: string,
  init: RequestInit | undefined,
  session: SessionRequestOptions,
): Promise<Response> {
  const token = session.getToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!headers.has("Content-Type") && init?.body && !isFormData)
    headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch (error: unknown) {
    if (init?.signal?.aborted) throw error;
    return Response.json({ message: "Сервертэй холбогдож чадсангүй. Түр хүлээгээд дахин оролдоно уу." }, { status: 503 });
  }
  if (response.status === 401 && session.getToken() === token)
    session.onUnauthorized();
  return response;
}
