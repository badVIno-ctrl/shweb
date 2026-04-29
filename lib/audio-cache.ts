// IndexedDB cache for TTS audio (key = sha256(text|voice)).

import { sha256Hex } from './utils';

const DB = 'vsa-tts';
const STORE = 'audio';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function audioCacheKey(text: string, voice = 'default'): Promise<string> {
  return sha256Hex(`${voice}|${text}`);
}

export async function getCachedAudio(key: string): Promise<Blob | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function putCachedAudio(key: string, blob: Blob): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDB();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}
