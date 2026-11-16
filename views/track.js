// @ts-check

import { el, today } from '../dom.js';
import * as store from '../store/store.js';
import { Levels } from '../shared/levels.js';
import { Structure } from '../shared/structure.js';
import { Model } from '../shared/model.js';
import { childBar, meter, empty, kidClass, yearText } from './parts.js';
import { toast } from './sheet.js';
import { busy } from './fields.js';
import { subjectForm } from './forms.js';
import { mocksCard } from './mocks.js';

/**
 * School or 11+: each subject with how far along the child on screen is.
 * @param {HTMLElement} main
 * @param {TrackId} track
 */
export function trackScreen(main, track) {
  const child = store.currentChild();
  const label = Model.trackLabel(track);
  if (!child) {
    main.replaceChildren(el('h1', { class: 'screen-title' }, label), empty('Add a child first (More → Children).'));
    return;
  }
  const rows = store.progressRows();
  const nodes = store.tree(track);
  main.replaceChildren(
    el('h1', { class: `screen-title ${kidClass(child)}` }, el('i', { class: 'dot' }), `${label} · ${child.name}`, el('span', { class: 'muted small' }, ` ${yearText(child)}`)),
    childBar(() => trackScreen(main, track)),
    track === 'eleven-plus' ? mocksCard(child, () => trackScreen(main, track)) : '',
    nodes.length === 0 ? el('div', { class: 'card welcome' },
      el('h2', {}, `No ${label} subjects yet for ${child.name}`),
      el('p', {}, `Each child has their own subjects and topics. Start ${child.name}'s with the standard ones, or add your own below.`),
      el('div', { class: 'actions start' }, el('button', { class: 'button primary', type: 'button', onclick: async (/** @type {Event} */ ev) => {
        const r = await busy(/** @type {HTMLButtonElement} */ (ev.currentTarget), () => store.seedStandard(child.child_id, [track]));
        toast(r.ok ? `Added ${r.data.added.subjects} subjects and ${r.data.added.topics} topics for ${child.name}.` : r.errors.map((e) => e.message).join('; '));
      } }, `Add the standard ${label} subjects`))) : '',
    ...nodes.map((subject) => {
      const ids = Structure.topicIds([subject], child.year_group);
      const s = Levels.summary(ids, rows, child.child_id, today());
      return el('a', { class: 'card card-link', href: `#/subject/${subject.subject_id}` },
        el('div', { class: 'card-top' }, el('h2', {}, subject.name), el('span', { class: 'percent' }, `${s.percent}%`)),
        meter(s.percent),
        el('div', { class: 'levels-line' }, `${subject.sections.length} sections · ${ids.length} topics · ${s.counts[3] + s.counts[4]} Confident or Mastered`
          + (s.weak.length ? ` · ${s.weak.length} still learning` : '')));
    }),
    el('div', { class: 'add-row' }, el('button', { class: 'button', type: 'button', onclick: () => subjectForm(track) }, '+ Add a subject')));
}
