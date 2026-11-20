/** Fit only explicitly compact thermal rolls; sheet and legacy roll pages stay unchanged. */
export function fitCompactLabelPage(document: Document): number | null {
  const roll = document.querySelector<HTMLElement>(
    ".thermal-roll[data-fit-roll-width]",
  );
  if (!roll) return null;
  const width = Number(roll.dataset.fitRollWidth);
  const heightPx = roll.getBoundingClientRect().height;
  if (!Number.isFinite(width) || width <= 0 || heightPx <= 0) return null;
  let style = document.getElementById("label-page-size");
  if (!style) {
    style = document.createElement("style");
    style.id = "label-page-size";
    document.head.appendChild(style);
  }
  const heightMm = Math.ceil((heightPx * 25.4) / 96 + 0.5);
  style.textContent =
    roll.dataset.pageMode === "printer"
      ? "@page { size: auto; margin: 0; }"
      : `@page { size: ${width}mm ${heightMm}mm; margin: 0; }`;
  return heightPx;
}

/** Wait for the written document and two paint frames before opening print preview. */
export async function printLabelWindow(popup: Window): Promise<void> {
  if (popup.document.readyState !== "complete") {
    await new Promise<void>((resolve) => {
      popup.addEventListener("load", () => resolve(), { once: true });
    });
  }
  await popup.document.fonts.ready;
  if (popup.closed) return;

  await new Promise<void>((resolve) => {
    popup.requestAnimationFrame(() => {
      popup.requestAnimationFrame(() => resolve());
    });
  });
  if (popup.closed) return;

  // Resolve layout before Chromium snapshots the document for printing.
  popup.document.body.getBoundingClientRect();
  fitCompactLabelPage(popup.document);
  popup.focus();
  popup.print();
}
