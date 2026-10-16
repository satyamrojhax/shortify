const IDB_NAME = "shortify_auth_vault";
const IDB_STORE = "credentials";
const IDB_VERSION = 2;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.close();
          // If store is somehow missing after version bump, reset corrupted DB
          try {
            const delReq = indexedDB.deleteDatabase(IDB_NAME);
            delReq.onsuccess = delReq.onerror = () => resolve(null);
          } catch {
            resolve(null);
          }
          return;
        }
        resolve(db);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveAuthToIdb(data: Record<string, string>): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.close();
        return resolve();
      }
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      for (const [k, v] of Object.entries(data)) {
        store.put(v, k);
      }
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        resolve();
      };
    } catch {
      try {
        db.close();
      } catch {}
      resolve();
    }
  });
}

export async function getAuthFromIdb(): Promise<Record<string, string>> {
  const db = await openDb();
  if (!db) return {};
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.close();
        return resolve({});
      }
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const allKeysReq = store.getAllKeys();
      const allValsReq = store.getAll();
      tx.oncomplete = () => {
        const keys = allKeysReq.result || [];
        const vals = allValsReq.result || [];
        const res: Record<string, string> = {};
        keys.forEach((k, i) => {
          res[String(k)] = vals[i];
        });
        db.close();
        resolve(res);
      };
      tx.onerror = () => {
        db.close();
        resolve({});
      };
      tx.onabort = () => {
        db.close();
        resolve({});
      };
    } catch {
      try {
        db.close();
      } catch {}
      resolve({});
    }
  });
}

export async function clearAuthFromIdb(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.close();
        return resolve();
      }
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        resolve();
      };
    } catch {
      try {
        db.close();
      } catch {}
      resolve();
    }
  });
}

export async function removeAuthKeyFromIdb(key: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.close();
        return resolve();
      }
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        resolve();
      };
    } catch {
      try {
        db.close();
      } catch {}
      resolve();
    }
  });
}
