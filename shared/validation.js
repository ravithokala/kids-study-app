// @ts-check
// GENERATED from apps-script/domain/validation.js by scripts/sync-shared.js. Do not edit here:
// edit that file and run `npm run sync:shared`.
import { Dates } from './dates.js';
import { Model } from './model.js';
import { Levels } from './levels.js';
import { Words } from './words.js';

/**
 * Checks and tidies what someone entered. The server always validates; the phone runs the same
 * checks first. Each function returns the tidied values plus any errors ({ field, code, message }).
 * `known` is what already exists, so references are checked and a name is not used twice side by side.
 *
 * Shared with the phone app: scripts/sync-shared.js copies this file to pwa/shared/.
 */
const Validation = (() => {
  const ID = /^[A-Za-z0-9-]{8,80}$/;
  const LIMITS = Object.freeze({ child: 40, name: 80, note: 300, rule: 100 });

  /** @param {unknown} value */
  const isId = (value) => typeof value === 'string' && ID.test(value);

  function collector() {
    /** @type {Issue[]} */
    const errors = [];
    return {
      errors,
      /** @param {string} field @param {string} code @param {string} message */
      add(field, code, message) { errors.push({ field, code, message }); },
      /**
       * Text: trimmed. Blank is REQUIRED when `required`, otherwise null.
       * @param {string} field @param {unknown} value @param {number} max @param {boolean} required @returns {string|null}
       */
      text(field, value, max, required) {
        if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
          if (required) this.add(field, 'REQUIRED', 'is required');
          return null;
        }
        if (typeof value !== 'string') { this.add(field, 'INVALID', 'must be text'); return null; }
        const trimmed = value.trim();
        if (trimmed.length > max) this.add(field, 'TOO_LONG', `must be at most ${max} characters`);
        return trimmed;
      },
      /**
       * A whole number in a range; blank is REQUIRED when `required`, otherwise null.
       * @param {string} field @param {unknown} value @param {number} min @param {number} max @param {boolean} required @returns {number|null}
       */
      int(field, value, min, max, required) {
        if (value === null || value === undefined || value === '') {
          if (required) this.add(field, 'REQUIRED', 'is required');
          return null;
        }
        const n = typeof value === 'string' ? Number(value) : value;
        if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max) {
          this.add(field, 'INVALID', `must be a whole number from ${min} to ${max}`);
          return null;
        }
        return n;
      },
    };
  }

  /**
   * @param {ReadonlyArray<{ name: string, deleted: boolean }>} siblings
   * @param {string|null} name @param {string|null} [self]  the row being edited (its id), which is not a duplicate of itself
   * @param {(row: any) => string} [idOf]
   */
  function taken(siblings, name, self, idOf) {
    if (!name) return false;
    const wanted = name.toLowerCase();
    return siblings.some((s) => !s.deleted && s.name.toLowerCase() === wanted && (!self || !idOf || idOf(s) !== self));
  }

  /**
   * @param {any} input @param {{ children: ReadonlyArray<Child>, self?: string|null }} known
   */
  function child(input, known) {
    const c = collector();
    const name = c.text('name', input.name, LIMITS.child, true);
    const year_group = c.int('year_group', input.year_group, Model.MIN_YEAR, Model.MAX_YEAR, true);
    let colour = null;
    if (input.colour !== null && input.colour !== undefined && input.colour !== '') {
      if (Model.COLOURS.includes(input.colour)) colour = input.colour;
      else c.add('colour', 'INVALID', 'is not one of the colours');
    }
    if (taken(known.children, name, known.self, (r) => r.child_id)) c.add('name', 'DUPLICATE', 'is already a child');
    return { value: { name, year_group, colour }, errors: c.errors };
  }

  /**
   * @param {any} input @param {{ subjects: ReadonlyArray<Subject>, self?: string|null }} known
   */
  function subject(input, known) {
    const c = collector();
    const name = c.text('name', input.name, LIMITS.name, true);
    const track = Model.TRACKS.some((t) => t.id === input.track) ? input.track : null;
    if (!track) c.add('track', 'INVALID', 'must be School or 11+');
    const sameTrack = known.subjects.filter((s) => s.track === track);
    if (taken(sameTrack, name, known.self, (r) => r.subject_id)) c.add('name', 'DUPLICATE', 'is already a subject in this track');
    return { value: { track, name }, errors: c.errors };
  }

  /**
   * @param {any} input @param {{ subjects: ReadonlyArray<Subject>, sections: ReadonlyArray<Section>, self?: string|null }} known
   */
  function section(input, known) {
    const c = collector();
    const name = c.text('name', input.name, LIMITS.name, true);
    const subject_id = input.subject_id;
    if (!isId(subject_id) || !known.subjects.some((s) => s.subject_id === subject_id && !s.deleted)) c.add('subject_id', 'INVALID', 'must be an existing subject');
    const siblings = known.sections.filter((s) => s.subject_id === subject_id);
    if (taken(siblings, name, known.self, (r) => r.section_id)) c.add('name', 'DUPLICATE', 'is already a section in this subject');
    return { value: { subject_id, name }, errors: c.errors };
  }

  /**
   * @param {any} input @param {{ sections: ReadonlyArray<Section>, topics: ReadonlyArray<Topic>, self?: string|null }} known
   */
  function topic(input, known) {
    const c = collector();
    const name = c.text('name', input.name, LIMITS.name, true);
    const year_group = c.int('year_group', input.year_group, Model.MIN_YEAR, Model.MAX_YEAR, false);
    const section_id = input.section_id;
    if (!isId(section_id) || !known.sections.some((s) => s.section_id === section_id && !s.deleted)) c.add('section_id', 'INVALID', 'must be an existing section');
    const siblings = known.topics.filter((t) => t.section_id === section_id);
    if (taken(siblings, name, known.self, (r) => r.topic_id)) c.add('name', 'DUPLICATE', 'is already a topic in this section');
    return { value: { section_id, name, year_group }, errors: c.errors };
  }

  /**
   * A new level for a child on a topic. `on` is the day assessed (today if left out) and may not be in the future.
   * @param {any} input
   * @param {{ children: ReadonlyArray<Child>, topics: ReadonlyArray<Topic>, today: string }} known
   */
  function progress(input, known) {
    const c = collector();
    const child_id = input.child_id;
    if (!isId(child_id) || !known.children.some((r) => r.child_id === child_id && !r.deleted)) c.add('child_id', 'INVALID', 'must be an existing child');
    const topic_id = input.topic_id;
    if (!isId(topic_id) || !known.topics.some((r) => r.topic_id === topic_id && !r.deleted)) c.add('topic_id', 'INVALID', 'must be an existing topic');
    /** @type {LevelValue|null} */
    let level = null;
    if (Levels.isValid(input.level)) level = input.level;
    else c.add('level', input.level === undefined || input.level === null ? 'REQUIRED' : 'INVALID', 'must be a level from 0 to 4');
    const score = c.int('score', input.score, 0, 100, false);
    let on = known.today;
    if (input.on !== undefined && input.on !== null && input.on !== '') {
      if (!Dates.isValid(input.on)) c.add('on', 'INVALID', 'must be a real date');
      else if (input.on > known.today) c.add('on', 'INVALID', 'cannot be in the future');
      else on = input.on;
    }
    const note = c.text('note', input.note, LIMITS.note, false);
    return { value: { child_id, topic_id, level, score, on, note }, errors: c.errors };
  }

  /**
   * Words pasted for a child and a week (any day in the week; it is moved to the Monday). Up to a few weeks ahead.
   * @param {any} input  { child_id, week?, text, note? }  note: the spelling rule the words share
   * @param {{ children: ReadonlyArray<Child>, today: string }} known
   */
  function words(input, known) {
    const c = collector();
    const child_id = input.child_id;
    if (!isId(child_id) || !known.children.some((r) => r.child_id === child_id && !r.deleted)) c.add('child_id', 'INVALID', 'must be an existing child');
    let week = Dates.weekStart(known.today);
    if (input.week !== undefined && input.week !== null && input.week !== '') {
      if (!Dates.isValid(input.week)) c.add('week', 'INVALID', 'must be a real date');
      else if (Dates.daysBetween(known.today, input.week) > 21) c.add('week', 'INVALID', 'is too far ahead');
      else week = Dates.weekStart(input.week);
    }
    const parsed = Words.parse(input.text);
    if (parsed.bad.length) c.add('text', 'INVALID', `${parsed.bad.slice(0, 3).map((b) => `"${b}"`).join(', ')}${parsed.bad.length > 3 ? ' and more' : ''} ${parsed.bad.length === 1 ? 'is' : 'are'} not ${parsed.bad.length === 1 ? 'a word' : 'words'}: use letters only, one word at a time`);
    if (parsed.words.length === 0 && parsed.bad.length === 0) c.add('text', 'REQUIRED', 'add at least one word');
    if (parsed.words.length > Words.MAX_PER_ADD) c.add('text', 'TOO_MANY', `at most ${Words.MAX_PER_ADD} words at a time`);
    const note = c.text('note', input.note, LIMITS.rule, false);
    return { value: { child_id, week, words: parsed.words, note }, errors: c.errors };
  }

  return { LIMITS, isId, child, subject, section, topic, progress, words };
})();

export { Validation };
