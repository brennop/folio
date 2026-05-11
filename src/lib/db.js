const DB_NAME = 'folio';
const DB_VERSION = 2;
const STORE_NAME = 'assets';
const STOCK_TARGETS_STORE_NAME = 'stockTargets';

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STOCK_TARGETS_STORE_NAME)) {
        db.createObjectStore(STOCK_TARGETS_STORE_NAME, { keyPath: 'ticker' });
      }
    };
  });
}

function normalizeTicker(ticker) {
  return String(ticker || '').trim().toUpperCase();
}

export async function addAsset(asset) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(asset);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function getAllAssets() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function deleteAsset(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function updateAsset(asset) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(asset);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getAllStockTargets() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STOCK_TARGETS_STORE_NAME, 'readonly');
    const store = tx.objectStore(STOCK_TARGETS_STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function upsertStockTarget({ ticker, targetPercentage }) {
  const normalizedTicker = normalizeTicker(ticker);
  if (!normalizedTicker) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STOCK_TARGETS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(STOCK_TARGETS_STORE_NAME);
    const request = store.put({
      ticker: normalizedTicker,
      targetPercentage: Math.max(0, Number(targetPercentage) || 0),
    });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function deleteStockTarget(ticker) {
  const normalizedTicker = normalizeTicker(ticker);
  if (!normalizedTicker) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STOCK_TARGETS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(STOCK_TARGETS_STORE_NAME);
    const request = store.delete(normalizedTicker);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
