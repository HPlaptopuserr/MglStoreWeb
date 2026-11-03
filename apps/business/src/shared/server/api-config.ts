/** Backend configuration for server-side requests only. */
export const businessApiBase = (
  process.env.API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://mgl-api.onrender.com"
    : "http://localhost:4000")
).replace(/\/$/, "");
