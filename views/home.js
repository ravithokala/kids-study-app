// @ts-check

import { el, today } from '../dom.js';
import * as store from '../store/store.js';
import { Levels } from '../shared/levels.js';
import { Structure } from '../shared/structure.js';
import { Model } from '../shared/model.js';
import { toast } from './sheet.js';
import { busy } from './fields.js';
import { childBar, meter, levelPill, empty, kidClass, yearText } from './parts.js';
import { topicSheet } from './topic.js';

/** How many topics each "needs attention" list shows. */
const SHOWN = 8;

/**
 * Home: the child on screen, how far along each track is, and what needs attention (topics still being learned or
 * practised, and started topics not touched for two weeks).
 * @param {HTMLElement} main
 */
export function home(main) {
  const child = store.currentChild();
  if (!child) {
    main.replaceChildren(el('h1', { class: 'screen-title' }, 'Kids Study'),
      el('div', { class: 'card welcome' }, el('h2', {}, 'Add a child to start'),
        el('p', {}, 'Each child has their own levels, by school year.'),
        el('div', { class: 'actions start' }, el('a', { class: 'button primary', href: '#/children' }, 'Add a child'))));
    return;
  }
  const rows = store.progressRows();
  const now = today();
  /** @type {string[]} */
  const allIds = [];
  const cards = Model.TRACKS.map((track) => {
    const ids = Structure.topicIds(store.tree(track.id), child.year_group);
    allIds.push(...ids);
    const s = Levels.summary(ids, rows, child.child_id, now);
    const done = s.counts[3] + s.counts[4];
    return el('a', { class: 'card card-link', href: `#/${track.id}` },
      el('div', { class: 'card-top' }, el('h2', {}, track.label), el('span', { class: 'percent' }, `${s.percent}%`)),
      meter(s.percent),
      el('div', { class: 'levels-line' }, ids.length ? `${done} of ${ids.length} topics Confident or Mastered · ${s.counts[0]} not started` : 'No topics yet'));
  });
  const summary = Levels.summary(allIds, rows, child.child_id, now);

  /** @param {string} title @param {string} hint @param {string[]} ids */
  const list = (title, hint, ids) => ids.length === 0 ? '' : el('section', { class: 'group' },
    el('h2', {}, title, el('span', { class: 'count' }, ` ${ids.length}`)),
    el('p', { class: 'hint' }, hint),
    el('ul', { class: 'rows' }, ids.slice(0, SHOWN).map((id) => {
      const level = store.levelOf(child.child_id, id);
      const last = Levels.latest(rows, child.child_id, id);
      return el('li', {}, el('button', { class: `row l${level}`, type: 'button', onclick: () => topicSheet(id) },
        el('div', { class: 'row-main' }, el('div', { class: 'row-title' }, store.data.topics[id]?.name ?? ''), el('div', { class: 'row-sub' }, store.pathOf(id)),
          last ? el('div', { class: 'row-when' }, `Last recorded ${Math.max(0, daysSince(last.on, now))} days ago`) : ''),
        levelPill(level)));
    }), ids.length > SHOWN ? el('li', { class: 'muted small' }, `and ${ids.length - SHOWN} more`) : ''));

  const noStructure = store.subjects().length === 0;
  main.replaceChildren(
    el('h1', { class: `screen-title ${kidClass(child)}` }, el('i', { class: 'dot' }), `${child.name} · ${yearText(child)}`),
    childBar(() => home(main)),
    ...(noStructure ? [el('div', { class: 'card welcome' }, el('h2', {}, 'No subjects yet'),
      el('p', {}, 'Add the standard School and 11+ subjects, sections and topics to start from. You can change, add and remove any of them afterwards.'),
      el('div', { class: 'actions start' }, el('button', { class: 'button primary', type: 'button', onclick: async (/** @type {Event} */ ev) => {
        const r = await busy(/** @type {HTMLButtonElement} */ (ev.currentTarget), () => store.seedStandard());
        toast(r.ok ? `Added ${r.data.added.subjects} subjects and ${r.data.added.topics} topics.` : r.errors.map((e) => e.message).join('; '));
      } }, 'Add the standard subjects')))] : cards),
    list('Still learning', 'Topics at Learning or Practising. Tap one to record progress.', summary.weak),
    list('Not practised lately', `Started, not yet mastered, and nothing recorded for ${Levels.STALE_DAYS} days or more.`, summary.stale),
    !noStructure && summary.weak.length === 0 && summary.stale.length === 0 ? empty('Nothing needs attention. Open School or 11+ to record progress.') : '');
}

/** @param {string} from @param {string} to */
const daysSince = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
