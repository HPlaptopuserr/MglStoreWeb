"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { masterplanViewport, type ViewportSize } from "./masterplan-viewport";

export function useMasterplanViewport() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const [viewport, setViewport] = useState<ViewportSize>({
    width: 1,
    height: 1,
  });
  const [image, setImage] = useState<ViewportSize>({
    width: 1600,
    height: 900,
  });
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<"fill" | "fit">("fill");
  const [zoom, setZoom] = useState(1);
  const geometry = masterplanViewport(viewport, image, mode, zoom);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0)
        setViewport({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (element) {
      element.scrollLeft = (geometry.spaceWidth - viewport.width) / 2;
      element.scrollTop = (geometry.spaceHeight - viewport.height) / 2;
    }
  }, [
    geometry.spaceWidth,
    geometry.spaceHeight,
    viewport.width,
    viewport.height,
  ]);

  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return {
    viewportRef,
    geometry,
    loaded,
    failed,
    zoom,
    mode,
    onImageLoad: (element: HTMLImageElement) => {
      setImage({ width: element.naturalWidth, height: element.naturalHeight });
      setLoaded(true);
    },
    onImageError: () => setFailed(true),
    zoomIn: () => setZoom((value) => Math.min(2.5, value + 0.25)),
    zoomOut: () => setZoom((value) => Math.max(0.5, value - 0.25)),
    fit: () => {
      setMode((value) => (value === "fill" ? "fit" : "fill"));
      setZoom(1);
    },
    dragHandlers: {
      onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
        if (
          event.pointerType !== "mouse" ||
          event.button !== 0 ||
          (event.target instanceof Element && event.target.closest("a, button"))
        )
          return;
        const element = event.currentTarget;
        drag.current = {
          x: event.clientX,
          y: event.clientY,
          left: element.scrollLeft,
          top: element.scrollTop,
        };
        element.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
        if (!drag.current) return;
        event.currentTarget.scrollLeft =
          drag.current.left - (event.clientX - drag.current.x);
        event.currentTarget.scrollTop =
          drag.current.top - (event.clientY - drag.current.y);
      },
      onPointerUp: stopDrag,
      onPointerCancel: stopDrag,
      onLostPointerCapture: () => {
        drag.current = null;
      },
    },
  };
}
