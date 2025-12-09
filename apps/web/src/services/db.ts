
const DB_NAME = 'UTPilotDB';
const STORE_NAME = 'pdf_files';
const DB_VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject("IndexedDB error");

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const saveFileToDB = async (courseId: string, file: File): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(file, courseId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject("Failed to save file to DB");
  });
};

export const getFileFromDB = async (courseId: string): Promise<File | undefined> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(courseId);

    request.onsuccess = () => {
        resolve(request.result);
    };
    request.onerror = () => reject("Failed to retrieve file");
  });
};

export const deleteFileFromDB = async (courseId: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(courseId);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject("Failed to delete file");
    })
}
