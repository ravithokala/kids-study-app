// @ts-check

import { el } from '../dom.js';
import * as store from '../store/store.js';
import { openSheet, toast } from './sheet.js';
import { empty, kidClass, yearText } from './parts.js';
import { childForm } from './forms.js';

/**
 * The children: add, change, remove, and move everyone up a school year.
 * @param {HTMLElement} main
 */
export function childrenScreen(main) {
  const kids = store.children();
  main.replaceChildren(
    el('a', { class: 'back', href: '#/more' }, '‹ More'),
    el('h1', { class: 'screen-title' }, 'Children'),
    kids.length === 0 ? empty('No children yet.') : el('ul', { class: 'rows' }, kids.map((c) => el('li', {},
      el('button', { class: `row ${kidClass(c)}`, type: 'button', onclick: () => childForm(c.child_id) },
        el('div', { class: 'row-main' }, el('div', { class: 'row-title' }, el('i', { class: 'dot' }), c.name), el('div', { class: 'row-sub' }, yearText(c)))
        , el('span', { class: 'chevron' }, '›'))))),
    el('div', { class: 'add-row' }, el('button', { class: 'button', type: 'button', onclick: () => childForm() }, '+ Add a child')),
    kids.length ? el('section', { class: 'card' }, el('h2', {}, 'New school year'),
      el('p', { class: 'muted small' }, 'Moves every child up one year (not past Year 13). Levels already recorded are kept.'),
      el('div', { class: 'actions start' }, el('button', { class: 'button', type: 'button', onclick: moveUp }, 'Move everyone up a year'))) : '');
}

async function moveUp() {
  const kids = store.children().filter((c) => c.year_group < 13);
  if (kids.length === 0 || !window.confirm(`Move ${kids.map((c) => c.name).join(' and ')} up a year?`)) return;
  const failed = [];
  for (const c of kids) {
    const r = await store.save('child', c.child_id, { name: c.name, year_group: c.year_group + 1, colour: c.colour });
    if (!r.ok) failed.push(`${c.name}: ${r.errors.map((e) => e.message).join('; ')}`);
  }
  if (failed.length) openSheet('Not everyone moved up', el('div', { class: 'form' }, failed.map((f) => el('div', { class: 'msg error' }, f))));
  else toast('Everyone moved up a year.');
}
