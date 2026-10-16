const IDB_NAME = "shortify_auth_vault";
const IDB_STORE = "credentials";

export async function saveAuthToIdb(data: Record<string, string>): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
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
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getAuthFromIdb(): Promise<Record<string, string>> {
  if (typeof indexedDB === "undefined") return {};
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
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
      };
      req.onerror = () => resolve({});
    } catch {
      resolve({});
    }
  });
}

export async function clearAuthFromIdb(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onsuccess = () => {
        const db = req.result;
        if (db.objectStoreNames.contains(IDB_STORE)) {
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
        } else {
          db.close();
          resolve();
        }
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
