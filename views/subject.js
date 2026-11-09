// @ts-check

import { el, uk } from '../dom.js';
import * as store from '../store/store.js';
import { Levels } from '../shared/levels.js';
import { Structure } from '../shared/structure.js';
import { Model } from '../shared/model.js';
import { childBar, levelPill, empty, kidClass } from './parts.js';
import { sectionForm, subjectForm, topicForm } from './forms.js';
import { topicSheet } from './topic.js';

/** Whether topics from later school years are shown too (kept while the app is open). */
let showAll = false;

/**
 * One subject: its sections and their topics, each with the child's level. Tap a topic to record progress; sections and
 * topics are added, renamed and removed here.
 * @param {HTMLElement} main
 * @param {string} subjectId
 */
export function subjectScreen(main, subjectId) {
  const subject = store.data.subjects[subjectId];
  const child = store.currentChild();
  if (!subject || subject.deleted) {
    main.replaceChildren(el('a', { class: 'back', href: '#/home' }, '‹ Home'), empty('This subject is not here any more.'));
    return;
  }
  const node = store.tree(subject.track).find((s) => s.subject_id === subjectId);
  const rows = store.progressRows();
  let hidden = 0;
  const sections = (node?.sections ?? []).map((section) => {
    const topics = section.topics.filter((t) => showAll || !child || Structure.forYear(t, child.year_group));
    hidden += section.topics.length - topics.length;
    return el('section', { class: 'card' },
      el('div', { class: 'title-row' }, el('h2', {}, section.name),
        el('button', { class: 'link', type: 'button', onclick: () => sectionForm(subjectId, section.section_id) }, 'Edit')),
      topics.length === 0 ? el('p', { class: 'muted small' }, 'No topics to show.') : el('ul', { class: 'rows' }, topics.map((t) => {
        const last = child ? Levels.latest(rows, child.child_id, t.topic_id) : null;
        const level = last ? last.level : 0;
        return el('li', {}, el('button', { class: `row l${level}`, type: 'button', disabled: !child, onclick: () => topicSheet(t.topic_id) },
          el('div', { class: 'row-main' }, el('div', { class: 'row-title' }, t.name),
            el('div', { class: 'row-sub' }, [t.year_group !== null ? Model.yearLabel(t.year_group) : '', last ? `last ${uk(last.on)}` : ''].filter(Boolean).join(' · '))),
          levelPill(level)));
      })),
      el('div', { class: 'add-row' }, el('button', { class: 'link', type: 'button', onclick: () => topicForm(section.section_id) }, '+ Add a topic')));
  });
  main.replaceChildren(
    el('a', { class: 'back', href: `#/${subject.track}` }, `‹ ${Model.trackLabel(subject.track)}`),
    el('div', { class: 'title-row' }, el('h1', { class: `screen-title ${kidClass(child)}` }, subject.name),
      el('button', { class: 'link', type: 'button', onclick: () => subjectForm(subject.track, subjectId) }, 'Edit')),
    childBar(() => subjectScreen(main, subjectId)),
    ...(sections.length === 0 ? [empty('No sections yet. Add one below.')] : sections),
    hidden || showAll ? el('p', { class: 'muted small' }, showAll ? 'Showing topics from every school year. ' : `${hidden} topic${hidden === 1 ? '' : 's'} from later school years hidden. `,
      el('button', { class: 'link', type: 'button', onclick: () => { showAll = !showAll; subjectScreen(main, subjectId); } }, showAll ? 'Show only this child’s years' : 'Show all')) : '',
    el('div', { class: 'add-row' }, el('button', { class: 'button', type: 'button', onclick: () => sectionForm(subjectId) }, '+ Add a section (e.g. Spellings)')));
}
