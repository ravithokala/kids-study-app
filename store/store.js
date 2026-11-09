// @ts-check

import * as db from './db.js';
import { call, Unreachable, lastTiming } from '../api.js';
import { copyTooOld } from '../freshness.js';
import { Validation } from '../shared/validation.js';
import { Structure } from '../shared/structure.js';
import { Levels } from '../shared/levels.js';
import { Words } from '../shared/words.js';

/**
 * The app's data: the sheet is the master copy; this phone keeps a copy in IndexedDB so the app opens at once and can be
 * viewed offline. Saving happens only online, straight to the server: each change is checked here first (the server's
 * own rules), sent, and the rows the server returns replace this phone's copies. Offline, saving says so. The copy
 * refreshes on opening, on returning to the app, when the connection returns, and every five minutes (to pick up the
 * other person's changes). A refresh is always the whole data: it is small.
 */

/** @typedef {'children'|'subjects'|'sections'|'topics'|'progress'|'words'} Table */
/** @type {Record<Table, string>} */
const ID_FIELD = { children: 'child_id', subjects: 'subject_id', sections: 'section_id', topics: 'topic_id', progress: 'progress_id', words: 'word_id' };
/** @type {ReadonlyArray<Table>} */
const TABLES = ['children', 'subjects', 'sections', 'topics', 'progress', 'words'];
/** The save and remove actions of each kind of row. */
const KINDS = Object.freeze({ child: 'children', subject: 'subjects', section: 'sections', topic: 'topics' });
/** @typedef {keyof typeof KINDS} Kind */

/**
 * @type {{ children: Record<string, Child>, subjects: Record<string, Subject>, sections: Record<string, Section>, topics: Record<string, Topic>, progress: Record<string, Progress>, words: Record<string, Word> }}
 */
export const data = { children: {}, subjects: {}, sections: {}, topics: {}, progress: {}, words: {} };

export const status = {
  user: '',
  users: /** @type {string[]} */ ([]),
  lastSynced: /** @type {number|null} */ (null),
  online: navigator.onLine,
  refreshing: false,
  /** Why the last refresh failed, if it did (not when simply offline). */
  error: /** @type {string|null} */ (null),
  /** How long the last refresh took (shown beside the version in More). */
  timing: /** @type {typeof lastTiming|null} */ (null),
  sheetUrl: /** @type {string|null} */ (null),
};

/** @type {Set<() => void>} */
const listeners = new Set();
/** Called after anything changes (data or status). @param {() => void} fn */
export const onChange = (fn) => { listeners.add(fn); };
const changed = () => listeners.forEach((fn) => fn());

/** @param {Partial<ChangedRows>} rows */
function applyRows(rows) {
  for (const table of TABLES) {
    for (const row of /** @type {any[]} */ (rows[table] ?? [])) /** @type {any} */ (data[table])[row[ID_FIELD[table]]] = row;
  }
}

/** @param {ChangedRows} rows */
function replaceAll(rows) {
  for (const table of TABLES) /** @type {any} */ (data)[table] = Object.fromEntries(/** @type {any[]} */ (rows[table]).map((r) => [r[ID_FIELD[table]], r]));
}

/** Loads this phone's copy. @returns {Promise<boolean>} whether there was one */
export async function load() {
  let saved = await db.loadAll();
  // A copy not refreshed for 30 days is removed, not shown: the session has ended by then too.
  if (copyTooOld(saved.meta.lastSynced, Date.now())) {
    await db.clearAll();
    saved = await db.loadAll();
  }
  replaceAll(saved.rows);
  status.user = saved.meta.user ?? '';
  status.users = saved.meta.users ?? [];
  status.lastSynced = saved.meta.lastSynced ?? null;
  status.sheetUrl = saved.meta.sheetUrl ?? null;
  changed();
  return status.lastSynced !== null;
}

// ---- Reading what is on this phone ----

