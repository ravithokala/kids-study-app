// @ts-check

import { el, today, uk } from '../dom.js';
import * as store from '../store/store.js';
import { Levels } from '../shared/levels.js';
import { Structure } from '../shared/structure.js';
import { openSheet, showIssues, toast } from './sheet.js';
import { field, input, busy } from './fields.js';
import { childBar, meter, levelPill, empty, kidClass, yearText } from './parts.js';
import { sectionForm } from './forms.js';
import { topicSheet } from './topic.js';

/** Where a topic goes when no group is given (as the server's). */
const NO_GROUP = 'Other';

/**
 * The Maths tab: the parents' own list of Maths topics, with the child on screen's level on each. Topics are added with just a
 * name (and a group if wanted); tap a topic to record progress.
 * @param {HTMLElement} main
 */
export function mathsScreen(main) {
  const child = store.currentChild();
  if (!child) {
    main.replaceChildren(el('h1', { class: 'screen-title' }, 'Maths'), empty('Add a child first (More → Children).'));
    return;
  }
  const subject = store.tree('maths')[0] ?? null;
  // Groups in order, with "Other" last whatever its order.
  const groups = (subject?.sections ?? []).filter((g) => g.topics.length > 0 || g.name !== NO_GROUP)
    .sort((a, b) => (a.name === NO_GROUP ? 1 : 0) - (b.name === NO_GROUP ? 1 : 0) || Structure.bySort(a, b));
  const ids = groups.flatMap((g) => g.topics.map((t) => t.topic_id));
  const rows = store.progressRows();
  const summary = Levels.summary(ids, rows, child.child_id, today());

  main.replaceChildren(
    el('h1', { class: `screen-title ${kidClass(child)}` }, el('i', { class: 'dot' }), `Maths · ${child.name}`, el('span', { class: 'muted small' }, ` ${yearText(child)}`)),
    childBar(() => mathsScreen(main)),
    ids.length ? el('section', { class: 'card' },
      el('div', { class: 'card-top' }, el('h2', {}, 'Progress'), el('span', { class: 'percent' }, `${summary.percent}%`)),
      meter(summary.percent),
      el('div', { class: 'levels-line' }, `${ids.length} topic${ids.length === 1 ? '' : 's'} · ${summary.counts[3] + summary.counts[4]} Confident or Mastered`
        + (summary.weak.length ? ` · ${summary.weak.length} still learning` : ''))) : '',
    ...(ids.length === 0 ? [empty(`No Maths topics yet for ${child.name}. Add the first one below.`)] : groups.map((g) => el('section', { class: 'card' },
      el('div', { class: 'title-row' }, el('h2', {}, g.name), el('span', { class: 'count' }, String(g.topics.length)),
        el('button', { class: 'link', type: 'button', onclick: () => sectionForm(subject?.subject_id ?? '', g.section_id) }, 'Edit')),
      el('ul', { class: 'rows' }, g.topics.map((t) => {
        const last = Levels.latest(rows, child.child_id, t.topic_id);
        const level = last ? last.level : 0;
        return el('li', {}, el('button', { class: `row l${level}`, type: 'button', onclick: () => topicSheet(t.topic_id) },
          el('div', { class: 'row-main' }, el('div', { class: 'row-title' }, t.name), last ? el('div', { class: 'row-sub' }, `last ${uk(last.on)}`) : ''),
          levelPill(level)));
      }))))),
    el('div', { class: 'add-row' }, el('button', { class: 'button primary', type: 'button', onclick: () => addTopicSheet(child, groups.map((g) => g.name).filter((n) => n !== NO_GROUP)) }, '+ Add a topic')));
}

/**
 * The sheet for adding a Maths topic: a name, and a group (typed, or picked from the groups already there). "Save and add
 * another" keeps the sheet open with the group kept.
 * @param {Child} child @param {string[]} groupNames
 */
function addTopicSheet(child, groupNames) {
  const name = input('text', null, { maxlength: 80, autocomplete: 'off', placeholder: 'e.g. Percentages' });
  const group = input('text', null, { maxlength: 80, autocomplete: 'off', placeholder: 'e.g. Addition (leave blank for Other)', list: 'maths-groups' });
  const list = el('datalist', { id: 'maths-groups' }, groupNames.map((n) => el('option', { value: n })));
  const save = /** @type {HTMLButtonElement} */ (el('button', { class: 'primary', type: 'button' }, 'Save'));
  const another = /** @type {HTMLButtonElement} */ (el('button', { type: 'button' }, 'Save and add another'));
  const sheet = openSheet(`Add a Maths topic for ${child.name}`, el('div', { class: 'form' },
    field('Topic', name.node), field('Group (optional)', group.node), list,
    el('p', { class: 'muted small' }, 'A group collects related topics, for example Addition or Fractions. Topics with no group are listed under Other.'),
    el('div', { class: 'actions' }, another, save)));
  /** @param {HTMLButtonElement} button @param {boolean} more */
  const go = (button, more) => async () => {
    const r = await busy(button, () => store.addMathsTopic(child.child_id, name.get(), group.get()));
    if (!r.ok) { showIssues(sheet.messages, { errors: r.errors, warnings: [] }); return; }
    if (more) {
      toast(`${r.rows.topics[0]?.name ?? 'Topic'} added.`);
      sheet.messages.replaceChildren();
      name.node.value = '';
      name.node.focus();
      return;
    }
    sheet.close();
    toast('Topic added.');
  };
  save.addEventListener('click', go(save, false));
  another.addEventListener('click', go(another, true));
  name.node.focus();
}
