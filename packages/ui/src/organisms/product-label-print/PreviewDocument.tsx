import { memo, useCallback, useLayoutEffect, useRef } from "react";

const PREVIEW_SHELL =
  '<!doctype html><html lang="mn"><head><meta charset="utf-8"></head><body></body></html>';

interface PreviewDocumentProps {
  html: string;
  title: string;
  width: number;
  height: number;
  scale: number;
}

/** Keep the browsing context alive while editing; changing srcDoc reloads and flashes white. */
export const PreviewDocument = memo(function PreviewDocument({
  html,
  title,
  width,
  height,
  scale,
}: PreviewDocumentProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const loaded = useRef(false);
  const updateDocument = useCallback(() => {
    const target = frame.current?.contentDocument;
    if (!loaded.current || !target) return;
    const source = new DOMParser().parseFromString(html, "text/html");
    const css = Array.from(
      source.querySelectorAll("style"),
      (style) => style.textContent,
    ).join("\n");
    let style = target.querySelector("style");
    if (!style) {
      style = target.createElement("style");
      target.head.appendChild(style);
    }
    const previewCss = `${css}\nhtml, body { overflow: hidden; }`;
    if (style.textContent !== previewCss) style.textContent = previewCss;
    // The generated markup escapes all product text. Scripts remain sandboxed.
    target.body.replaceChildren(
      ...Array.from(source.body.childNodes, (node) =>
        target.importNode(node, true),
      ),
    );
  }, [html]);

  useLayoutEffect(updateDocument, [updateDocument]);

  return (
    <iframe
      ref={frame}
      title={title}
      srcDoc={PREVIEW_SHELL}
      sandbox="allow-same-origin"
      tabIndex={-1}
      onLoad={() => {
        loaded.current = true;
        updateDocument();
      }}
      className="pointer-events-none absolute left-0 top-0 border-0"
      style={{
        width,
        height,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    />
  );
});
