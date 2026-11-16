// @ts-check

import { el, today, uk } from '../dom.js';
import * as store from '../store/store.js';
import { Mocks } from '../shared/mocks.js';
import { openSheet, showIssues, toast } from './sheet.js';
import { field, input, busy } from './fields.js';

/** A mock's status as a coloured pill, with its words. @param {0|1|2} status */
export const statusPill = (status) => el('span', { class: `pill m${status}` }, Mocks.label(status));

/**
 * The Mock tests card on the 11+ screen: the child's mocks, newest first, each with its subject, date, score and status.
 * Tap one to open it; the button adds one.
 * @param {Child} child
 * @param {() => void} redraw
 */
export function mocksCard(child, redraw) {
  const mocks = store.mocksOf(child.child_id);
  return el('section', { class: 'card' },
    el('div', { class: 'title-row' }, el('h2', {}, 'Mock tests'), el('span', { class: 'count' }, mocks.length ? String(mocks.length) : '')),
    mocks.length === 0 ? el('p', { class: 'muted small' }, `No mock tests yet for ${child.name}. Add one after each paper.`)
      : el('ul', { class: 'rows' }, mocks.map((m) => {
        const subject = store.data.subjects[m.subject_id];
        const score = Mocks.scoreText(m);
        return el('li', {}, el('button', { class: `row m${m.status}`, type: 'button', onclick: () => mockSheet(child, m.mock_id, redraw) },
          el('div', { class: 'row-main' }, el('div', { class: 'row-title' }, m.title),
            el('div', { class: 'row-sub' }, [subject?.name ?? '', uk(m.taken_on)].filter(Boolean).join(' · ')),
            score ? el('div', { class: 'row-when' }, score) : ''),
          statusPill(m.status)));
      })),
    el('div', { class: 'add-row' }, el('button', { class: 'button', type: 'button', onclick: () => mockSheet(child, null, redraw) }, '+ Add a mock test')));
}

/**
 * Add or open a mock test: subject, title, day, status (chosen here), marks out of total, minutes, notes, and the topics found
 * at review: the ones that lost marks, and the ones that went well.
 * @param {Child} child
 * @param {string|null} id  a mock to change; none adds one
 * @param {() => void} redraw
 */
