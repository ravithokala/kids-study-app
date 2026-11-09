// @ts-check

import { el, today, uk } from '../dom.js';
import * as store from '../store/store.js';
import { Levels } from '../shared/levels.js';
import { openSheet, showIssues, toast } from './sheet.js';
import { field, input, busy } from './fields.js';
import { levelPill, yearText } from './parts.js';
import { topicForm } from './forms.js';

/**
 * One topic for the child on screen: set a new level (with an optional score, day and note), and see the history.
 * A mistaken entry is removed, not edited, so the history stays honest.
 * @param {string} topicId
 */
export function topicSheet(topicId) {
  const topic = store.data.topics[topicId];
  const child = store.currentChild();
  if (!topic || !child) return;
  const rows = Levels.history(store.progressRows(), child.child_id, topicId);
  let level = rows.length ? rows[0].level : 0;

  const choices = el('div', { class: 'level-choices', role: 'group', 'aria-label': 'Level' });
  const drawChoices = () => choices.replaceChildren(...Levels.ALL.map((l) => el('button', { type: 'button', 'aria-pressed': String(l.value === level),
    onclick: () => { level = l.value; drawChoices(); } }, l.label)));
  drawChoices();
  const score = input('number', null, { min: 0, max: 100, inputmode: 'numeric', placeholder: 'Optional, 0 to 100' });
  const on = input('date', today(), { max: today() });
  const note = input('text', null, { maxlength: 300, placeholder: 'Optional: what went well or badly' });
  const save = /** @type {HTMLButtonElement} */ (el('button', { class: 'primary', type: 'button' }, 'Save level'));

  const history = rows.length === 0 ? el('p', { class: 'muted small' }, `Nothing recorded yet for ${child.name}.`)
    : el('ul', { class: 'history' }, rows.map((r) => el('li', {},
      el('div', { class: 'history-top' }, el('span', {}, uk(r.on)), levelPill(r.level),
        el('button', { class: 'link', type: 'button', onclick: async () => {
          if (!window.confirm('Remove this entry? It stays in the sheet but no longer counts.')) return;
          const done = await store.removeProgress(r.progress_id);
          if (done.ok) { sheet.close(); toast('Entry removed.'); } else showIssues(sheet.messages, { errors: done.errors, warnings: [] });
        } }, 'Remove')),
      r.score !== null || r.note ? el('div', { class: 'note' }, [r.score !== null ? `Score ${r.score}` : '', r.note].filter(Boolean).join(' · ')) : '')));

  const sheet = openSheet(topic.name, el('div', { class: 'form' },
    el('p', { class: 'muted small' }, `${store.pathOf(topicId)}${topic.year_group !== null ? ` · taught in ${yearText({ ...child, year_group: topic.year_group })}` : ''} · for ${child.name}`),
    field('Level now', choices),
    el('div', { class: 'row2' }, field('Day', on.node), field('Score', score.node)),
    field('Note', note.node),
    el('div', { class: 'actions' }, save),
    el('h3', { class: 'check-group' }, `${child.name}'s history`),
    history,
    el('button', { class: 'link', type: 'button', onclick: () => { sheet.close(); topicForm(topic.section_id, topic.topic_id); } }, 'Rename or remove this topic')));

  save.addEventListener('click', async () => {
    const r = await busy(save, () => store.addProgress({ child_id: child.child_id, topic_id: topicId, level, score: score.get(), on: on.get() ?? undefined, note: note.get() }, today()));
    if (r.ok) { sheet.close(); toast(`${topic.name}: ${Levels.label(level)}.`); } else showIssues(sheet.messages, { errors: r.errors, warnings: [] });
  });
}
