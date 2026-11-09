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

  const text = /** @type {HTMLTextAreaElement} */ (el('textarea', { rows: 4, placeholder: 'Paste or type the words: one per line, or separated by spaces or commas', 'aria-label': 'Words' }));
  const week = input('date', thisWeek, { max: Dates.addDays(today(), 21) });
  const add = /** @type {HTMLButtonElement} */ (el('button', { class: 'primary', type: 'button' }, 'Add words'));
  const messages = el('div', { class: 'messages' });
  add.addEventListener('click', async () => {
    const r = await busy(add, () => store.addWords(child.child_id, week.get(), text.value, today()));
    if (!r.ok) { showIssues(messages, { errors: r.errors, warnings: [] }); return; }
    toast(`${r.data.added} word${r.data.added === 1 ? '' : 's'} added${r.data.skipped ? `, ${r.data.skipped} already there` : ''}.`);
  });

  /** One word: its text, three buttons to mark it, and a remove button. @param {Word} w */
  const row = (w) => el('li', { class: `word s${w.status}` },
    el('span', { class: 'word-text' }, w.word),
    el('span', { class: 'segmented small', role: 'group', 'aria-label': `${w.word}: how well known` }, Words.STATUSES.map((s) =>
      el('button', { type: 'button', 'aria-pressed': String(w.status === s.value), onclick: async () => {
        if (w.status === s.value) return;
        const r = await store.markWord(w.word_id, s.value);
        if (!r.ok) toast(r.errors.map((e) => e.message).join('; '));
      } }, s.label))),
    el('button', { class: 'link', type: 'button', 'aria-label': `Remove ${w.word}`, onclick: async () => {
      const r = await store.removeWord(w.word_id);
      if (r.ok) toast(`${w.word} removed.`); else toast(r.errors.map((e) => e.message).join('; '));
    } }, '✕'));

  const known = (/** @type {Word[]} */ ws) => ws.filter((w) => w.status === Words.KNOWN).length;
  const weeks = lists.weeks.slice(0, WEEKS_SHOWN + 1);
  main.replaceChildren(
    el('h1', { class: `screen-title ${kidClass(child)}` }, el('i', { class: 'dot' }), `Words · ${child.name}`, el('span', { class: 'muted small' }, ` ${yearText(child)}`)),
    childBar(() => wordsScreen(main)),
    el('section', { class: 'card' },
      el('h2', {}, 'Add the school’s words'),
      el('div', { class: 'form flat' }, field('Words', text), field('Week starting', week.node), messages, el('div', { class: 'actions' }, add))),
    lists.tricky.length ? el('section', { class: 'card' },
      el('div', { class: 'title-row' }, el('h2', {}, 'Tricky words'), el('span', { class: 'count' }, String(lists.tricky.length))),
      el('p', { class: 'hint' }, 'Not yet known, from every week. Mark a word “Know it” and it leaves this list.'),
      el('ul', { class: 'words' }, lists.tricky.map(row))) : '',
    ...(weeks.length === 0 ? [empty(`No words for ${child.name} yet.`)] : weeks.map((g) => el('section', { class: 'card' },
      el('div', { class: 'title-row' }, el('h2', {}, g.week === thisWeek ? 'This week' : `Week of ${uk(g.week)}`), el('span', { class: 'count' }, `${known(g.words)} of ${g.words.length} known`)),
      el('ul', { class: 'words' }, g.words.map(row))))),
    lists.weeks.length > weeks.length ? el('p', { class: 'muted small' }, `${lists.weeks.length - weeks.length} earlier weeks not shown; tricky words from them are listed above.`) : '');
}
