// @ts-check

import { el, today, uk } from '../dom.js';
import * as store from '../store/store.js';
import { Words } from '../shared/words.js';
import { Dates } from '../shared/dates.js';
import { toast, showIssues } from './sheet.js';
import { field, input, busy } from './fields.js';
import { childBar, empty, kidClass, yearText } from './parts.js';

/** How many past weeks are shown under the current one. */
const WEEKS_SHOWN = 8;

/**
 * What has been typed in the add form but not added yet. The screen is redrawn whenever the data refreshes (coming back to
 * the app after another tab, every five minutes), which would empty the form: so it is kept here, and in this tab's session
 * storage in case the browser reloads the page while the app is in the background.
 * @typedef {{ text: string, note: string, week: string|null }} Draft
 */
/** Words whose status is being saved. */
const pending = new Set();
/** The lists ('tricky', or a week) showing remove buttons. */
const editing = new Set();

const DRAFT_KEY = 'ks.words-draft';
/** @type {Draft|null} */
let draft = null;

/** @returns {Draft} */
function loadDraft() {
  if (draft) return draft;
  draft = { text: '', note: '', week: null };
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null');
    if (saved && typeof saved.text === 'string' && typeof saved.note === 'string') draft = { text: saved.text, note: saved.note, week: typeof saved.week === 'string' ? saved.week : null };
  } catch (e) { /* no saved draft */ }
  return draft;
}

function saveDraft() {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) { /* kept in memory only */ }
}

/**
 * The weekly spelling words from school, for the child on screen: paste the week's list, mark each word as practised,
 * and see the tricky ones (not yet known) from every week.
 * @param {HTMLElement} main
 */
