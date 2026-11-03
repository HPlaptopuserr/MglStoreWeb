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
  popup.focus();
  popup.print();
}
