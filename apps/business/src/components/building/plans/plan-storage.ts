import { emptyLibrary, parseLibrary, type PlanLibrary } from "./plan-model";
const DATABASE = "mgl-building-plan-drafts-v1";
export const PLAN_CHANGE_EVENT = "mgl-building-plans-changed";
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("library");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("План хадгалах санг нээж чадсангүй."));
  });
}
export async function loadPlanLibrary(): Promise<PlanLibrary> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("library", "readonly");
      const request = tx.objectStore("library").get("demo");
      request.onsuccess = () => {
        try {
          resolve(
            request.result === undefined
              ? emptyLibrary()
              : parseLibrary(request.result),
          );
        } catch (error) {
          reject(error);
        }
      };
      request.onerror = () =>
        reject(new Error("Хадгалсан план уншиж чадсангүй."));
    });
  } finally {
    db.close();
  }
}
export async function savePlanLibrary(library: PlanLibrary): Promise<void> {
  const validated = parseLibrary(library),
    db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("library", "readwrite");
      tx.objectStore("library").put(validated, "demo");
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(
          new Error("План хадгалж чадсангүй. Хөтчийн сул зайг шалгана уу."),
        );
      tx.onabort = () => reject(new Error("Хадгалалт тасалдлаа."));
    });
  } finally {
    db.close();
  }
  window.dispatchEvent(new Event(PLAN_CHANGE_EVENT));
}
export async function readPlanImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 20_000_000)
    throw new Error("PNG, JPG, WebP зураг оруулна уу. Дээд хэмжээ 20 MB.");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("Зургийг нээж чадсангүй. Зөв PNG, JPG, WebP файл сонгоно уу."); }
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width > 10000 || bitmap.height > 10000)
      throw new Error("Зургийн тал бүр 10,000 px хүртэл байна.");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Зураг боловсруулах боломжгүй байна.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.8, 0.7]) {
      const encoded = canvas.toDataURL("image/webp", quality);
      if (encoded.length <= 2_500_000) return encoded;
    }
    throw new Error("Зургийн хэмжээ хэт том байна. Жижигрүүлж дахин оруулна уу.");
  } finally { bitmap.close(); }
}