export function wordsScreen(main) {
  const child = store.currentChild();
  if (!child) {
    main.replaceChildren(el('h1', { class: 'screen-title' }, 'Words'), empty('Add a child first (More → Children).'));
    return;
  }
  const lists = store.wordLists(child.child_id);
  const thisWeek = Dates.weekStart(today());
  const mine = loadDraft();
  // The field being typed in, so it keeps the cursor after a redraw.
  const active = document.activeElement;
  const focused = active instanceof HTMLElement && active.dataset.draft ? { name: active.dataset.draft, at: /** @type {HTMLInputElement} */ (active).selectionStart } : null;

  const text = /** @type {HTMLTextAreaElement} */ (el('textarea', { rows: 4, 'data-draft': 'text', placeholder: 'Paste or type the words: one per line, or separated by spaces or commas', 'aria-label': 'Words' }));
  const note = input('text', null, { 'data-draft': 'note', maxlength: 100, placeholder: 'Optional, e.g. -cious: the /shuhs/ sound', autocomplete: 'off' });
  const week = input('date', mine.week ?? thisWeek, { 'data-draft': 'week', max: Dates.addDays(today(), 21) });
  text.value = mine.text;
  note.node.value = mine.note;
  text.addEventListener('input', () => { mine.text = text.value; saveDraft(); });
  note.node.addEventListener('input', () => { mine.note = note.node.value; saveDraft(); });
  week.node.addEventListener('change', () => { mine.week = week.node.value || null; saveDraft(); });
  const add = /** @type {HTMLButtonElement} */ (el('button', { class: 'primary', type: 'button' }, 'Add words'));
  const messages = el('div', { class: 'messages' });
  add.addEventListener('click', async () => {
    const r = await busy(add, () => store.addWords(child.child_id, week.get(), text.value, note.get(), today()));
    if (!r.ok) { showIssues(messages, { errors: r.errors, warnings: [] }); return; }
    // Added: the words and the rule are cleared (the next group has its own rule); the week stays.
    mine.text = '';
    mine.note = '';
    saveDraft();
    wordsScreen(main);
    toast(`${r.data.added} word${r.data.added === 1 ? '' : 's'} added${r.data.skipped ? `, ${r.data.skipped} already there` : ''}.`);
  });

  /**
   * One word: the word, a status pill (tap to go Not yet, Getting there, Know it, and round again), a quick tick for Know it
   * (tap it again to take it back to Not yet), and, while its list is being edited, a remove button. A word being saved ignores
   * further taps, so a quick second tap cannot send a stale version.
   * @param {Word} w @param {boolean} [showNote] the rule as a tag (the Tricky list, where words are not grouped) @param {boolean} [editingNow]
   */
  const row = (w, showNote = false, editingNow = false) => {
    /** @param {0|1|2} status */
    const mark = async (status) => {
      if (pending.has(w.word_id)) return;
      pending.add(w.word_id);
      try {
        const r = await store.markWord(w.word_id, status);
        if (!r.ok) toast(r.errors.map((e) => e.message).join('; '));
      } finally {
        pending.delete(w.word_id);
      }
    };
    const known = w.status === Words.KNOWN;
    return el('li', { class: `word s${w.status}` },
      el('span', { class: 'word-text' }, w.word, w.note && showNote ? el('span', { class: 'tag' }, w.note) : ''),
      el('button', { type: 'button', class: `status s${w.status}`, 'aria-label': `${w.word}: ${Words.label(w.status)}. Tap to change.`,
        onclick: () => mark(/** @type {0|1|2} */ ((w.status + 1) % 3)) }, Words.label(w.status)),
      el('button', { type: 'button', class: `tick${known ? ' on' : ''}`, 'aria-pressed': String(known),
        'aria-label': known ? `${w.word}: known. Tap to mark Not yet.` : `Mark ${w.word} as known`, onclick: () => mark(known ? 0 : 2) }, '✓'),
      editingNow ? el('button', { class: 'link remove', type: 'button', 'aria-label': `Remove ${w.word}`, onclick: async () => {
        const r = await store.removeWord(w.word_id);
        if (r.ok) toast(`${w.word} removed.`); else toast(r.errors.map((e) => e.message).join('; '));
      } }, '✕') : '');
  };

  /** The Edit / Done link in a list's heading: while editing, its words show a remove button. @param {string} key */
  const editLink = (key) => el('button', { class: 'link', type: 'button', onclick: () => {
    if (editing.has(key)) editing.delete(key); else editing.add(key);
    wordsScreen(main);
  } }, editing.has(key) ? 'Done' : 'Edit');

  const known = (/** @type {Word[]} */ ws) => ws.filter((w) => w.status === Words.KNOWN).length;
  const weeks = lists.weeks.slice(0, WEEKS_SHOWN + 1);
  main.replaceChildren(
    el('h1', { class: `screen-title ${kidClass(child)}` }, el('i', { class: 'dot' }), `Words · ${child.name}`, el('span', { class: 'muted small' }, ` ${yearText(child)}`)),
    childBar(() => wordsScreen(main)),
    el('section', { class: 'card' },
      el('h2', {}, 'Add the school’s words'),
      el('div', { class: 'form flat' }, field('Words', text), field('Spelling rule or note', note.node), field('Week starting', week.node), messages, el('div', { class: 'actions' }, add))),
    lists.tricky.length ? el('section', { class: 'card' },
      el('div', { class: 'title-row' }, el('h2', {}, 'Tricky words'), el('span', { class: 'count' }, String(lists.tricky.length)), editLink('tricky')),
      el('p', { class: 'hint' }, 'Not yet known, from every week. Tap a word’s status to change it, or ✓ for Know it, and it leaves this list.'),
      el('ul', { class: 'words' }, lists.tricky.map((w) => row(w, true, editing.has('tricky'))))) : '',
    ...(weeks.length === 0 ? [empty(`No words for ${child.name} yet.`)] : weeks.map((g) => el('section', { class: 'card' },
      el('div', { class: 'title-row' }, el('h2', {}, g.week === thisWeek ? 'This week' : `Week of ${uk(g.week)}`), el('span', { class: 'count' }, `${known(g.words)} of ${g.words.length} known`), editLink(g.week)),
      Words.byNote(g.words).map((group) => el('div', { class: 'word-group' },
        group.note ? el('h3', { class: 'check-group' }, group.note) : (g.words.some((w) => w.note) ? el('h3', { class: 'check-group' }, 'Other words') : ''),
        el('ul', { class: 'words' }, group.words.map((w) => row(w, false, editing.has(g.week))))))))),
    lists.weeks.length > weeks.length ? el('p', { class: 'muted small' }, `${lists.weeks.length - weeks.length} earlier weeks not shown; tricky words from them are listed above.`) : '');
  if (focused) {
    const back = /** @type {HTMLInputElement|null} */ (main.querySelector(`[data-draft="${focused.name}"]`));
    back?.focus();
    if (back && focused.at !== null && 'setSelectionRange' in back && back.type !== 'date') back.setSelectionRange(focused.at, focused.at);
  }
}
