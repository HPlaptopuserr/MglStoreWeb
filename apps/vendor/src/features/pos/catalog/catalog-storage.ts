import type { CatalogPersistence, CatalogSnapshot } from "./catalog-model";

const DATABASE = "mgl-vendor-pos-catalog";
const STORE = "snapshots";

async function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return null;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (db: IDBDatabase | null) => {
      if (settled) {
        db?.close();
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(db);
    };
    const timer = setTimeout(() => finish(null), 1000);
    try {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE))
          request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => finish(request.result);
      request.onerror = () => finish(null);
      request.onblocked = () => finish(null);
    } catch {
      finish(null);
    }
  });
}

async function transact(
  key: string,
  mode: "read" | "write" | "remove",
  snapshot?: CatalogSnapshot,
): Promise<unknown> {
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    let result: unknown = null;
    let finished = false;
    let tx: IDBTransaction | undefined;
    const finish = (value: unknown) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      db.close();
      resolve(value);
    };
    const timer = setTimeout(() => {
      try {
        tx?.abort();
      } catch {
        /* The transaction may already have completed. */
      }
      finish(null);
    }, 1000);
    try {
      tx = db.transaction(STORE, mode === "read" ? "readonly" : "readwrite");
      const store = tx.objectStore(STORE);
      const request =
        mode === "read"
          ? store.get(key)
          : mode === "write"
            ? store.put(snapshot, key)
            : store.delete(key);
      request.onsuccess = () => {
        result = request.result;
      };
      tx.oncomplete = () => finish(result);
      tx.onerror = () => finish(null);
      tx.onabort = () => finish(null);
    } catch {
      finish(null);
    }
  });
}

export const catalogStorage: CatalogPersistence = {
  read: (key) => transact(key, "read"),
  write: async (key, snapshot) => {
    await transact(key, "write", snapshot);
  },
  remove: async (key) => {
    await transact(key, "remove");
  },
};
