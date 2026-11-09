// @ts-check
// GENERATED from apps-script/domain/model.js by scripts/sync-shared.js. Do not edit here:
// edit that file and run `npm run sync:shared`.

/**
 * The records' fields (in sheet column order) and their fixed vocabularies. Adding a field at the
 * END of a list is additive (Bootstrap appends the column); any other change to a tab holding
 * live data needs an explicit migration.
 *
 * Shared with the phone app: scripts/sync-shared.js copies this file to pwa/shared/.
 */
const Model = (() => {
  const CHILD_FIELDS = Object.freeze(['child_id', 'name', 'year_group', 'colour', 'sort', 'deleted', 'version', 'updated_at', 'updated_by']);
  const SUBJECT_FIELDS = Object.freeze(['subject_id', 'track', 'name', 'sort', 'deleted', 'version', 'updated_at', 'updated_by']);
  const SECTION_FIELDS = Object.freeze(['section_id', 'subject_id', 'name', 'sort', 'deleted', 'version', 'updated_at', 'updated_by']);
  const TOPIC_FIELDS = Object.freeze(['topic_id', 'section_id', 'name', 'year_group', 'sort', 'deleted', 'version', 'updated_at', 'updated_by']);
  const PROGRESS_FIELDS = Object.freeze(['progress_id', 'child_id', 'topic_id', 'level', 'score', 'on', 'note', 'deleted', 'version', 'updated_at', 'updated_by']);
  /** A spelling word sent by school for one child, for one week (the Monday). status: see domain/words.js. */
  const WORD_FIELDS = Object.freeze(['word_id', 'child_id', 'word', 'week', 'status', 'practised_on', 'deleted', 'version', 'updated_at', 'updated_by']);

  /** The two tracks. These are fixed; subjects, sections and topics under them are data. */
  const TRACKS = Object.freeze([
    Object.freeze({ id: /** @type {TrackId} */ ('school'), label: 'School' }),
    Object.freeze({ id: /** @type {TrackId} */ ('eleven-plus'), label: '11+' }),
  ]);

  /** Colours a child can be shown in (names of CSS tokens on the phone). */
  const COLOURS = Object.freeze(['blue', 'green', 'orange', 'purple', 'pink', 'teal']);

  /** School years: 0 is Reception. */
  const MIN_YEAR = 0;
  const MAX_YEAR = 13;

  /** 'Reception', 'Year 5'. @param {number|null|undefined} year */
  function yearLabel(year) {
    if (year === null || year === undefined || !Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) return '';
    return year === 0 ? 'Reception' : `Year ${year}`;
  }

  /** @param {string} id @returns {string} */
  function trackLabel(id) {
    const found = TRACKS.find((t) => t.id === id);
    return found ? found.label : '';
  }

  /** @returns {Child} */
  const blankChild = () => ({ child_id: '', name: '', year_group: 1, colour: null, sort: 0, deleted: false, version: 0, updated_at: null, updated_by: null });

  return { CHILD_FIELDS, SUBJECT_FIELDS, SECTION_FIELDS, TOPIC_FIELDS, PROGRESS_FIELDS, WORD_FIELDS, TRACKS, COLOURS, MIN_YEAR, MAX_YEAR,
    yearLabel, trackLabel, blankChild };
})();

export { Model };
