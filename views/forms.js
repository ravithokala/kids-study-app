// @ts-check

import { el } from '../dom.js';
import * as store from '../store/store.js';
import { Model } from '../shared/model.js';
import { openSheet, showIssues, toast } from './sheet.js';
import { field, input, busy } from './fields.js';

/**
 * The small forms for adding, renaming and removing a child, a subject, a section or a topic. One form builder; each
 * opening function says which fields it has.
 */

/**
 * @typedef {Object} FormSpec
 * @property {string} title
 * @property {string} nameLabel
 * @property {string|null} name
 * @property {{ value: number|null, any: boolean }} [year]   a year choice; `any` adds "Any year"
 * @property {{ value: string|null }} [colour]
 * @property {(values: { name: string|null, year: number|null, colour: string|null }) => Promise<{ ok: boolean, errors?: Issue[] }>} save
 * @property {() => Promise<{ ok: boolean, errors?: Issue[] }>} [remove]
 * @property {string} [removeAsk]   what to ask before removing
 * @property {string} [saved]       the message after a save
 */

/** @param {FormSpec} spec */
function openForm(spec) {
  const name = input('text', spec.name, { maxlength: 80, autocomplete: 'off', 'aria-label': spec.nameLabel });
  /** @type {HTMLSelectElement|null} */
  let yearSelect = null;
  if (spec.year) {
    yearSelect = /** @type {HTMLSelectElement} */ (el('select', {},
      spec.year.any ? el('option', { value: '' }, 'Any year') : '',
      Array.from({ length: Model.MAX_YEAR - Model.MIN_YEAR + 1 }, (_, i) => el('option', { value: String(i), selected: spec.year?.value === i }, Model.yearLabel(i)))));
  }
  let colour = spec.colour?.value ?? null;
  const chips = spec.colour ? el('div', { class: 'chips', role: 'group', 'aria-label': 'Colour' }) : null;
  const drawChips = () => chips?.replaceChildren(...Model.COLOURS.map((c) => el('button', { type: 'button', class: `kid-${c}`, 'aria-pressed': String(c === colour),
    onclick: () => { colour = c; drawChips(); } }, el('i', { class: 'dot' }), c)));
  drawChips();

  const save = /** @type {HTMLButtonElement} */ (el('button', { class: 'primary', type: 'button' }, 'Save'));
  const sheet = openSheet(spec.title, el('div', { class: 'form' },
    field(spec.nameLabel, name.node),
    yearSelect ? field(spec.year?.any ? 'Taught in' : 'School year', yearSelect) : '',
    chips ? field('Colour', chips) : '',
    el('div', { class: 'actions' },
      spec.remove ? el('button', { class: 'danger', type: 'button', onclick: async (/** @type {Event} */ ev) => {
        if (!window.confirm(spec.removeAsk ?? 'Remove this?')) return;
        const r = await busy(/** @type {HTMLButtonElement} */ (ev.currentTarget), /** @type {() => Promise<any>} */ (spec.remove));
        if (r.ok) { sheet.close(); toast('Removed.'); } else showIssues(sheet.messages, { errors: r.errors ?? [], warnings: [] });
      } }, 'Remove') : '',
      save)));
  save.addEventListener('click', async () => {
    const yearText = yearSelect?.value ?? '';
    const r = await busy(save, () => spec.save({ name: name.get(), year: yearText === '' ? null : Number(yearText), colour }));
    if (r.ok) { sheet.close(); toast(spec.saved ?? 'Saved.'); } else showIssues(sheet.messages, { errors: r.errors ?? [], warnings: [] });
  });
  name.node.focus();
}

/** @param {string|null} [id]  a child to change; none adds one */
export function childForm(id = null) {
  const c = id ? store.data.children[id] : null;
  openForm({
    title: c ? `Change ${c.name}` : 'Add a child', nameLabel: 'Name', name: c?.name ?? null,
    year: { value: c ? c.year_group : 5, any: false }, colour: { value: c?.colour ?? Model.COLOURS[store.children().length % Model.COLOURS.length] },
    save: (v) => store.save('child', id, { name: v.name, year_group: v.year, colour: v.colour }),
    remove: c ? () => store.remove('child', c.child_id) : undefined,
    removeAsk: c ? `Remove ${c.name}? Their levels stay in the sheet but are no longer shown.` : undefined,
    saved: c ? 'Saved.' : 'Child added.',
  });
}

/** @param {TrackId} track @param {string|null} [id] */
export function subjectForm(track, id = null) {
  const s = id ? store.data.subjects[id] : null;
  openForm({
    title: s ? 'Change subject' : `Add a ${Model.trackLabel(track)} subject`, nameLabel: 'Subject', name: s?.name ?? null,
    save: (v) => store.save('subject', id, { track, name: v.name }),
    remove: s ? () => store.remove('subject', s.subject_id) : undefined,
    removeAsk: s ? `Remove ${s.name} and everything under it from view? Nothing is deleted from the sheet.` : undefined,
    saved: s ? 'Saved.' : 'Subject added.',
  });
}

/** @param {string} subjectId @param {string|null} [id] */
export function sectionForm(subjectId, id = null) {
  const s = id ? store.data.sections[id] : null;
  openForm({
    title: s ? 'Change section' : 'Add a section', nameLabel: 'Section (e.g. Spellings)', name: s?.name ?? null,
    save: (v) => store.save('section', id, { subject_id: subjectId, name: v.name }),
    remove: s ? () => store.remove('section', s.section_id) : undefined,
    removeAsk: s ? `Remove ${s.name} and its topics from view? Nothing is deleted from the sheet.` : undefined,
    saved: s ? 'Saved.' : 'Section added.',
  });
}

/** @param {string} sectionId @param {string|null} [id] */
export function topicForm(sectionId, id = null) {
  const t = id ? store.data.topics[id] : null;
  openForm({
    title: t ? 'Change topic' : 'Add a topic', nameLabel: 'Topic (e.g. Percentages)', name: t?.name ?? null,
    year: { value: t ? t.year_group : null, any: true },
    save: (v) => store.save('topic', id, { section_id: sectionId, name: v.name, year_group: v.year }),
    remove: t ? () => store.remove('topic', t.topic_id) : undefined,
    removeAsk: t ? `Remove ${t.name}? Its levels stay in the sheet but are no longer shown.` : undefined,
    saved: t ? 'Saved.' : 'Topic added.',
  });
}
