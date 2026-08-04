const SUPABASE_PUBLIC_OBJECT_PATH = "/storage/v1/object/public/";
const SUPABASE_RENDER_PATH = "/storage/v1/render/image/public/";

export function getOptimizedProductImageUrl(
  url: string,
  width: number,
  quality = 75,
): string {
  if (!url.startsWith("http") || !url.includes(SUPABASE_PUBLIC_OBJECT_PATH)) {
    return url;
  }

  try {
    const optimized = new URL(url);
    optimized.pathname = optimized.pathname.replace(
      SUPABASE_PUBLIC_OBJECT_PATH,
      SUPABASE_RENDER_PATH,
    );
    optimized.searchParams.set("width", String(width));
    optimized.searchParams.set("quality", String(quality));
    optimized.searchParams.set("resize", "contain");
    return optimized.toString();
  } catch {
    return url;
  }
}