/** @template T @param {Record<string, T & { deleted: boolean }>} rows @returns {T[]} */
const live = (rows) => Object.values(rows).filter((r) => !r.deleted);
/** @template T @param {Record<string, T>} rows @returns {T[]} */
const every = (rows) => Object.values(rows);

/** Children, in order. */
export const children = () => live(data.children).sort(Structure.bySort);
export const subjects = () => live(data.subjects);
/** Every progress row, removed ones left out. */
export const progressRows = () => live(data.progress);
/** One track's subjects, sections and topics, in order. @param {TrackId} track */
export const tree = (track) => Structure.tree(live(data.subjects), live(data.sections), live(data.topics), track);
/** 'Maths › Fractions › Percentages'. @param {string} topicId */
export const pathOf = (topicId) => Structure.path(topicId, every(data.subjects), every(data.sections), every(data.topics));

const CHILD_KEY = 'ks.child';

/** The child on screen: the one last chosen if still there, otherwise the first. @returns {Child|null} */
export function currentChild() {
  const kids = children();
  let saved = null;
  try { saved = localStorage.getItem(CHILD_KEY); } catch (e) { /* not remembered */ }
  return kids.find((c) => c.child_id === saved) ?? kids[0] ?? null;
}

/** @param {string} id */
export function selectChild(id) {
  try { localStorage.setItem(CHILD_KEY, id); } catch (e) { /* not remembered */ }
  changed();
}

// ---- Saving ----

/** @param {string} message @returns {{ ok: false, errors: Issue[] }} */
const refuse = (message) => ({ ok: false, errors: [{ field: 'request', code: 'NOT_SAVED', message }] });

/** Whether a failure means this phone has no connection (not just a busy server). @param {unknown} e */
const isOffline = (e) => !navigator.onLine || (e instanceof Unreachable && e.offline);

/**
 * Sends one save. The rows it answers with (what was saved, or for a refused edit the current row) replace this phone's.
 * @param {string} action @param {unknown} payload
 * @returns {Promise<{ ok: true, rows: ChangedRows, data: any } | { ok: false, errors: Issue[] }>}
 */
async function send(action, payload) {
  if (!navigator.onLine) return refuse("You're offline: connect to save. Everything here can still be viewed.");
  /** @type {import('../api.js').ApiResponse} */
  let r;
  try {
    // A save (app-kit's api.js): a short first try, then one automatic retry carrying the same id, which the server
    // applies once, so a save that did arrive the first time is not made twice.
    r = await call(action, payload);
  } catch (e) {
    return refuse(isOffline(e) ? "You're offline: connect to save." : `${e instanceof Error ? e.message : String(e)}. Nothing was lost: try again in a moment.`);
  }
  if (r.data?.rows) {
    applyRows(r.data.rows);
    await db.saveRows(r.data.rows);
    changed();
  }
  return r.ok ? { ok: true, rows: r.data.rows, data: r.data } : { ok: false, errors: r.errors };
}

/** What the shared validation checks a change against. */
const known = () => ({ children: every(data.children), subjects: every(data.subjects), sections: every(data.sections), topics: every(data.topics) });

/**
 * Adds (no id) or changes a child, subject, section or topic.
 * @param {Kind} kind
 * @param {string|null} id
 * @param {Record<string, unknown>} fields  child: name, year_group, colour; subject: track, name; section: subject_id, name; topic: section_id, name, year_group
 */
export function save(kind, id, fields) {
  const table = KINDS[kind];
  const existing = id ? /** @type {any} */ (data[table])[id] : null;
  const checked = /** @type {{ errors: Issue[] }} */ (Validation[kind](fields, { ...known(), self: id }));
  if (checked.errors.length) return Promise.resolve({ ok: /** @type {const} */ (false), errors: checked.errors });
  return send(`${kind}.save`, { id: id ?? undefined, base_version: existing ? existing.version : 0, fields });
}

/** @param {Kind} kind @param {string} id */
export function remove(kind, id) {
  const existing = /** @type {any} */ (data[KINDS[kind]])[id];
  return send(`${kind}.remove`, { id, base_version: existing ? existing.version : 0 });
}