export function mockSheet(child, id, redraw) {
  const mock = id ? store.data.mocks[id] : null;
  // A new mock uses this child's own 11+ subjects; a saved one keeps its subject (an old shared one too).
  const own = mock ? [store.subjectNode(mock.subject_id)].filter((s) => s !== null) : store.tree('eleven-plus', child.child_id);
  const subjects = /** @type {SubjectNode[]} */ (own);
  if (subjects.length === 0) { toast(`Add ${child.name}'s 11+ subjects first (the standard ones, below).`); return; }
  let subjectId = mock ? mock.subject_id : subjects[0].subject_id;
  let status = mock ? mock.status : 0;
  const weak = new Set(mock ? mock.weak : []);
  const strong = new Set(mock ? mock.strong : []);

  const subjectSelect = /** @type {HTMLSelectElement} */ (el('select', { disabled: Boolean(mock) }, subjects.map((s) => el('option', { value: s.subject_id, selected: s.subject_id === subjectId }, s.name))));
  const title = input('text', mock?.title ?? null, { maxlength: 80, autocomplete: 'off', placeholder: 'e.g. CGP paper 3' });
  const taken = input('date', mock?.taken_on ?? today(), { max: today() });
  const marks = input('number', mock?.marks !== null && mock?.marks !== undefined ? String(mock.marks) : null, { min: 0, inputmode: 'numeric' });
  const outOf = input('number', mock?.out_of !== null && mock?.out_of !== undefined ? String(mock.out_of) : null, { min: 1, inputmode: 'numeric' });
  const minutes = input('number', mock?.minutes !== null && mock?.minutes !== undefined ? String(mock.minutes) : null, { min: 1, inputmode: 'numeric' });
  const note = /** @type {HTMLTextAreaElement} */ (el('textarea', { rows: 3, maxlength: 300, placeholder: 'e.g. ran out of time on the last section' }));
  note.value = mock?.note ?? '';
  const percent = el('div', { class: 'muted small' });
  const showPercent = () => {
    const m = marks.node.value === '' ? null : Number(marks.node.value);
    const o = outOf.node.value === '' ? null : Number(outOf.node.value);
    const p = Mocks.percent(m, o);
    percent.textContent = p === null ? '' : `${p}%`;
  };
  marks.node.addEventListener('input', showPercent);
  outOf.node.addEventListener('input', showPercent);
  showPercent();

  const statusChoices = el('div', { class: 'level-choices three', role: 'group', 'aria-label': 'Status' });
  const drawStatus = () => statusChoices.replaceChildren(...Mocks.STATUSES.map((s) => el('button', { type: 'button', 'aria-pressed': String(s.value === status),
    onclick: () => { status = s.value; drawStatus(); } }, s.label)));
  drawStatus();

  const topicBoxes = el('div', {});
  /** One group of topic chips, by section. @param {string} heading @param {Set<string>} mine @param {Set<string>} other @param {boolean} open */
  const group = (heading, mine, other, open) => {
    const node = subjects.find((s) => s.subject_id === subjectId);
    const body = el('div', {}, (node?.sections ?? []).filter((c) => c.topics.length).map((c) => el('div', { class: 'topic-group' },
      el('div', { class: 'check-group' }, c.name),
      el('div', { class: 'chips' }, c.topics.map((t) => el('button', { type: 'button', 'aria-pressed': String(mine.has(t.topic_id)), onclick: () => {
        if (mine.has(t.topic_id)) mine.delete(t.topic_id); else { mine.add(t.topic_id); other.delete(t.topic_id); }
        drawTopics();
      } }, t.name))))));
    return el('details', { class: 'more-fields', open }, el('summary', {}, `${heading} (${mine.size})`), body);
  };
  const drawTopics = () => {
    topicBoxes.replaceChildren(
      group('Needed work', weak, strong, weak.size > 0 || status >= 1), group('Went well', strong, weak, strong.size > 0));
  };
  drawTopics();
  subjectSelect.addEventListener('change', () => { subjectId = subjectSelect.value; weak.clear(); strong.clear(); drawTopics(); });

  const save = /** @type {HTMLButtonElement} */ (el('button', { class: 'primary', type: 'button' }, 'Save'));
  const sheet = openSheet(mock ? 'Mock test' : 'Add a mock test', el('div', { class: 'form' },
    el('p', { class: 'muted small' }, `For ${child.name}.`),
    field('Subject', subjectSelect), field('Title', title.node),
    el('div', { class: 'row2' }, field('Day sat', taken.node), field('Minutes taken', minutes.node)),
    field('Status', statusChoices),
    el('div', { class: 'row2' }, field('Marks', marks.node), field('Out of', outOf.node)), percent,
    field('Notes', note),
    el('h3', { class: 'check-group' }, 'Topics found at review'),
    el('p', { class: 'muted small' }, 'Tap the topics that lost marks. Topics that keep coming up in mocks are listed on Home.'),
    topicBoxes,
    el('div', { class: 'actions' },
      mock ? el('button', { class: 'danger', type: 'button', onclick: async (/** @type {Event} */ ev) => {
        if (!window.confirm('Remove this mock test? It stays in the sheet but is no longer shown.')) return;
        const r = await busy(/** @type {HTMLButtonElement} */ (ev.currentTarget), () => store.removeMock(mock.mock_id));
        if (r.ok) { sheet.close(); toast('Mock test removed.'); } else showIssues(sheet.messages, { errors: r.errors, warnings: [] });
      } }, 'Remove') : '',
      save)));
  save.addEventListener('click', async () => {
    const r = await busy(save, () => store.saveMock(id, {
      child_id: child.child_id, subject_id: subjectId, title: title.get(), taken_on: taken.get(), status,
      marks: marks.get(), out_of: outOf.get(), minutes: minutes.get(), note: note.value.trim() || null, weak: [...weak], strong: [...strong],
    }, today()));
    if (r.ok) { sheet.close(); toast(mock ? 'Saved.' : 'Mock test added.'); redraw(); } else showIssues(sheet.messages, { errors: r.errors, warnings: [] });
  });
  if (!mock) title.node.focus();
}
