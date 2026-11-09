// @ts-check
// GENERATED from apps-script/domain/levels.js by scripts/sync-shared.js. Do not edit here:
// edit that file and run `npm run sync:shared`.
import { Dates } from './dates.js';

/**
 * The five levels, and what a child's progress rows say. A row is a dated level for one child on one
 * topic; rows are only added, so the latest is the current level and the earlier ones are the history.
 *
 * Shared with the phone app: scripts/sync-shared.js copies this file to pwa/shared/.
 */
const Levels = (() => {
  /** @type {ReadonlyArray<{ value: LevelValue, key: string, label: string }>} */
  const ALL = Object.freeze([
    Object.freeze({ value: /** @type {LevelValue} */ (0), key: 'not_started', label: 'Not started' }),
    Object.freeze({ value: /** @type {LevelValue} */ (1), key: 'learning', label: 'Learning' }),
    Object.freeze({ value: /** @type {LevelValue} */ (2), key: 'practising', label: 'Practising' }),
    Object.freeze({ value: /** @type {LevelValue} */ (3), key: 'confident', label: 'Confident' }),
    Object.freeze({ value: /** @type {LevelValue} */ (4), key: 'mastered', label: 'Mastered' }),
  ]);
  const MAX = 4;
  /** Started but not mastered, with nothing recorded for this many days: "not practised lately". */
  const STALE_DAYS = 14;

  /** @param {unknown} value @returns {value is LevelValue} */
  const isValid = (value) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX;

  /** @param {unknown} value */
  const label = (value) => (isValid(value) ? ALL[value].label : '');

  /**
   * Which of two rows is later: the day assessed, then when it was saved, then its id.
   * @param {Progress} a @param {Progress} b @returns {number}
   */
  function compare(a, b) {
    if (a.on !== b.on) return a.on < b.on ? -1 : 1;
    const ua = a.updated_at || '';
    const ub = b.updated_at || '';
    if (ua !== ub) return ua < ub ? -1 : 1;
    if (a.progress_id === b.progress_id) return 0;
    return a.progress_id < b.progress_id ? -1 : 1;
  }

  /**
   * The current row for a child on a topic, or null if nothing is recorded.
   * @param {ReadonlyArray<Progress>} rows @param {string} childId @param {string} topicId @returns {Progress|null}
   */
  function latest(rows, childId, topicId) {
    /** @type {Progress|null} */
    let best = null;
    for (const row of rows) {
      if (row.deleted || row.child_id !== childId || row.topic_id !== topicId) continue;
      if (best === null || compare(row, best) > 0) best = row;
    }
    return best;
  }

  /**
   * The current row for each topic a child has any row for.
   * @param {ReadonlyArray<Progress>} rows @param {string} childId @returns {Record<string, Progress>}
   */
  function current(rows, childId) {
    /** @type {Record<string, Progress>} */
    const out = {};
    for (const row of rows) {
      if (row.deleted || row.child_id !== childId) continue;
      const have = out[row.topic_id];
      if (!have || compare(row, have) > 0) out[row.topic_id] = row;
    }
    return out;
  }

  /** A child's history on one topic, newest first. @param {ReadonlyArray<Progress>} rows @param {string} childId @param {string} topicId */
  function history(rows, childId, topicId) {
    return rows.filter((r) => !r.deleted && r.child_id === childId && r.topic_id === topicId).sort((a, b) => compare(b, a));
  }

  /**
   * Counts and the topics needing attention, for the topics given (e.g. one subject's, or all of a track's).
   * @param {ReadonlyArray<string>} topicIds @param {ReadonlyArray<Progress>} rows @param {string} childId @param {string} today
   * @returns {ProgressSummary}
   */
  function summary(topicIds, rows, childId, today) {
    const now = current(rows, childId);
    const counts = [0, 0, 0, 0, 0];
    /** @type {string[]} */
    const weak = [];
    /** @type {string[]} */
    const stale = [];
    let sum = 0;
    for (const id of topicIds) {
      const row = now[id];
      const level = row ? row.level : 0;
      counts[level] += 1;
      sum += level;
      if (level === 1 || level === 2) weak.push(id);
      if (row && level >= 1 && level < MAX && Dates.daysBetween(row.on, today) >= STALE_DAYS) stale.push(id);
    }
    const percent = topicIds.length === 0 ? 0 : Math.round((sum * 100) / (topicIds.length * MAX));
    return { counts, weak, stale, percent };
  }

  return { ALL, MAX, STALE_DAYS, isValid, label, compare, latest, current, history, summary };
})();

export { Levels };
