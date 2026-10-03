export async function printReceiptElement(
  element: HTMLElement,
  title: string,
): Promise<void> {
  const frame = document.createElement("iframe");
  frame.title = "Баримт хэвлэх";
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1000px;height:1px;border:0";
  document.body.appendChild(frame);
  try {
    const target = frame.contentDocument;
    const view = frame.contentWindow;
    if (!target || !view) throw new Error("Print frame unavailable");
    target.title = title;
    target.documentElement.lang = "mn";
    const base = target.createElement("base");
    base.href = document.baseURI;
    target.head.appendChild(base);
    const styles = [
      ...document.querySelectorAll('style, link[rel="stylesheet"]'),
    ];
    const loaded: Promise<void>[] = [];
    for (const source of styles) {
      const clone = source.cloneNode(true) as HTMLElement;
      if (clone.tagName === "LINK")
        loaded.push(
          new Promise<void>((resolve, reject) => {
            clone.onload = () => resolve();
            clone.onerror = () => reject(new Error("Styles unavailable"));
          }),
        );
      target.head.appendChild(clone);
    }
    const printStyles = target.createElement("style");
    printStyles.textContent =
      "@page{size:A4;margin:12mm}body{margin:0;background:white}article{max-width:none!important;padding:0!important;box-shadow:none!important}thead{display:table-header-group}tr,footer{break-inside:avoid}";
    target.head.appendChild(printStyles);
    target.body.appendChild(element.cloneNode(true));
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.all(loaded),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Print styles timed out")),
            15000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
    await target.fonts.ready;
    view.addEventListener("afterprint", () => frame.remove(), { once: true });
    view.focus();
    view.print();
    setTimeout(() => frame.remove(), 60000);
  } catch (error) {
    frame.remove();
    throw error;
  }
}
