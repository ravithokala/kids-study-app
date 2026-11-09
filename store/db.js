// @ts-check

/**
 * This phone's copy of the data, in IndexedDB. The sheet is the master copy; this one lets the app open at once and be
 * viewed offline. Stores: one per table, holding rows as the server sends them, and meta ({ key, value }: the last
 * refresh time, who is signed in). The database name is this app's own: the other apps on this origin use other names.
 */

const NAME = 'kids-study';
const VERSION = 2;
/** @type {Array<[string, string]>} store name, key field */
const STORES = [['children', 'child_id'], ['subjects', 'subject_id'], ['sections', 'section_id'], ['topics', 'topic_id'], ['progress', 'progress_id'], ['words', 'word_id'], ['meta', 'key']];
const TABLES = STORES.filter(([name]) => name !== 'meta');

/** @type {Promise<IDBDatabase>|null} */
let opening = null;

/** @returns {Promise<IDBDatabase>} */
function open() {
  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const [name, keyPath] of STORES) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { opening = null; reject(request.error); };
    request.onblocked = () => reject(new Error('Close this app in other tabs, then reload.'));
  });
  return opening;
}

/**
 * Runs `work` in one transaction and resolves when it has committed.
 * @template T
 * @param {string[]} stores
 * @param {IDBTransactionMode} mode
 * @param {(tx: IDBTransaction) => T} work
 * @returns {Promise<T>}
 */
async function transact(stores, mode, work) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    const result = work(tx);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('storage write was cancelled'));
  });
}

/** @param {IDBRequest} request @returns {Promise<any>} */
const done = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

/**
 * Everything saved on this phone.
 * @returns {Promise<{ rows: ChangedRows, meta: Record<string, any> }>}
 */
export async function loadAll() {
  const db = await open();
  const tx = db.transaction(STORES.map(([name]) => name), 'readonly');
  const lists = await Promise.all(STORES.map(([name]) => done(tx.objectStore(name).getAll())));
  const byName = Object.fromEntries(STORES.map(([name], i) => [name, lists[i]]));
  const { meta, ...rows } = byName;
  return { rows: /** @type {ChangedRows} */ (rows), meta: Object.fromEntries(meta.map((/** @type {any} */ m) => [m.key, m.value])) };
}

/**
 * Saves rows; with `replace`, drops every other row first (a full refresh).
 * @param {Partial<ChangedRows>} rows
 * @param {{ replace?: boolean }} [options]
 */
export function saveRows(rows, options = {}) {
  return transact(TABLES.map(([name]) => name), 'readwrite', (tx) => {
    for (const [name] of TABLES) {
      const os = tx.objectStore(name);
      if (options.replace) os.clear();
      for (const r of /** @type {any[]} */ ((/** @type {any} */ (rows))[name] ?? [])) os.put(r);
    }
  });
}

/** @param {Record<string, unknown>} values */
export function setMeta(values) {
  return transact(['meta'], 'readwrite', (tx) => Object.entries(values).forEach(([key, value]) => tx.objectStore('meta').put({ key, value })));
}

/** Empties everything (sign-out). */
export function clearAll() {
  return transact(STORES.map(([name]) => name), 'readwrite', (tx) => STORES.forEach(([name]) => tx.objectStore(name).clear()));
}