/**
 * A new level for a child on a topic. @param {{ child_id: string, topic_id: string, level: number, score?: number|string|null, on?: string, note?: string|null }} input
 * @param {string} today
 */
export function addProgress(input, today) {
  const checked = Validation.progress(input, { children: every(data.children), topics: every(data.topics), today });
  if (checked.errors.length) return Promise.resolve({ ok: /** @type {const} */ (false), errors: checked.errors });
  return send('progress.add', checked.value);
}

/** @param {string} id */
export function removeProgress(id) {
  return send('progress.remove', { id, base_version: data.progress[id]?.version ?? 0 });
}

/**
 * Adds the words pasted for a child and a week (any day in the week).
 * @param {string} childId @param {string|null} week @param {string} text @param {string|null} note the spelling rule they share @param {string} today
 */
export function addWords(childId, week, text, note, today) {
  const checked = Validation.words({ child_id: childId, week, text, note }, { children: every(data.children), today });
  if (checked.errors.length) return Promise.resolve({ ok: /** @type {const} */ (false), errors: checked.errors });
  return send('words.add', { child_id: childId, week, text, note });
}

/** @param {string} id @param {0|1|2} status */
export const markWord = (id, status) => send('word.mark', { id, base_version: data.words[id]?.version ?? 0, status });

/** @param {string} id */
export const removeWord = (id) => send('word.remove', { id, base_version: data.words[id]?.version ?? 0 });

/** The current child's words: tricky ones, and by week. @param {string} childId */
export const wordLists = (childId) => ({ tricky: Words.tricky(live(data.words), childId), weeks: Words.weeks(live(data.words), childId) });

/** Adds the standard subjects, sections and topics that are missing. */
export const seedStandard = () => send('seed.apply', {});

// ---- Refreshing ----

/** @type {Promise<void>|null} */
let running = null;

/** Fetches everything from the server. One at a time: a call while one runs shares it. @returns {Promise<void>} */
export function refresh() {
  if (!running) running = run().finally(() => { running = null; });
  return running;
}

async function run() {
  status.refreshing = true;
  changed();
  try {
    const r = await call('sync.pull', {});
    if (!r.ok) throw new Error(r.errors.map((e) => e.message).join('; '));
    const pulled = r.data;
    replaceAll(pulled);
    await db.saveRows(pulled, { replace: true });
    Object.assign(status, { user: pulled.user, users: pulled.users, sheetUrl: pulled.sheet_url, lastSynced: Date.now(), error: null, online: true, timing: { ...lastTiming } });
    await db.setMeta({ user: status.user, users: status.users, lastSynced: status.lastSynced, sheetUrl: status.sheetUrl });
  } catch (e) {
    status.online = !isOffline(e);
    status.error = status.online ? (e instanceof Error ? e.message : String(e)) : null;
    throw e;
  } finally {
    status.refreshing = false;
    changed();
  }
}

/** Forgets everything on this phone (signing out). */
export async function forget() {
  await db.clearAll();
  for (const table of TABLES) /** @type {any} */ (data)[table] = {};
  Object.assign(status, { user: '', users: [], lastSynced: null, error: null, sheetUrl: null });
  changed();
}

/** Keeps the copy current: when the connection returns, when the app is reopened, and every five minutes. */
export function keepInStep() {
  const attempt = () => { if (navigator.onLine) refresh().catch(() => { /* shown in the header */ }); };
  window.addEventListener('online', () => { status.online = true; attempt(); });
  window.addEventListener('offline', () => { status.online = false; changed(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') attempt(); });
  window.setInterval(() => {
    if (document.visibilityState === 'visible' && Date.now() - (status.lastSynced ?? 0) > 300000) attempt();
  }, 60000);
}

/** The current level of a child on a topic, 0 if none. @param {string} childId @param {string} topicId */
export const levelOf = (childId, topicId) => Levels.latest(progressRows(), childId, topicId)?.level ?? 0;
