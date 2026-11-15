// @ts-check
// GENERATED from apps-script/domain/mocks.js by scripts/sync-shared.js. Do not edit here:
// edit that file and run `npm run sync:shared`.

/**
 * 11+ mock tests. A mock goes Attempted (sat, not yet marked), Reviewed (marked, and gone through with the topics that lost
 * marks noted), then Done (the follow-up practice on those topics is finished). A topic that keeps losing marks across
 * mocks is what is worth practising.
 *
 * Shared with the phone app: scripts/sync-shared.js copies this file to pwa/shared/.
 */
const Mocks = (() => {
  /** @type {ReadonlyArray<{ value: 0|1|2, label: string }>} */
  const STATUSES = Object.freeze([
    Object.freeze({ value: /** @type {0} */ (0), label: 'Attempted' }),
    Object.freeze({ value: /** @type {1} */ (1), label: 'Reviewed' }),
    Object.freeze({ value: /** @type {2} */ (2), label: 'Done' }),
  ]);

  /** @param {unknown} value @returns {value is 0|1|2} */
  const isStatus = (value) => value === 0 || value === 1 || value === 2;

  /** @param {unknown} value */
  const label = (value) => (isStatus(value) ? STATUSES[value].label : '');

  /** The score as a whole percentage, or null if there is no score. @param {number|null|undefined} marks @param {number|null|undefined} outOf */
  function percent(marks, outOf) {
    if (typeof marks !== 'number' || typeof outOf !== 'number' || outOf <= 0) return null;
    return Math.round((marks * 100) / outOf);
  }

  /** '34 / 50 · 68%', or '' with no score. @param {Mock} mock */
  function scoreText(mock) {
    const p = percent(mock.marks, mock.out_of);
    return p === null ? '' : `${mock.marks} / ${mock.out_of} · ${p}%`;
  }

  /**
   * A child's live mocks, newest first.
   * @param {ReadonlyArray<Mock>} rows @param {string} childId @returns {Mock[]}
   */
  function forChild(rows, childId) {
    return rows.filter((m) => !m.deleted && m.child_id === childId)
      .sort((a, b) => (a.taken_on === b.taken_on ? (a.updated_at || '') < (b.updated_at || '') ? 1 : -1 : (a.taken_on < b.taken_on ? 1 : -1)));
  }

  /**
   * Topics that lost marks in at least `min` of a child's mocks (once per mock), most often first.
   * @param {ReadonlyArray<Mock>} rows @param {string} childId @param {number} [min] @returns {Array<{ topic_id: string, count: number }>}
   */
  function recurring(rows, childId, min = 2) {
    /** @type {Map<string, number>} */
    const counts = new Map();
    for (const m of forChild(rows, childId)) for (const id of new Set(m.weak)) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts.entries()].filter(([, n]) => n >= min).map(([topic_id, count]) => ({ topic_id, count }))
      .sort((a, b) => (b.count - a.count) || (a.topic_id < b.topic_id ? -1 : 1));
  }

  return { STATUSES, isStatus, label, percent, scoreText, forChild, recurring };
})();

export { Mocks };
