// @ts-check
// GENERATED from apps-script/domain/words.js by scripts/sync-shared.js. Do not edit here:
// edit that file and run `npm run sync:shared`.

/**
 * The weekly spelling words the school sends. A week is the Monday it starts. Each word has a status the child's
 * parent sets while practising: Not yet, Getting there, Know it. A word that is not yet "Know it" stays on the Tricky
 * words list, from whichever week it came.
 *
 * Shared with the phone app: scripts/sync-shared.js copies this file to pwa/shared/.
 */
const Words = (() => {
  /** @type {ReadonlyArray<{ value: 0|1|2, label: string }>} */
  const STATUSES = Object.freeze([
    Object.freeze({ value: /** @type {0} */ (0), label: 'Not yet' }),
    Object.freeze({ value: /** @type {1} */ (1), label: 'Getting there' }),
    Object.freeze({ value: /** @type {2} */ (2), label: 'Know it' }),
  ]);
  const KNOWN = 2;
  const MAX_PER_ADD = 60;
  const MAX_LENGTH = 30;
  /** Letters, with ' ’ - inside (don't, well-known). */
  const WORD = /^\p{L}[\p{L}'’-]*$/u;

  /** @param {unknown} value @returns {value is 0|1|2} */
  const isStatus = (value) => value === 0 || value === 1 || value === 2;

  /** @param {unknown} value */
  const label = (value) => (isStatus(value) ? STATUSES[value].label : '');

  /**
   * The words in what someone typed or pasted: separated by new lines, spaces, commas or semicolons; list numbers and
   * bullets ("1.", "-") are ignored, and a word given twice is kept once. Anything that is not a word is reported.
   * @param {unknown} text
   * @returns {{ words: string[], bad: string[] }}
   */
  function parse(text) {
    /** @type {string[]} */
    const words = [];
    /** @type {string[]} */
    const bad = [];
    const seen = new Set();
    for (const token of String(text ?? '').split(/[\s,;]+/)) {
      if (token === '' || /^(\d+[.):]?|[-•*–])$/.test(token)) continue;
      if (!WORD.test(token) || token.length > MAX_LENGTH) { bad.push(token.slice(0, MAX_LENGTH)); continue; }
      const key = token.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      words.push(token);
    }
    return { words, bad };
  }

  /**
   * A child's live words that are not yet known, newest week first, then alphabetical.
   * @param {ReadonlyArray<Word>} rows @param {string} childId @returns {Word[]}
   */
  function tricky(rows, childId) {
    return rows.filter((w) => !w.deleted && w.child_id === childId && w.status !== KNOWN)
      .sort((a, b) => (a.week === b.week ? a.word.localeCompare(b.word, 'en-GB') : (a.week < b.week ? 1 : -1)));
  }

  /**
   * A child's live words grouped by week, newest week first; words in a week are alphabetical.
   * @param {ReadonlyArray<Word>} rows @param {string} childId @returns {Array<{ week: string, words: Word[] }>}
   */
  function weeks(rows, childId) {
    /** @type {Map<string, Word[]>} */
    const byWeek = new Map();
    for (const w of rows) {
      if (w.deleted || w.child_id !== childId) continue;
      byWeek.set(w.week, [...(byWeek.get(w.week) ?? []), w]);
    }
    return [...byWeek.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([week, words]) => ({ week, words: words.sort((a, b) => a.word.localeCompare(b.word, 'en-GB')) }));
  }

  /**
   * One week's words in their groups: each spelling rule (alphabetical) with its words, then the words with no rule.
   * @param {ReadonlyArray<Word>} words @returns {Array<{ note: string|null, words: Word[] }>}
   */
  function byNote(words) {
    /** @type {Map<string, Word[]>} */
    const groups = new Map();
    for (const w of words) groups.set(w.note || '', [...(groups.get(w.note || '') ?? []), w]);
    const named = [...groups.entries()].filter(([note]) => note !== '').sort((a, b) => a[0].localeCompare(b[0], 'en-GB'));
    return [...named, ...(groups.has('') ? [['', groups.get('')]] : [])]
      .map(([note, list]) => ({ note: /** @type {string} */ (note) || null, words: /** @type {Word[]} */ (list) }));
  }

  return { STATUSES, KNOWN, MAX_PER_ADD, MAX_LENGTH, isStatus, label, parse, tricky, weeks, byNote };
})();

export { Words };
