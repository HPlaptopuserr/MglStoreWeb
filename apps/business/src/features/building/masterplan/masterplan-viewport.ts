export interface ViewportSize {
  width: number;
  height: number;
}

/** Image and pins share one uncropped coordinate system, even when panning or zooming. */
export function masterplanViewport(
  viewport: ViewportSize,
  image: ViewportSize,
  mode: "fill" | "fit",
  zoom: number,
) {
  const scale =
    (mode === "fill" ? Math.max : Math.min)(
      viewport.width / image.width,
      viewport.height / image.height,
    ) * zoom;
  const width = image.width * scale;
  const height = image.height * scale;
  const spaceWidth = Math.max(viewport.width, width);
  const spaceHeight = Math.max(viewport.height, height);
  return {
    width,
    height,
    spaceWidth,
    spaceHeight,
    left: (spaceWidth - width) / 2,
    top: (spaceHeight - height) / 2,
  };
}
