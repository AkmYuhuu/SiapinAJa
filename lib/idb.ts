// Minimal IndexedDB wrapper. DB name: siapinaja (v1).
// Stores: projects, documents, calculations, image_jobs, settings, exports.

const DB_NAME = "siapinaja";
const DB_VERSION = 1;

export const STORES = {
  projects: "projects",
  documents: "documents",
  calculations: "calculations",
  image_jobs: "image_jobs",
  settings: "settings",
  exports: "exports",
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error("IndexedDB gagal dibuka."));
    req.onblocked = () => reject(new Error("IndexedDB diblokir browser."));
  });
  return dbPromise;
}

export class StorageError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "StorageError";
  }
}

async function withStore<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  try {
    const db = await open();
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(fromIDBError(req.error));
    });
  } catch (e) {
    if (e instanceof StorageError) throw e;
    throw fromIDBError(e);
  }
}

function fromIDBError(e: unknown): StorageError {
  const err = e as DOMException | Error | null;
  const msg = err?.message ?? "Penyimpanan lokal gagal.";
  if (err instanceof DOMException && err.name === "QuotaExceededError") {
    return new StorageError("Penyimpanan lokal penuh. Hapus beberapa project lalu coba lagi.", err);
  }
  if (err instanceof DOMException && err.name === "NotFoundError") {
    return new StorageError("Data tidak ditemukan.", err);
  }
  return new StorageError(msg, err);
}

export function idbGet<T>(store: StoreName, id: string): Promise<T | undefined> {
  return withStore(store, "readonly", (s) => s.get(id) as IDBRequest<T | undefined>);
}

export function idbPut<T>(store: StoreName, value: T): Promise<IDBValidKey> {
  return withStore(store, "readwrite", (s) => s.put(value));
}

export function idbDelete(store: StoreName, id: string): Promise<undefined> {
  return withStore(store, "readwrite", (s) => s.delete(id) as IDBRequest<undefined>);
}

export function idbAll<T>(store: StoreName): Promise<T[]> {
  return withStore(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
}

export function idbClear(store: StoreName): Promise<undefined> {
  return withStore(store, "readwrite", (s) => s.clear() as IDBRequest<undefined>);
}