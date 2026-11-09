// @ts-check

import { el } from '../dom.js';
import { Levels } from '../shared/levels.js';
import * as store from '../store/store.js';

/** A level as a coloured pill, always with its words. @param {number} level */
export const levelPill = (level) => el('span', { class: `pill l${level}` }, Levels.label(level));

/** A progress bar. @param {number} percent */
export const meter = (percent) => el('div', { class: 'meter', role: 'img', 'aria-label': `${percent} per cent` }, el('span', { style: { width: `${percent}%` } }));

/** @param {string} text */
export const empty = (text) => el('p', { class: 'empty muted' }, text);

/** The class that colours a child. @param {Child|null} child */
export const kidClass = (child) => (child && child.colour ? `kid-${child.colour}` : '');

/**
 * The switch between the children, shown when there is more than one. Choosing one redraws the screen.
 * @param {() => void} redraw
 */
export function childBar(redraw) {
  const kids = store.children();
  if (kids.length < 2) return '';
  const current = store.currentChild();
  return el('div', { class: 'kids', role: 'group', 'aria-label': 'Child' }, kids.map((c) =>
    el('button', { type: 'button', class: kidClass(c), 'aria-pressed': String(c.child_id === current?.child_id),
      onclick: () => { store.selectChild(c.child_id); redraw(); } },
    el('span', {}, el('i', { class: 'dot' }), c.name), el('span', {}, yearText(c)))));
}

/** 'Year 5'. @param {Child} child */
export const yearText = (child) => (child.year_group === 0 ? 'Reception' : `Year ${child.year_group}`);
