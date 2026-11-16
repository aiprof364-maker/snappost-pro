import { SHARE_MAX_AGE_MS, SHARE_STORAGE } from "@shared/shareTarget";

export type StoredShare = {
  blob: Blob;
  name: string;
  type: string;
};

type ShareRecord = StoredShare & { savedAt: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SHARE_STORAGE.db, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SHARE_STORAGE.store)) {
        db.createObjectStore(SHARE_STORAGE.store);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveSharedPhoto(file: File): Promise<void> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available");
  }
  const db = await openDb();
  try {
    const tx = db.transaction(SHARE_STORAGE.store, "readwrite");
    const record: ShareRecord = {
      blob: file,
      name: file.name,
      type: file.type,
      savedAt: Date.now(),
    };
    tx.objectStore(SHARE_STORAGE.store).put(record, SHARE_STORAGE.key);
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

/** Read the latest shared photo and delete it in the same transaction. */
export async function takeSharedPhoto(): Promise<StoredShare | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  try {
    const tx = db.transaction(SHARE_STORAGE.store, "readwrite");
    const store = tx.objectStore(SHARE_STORAGE.store);
    const record = await requestToPromise<ShareRecord | undefined>(
      store.get(SHARE_STORAGE.key)
    );
    store.delete(SHARE_STORAGE.key);
    await transactionDone(tx);
    if (!record?.blob) return null;
    if (Date.now() - record.savedAt > SHARE_MAX_AGE_MS) return null;
    return { blob: record.blob, name: record.name, type: record.type };
  } finally {
    db.close();
  }
}
