// @ts-check

import { el } from '../dom.js';

/**
 * Form fields for the app's sheets. Each returns the element and a way to read its value.
 */

/** @param {string} label @param {HTMLElement} control @param {string} [cls] */
export const field = (label, control, cls = '') => el('label', { class: `field ${cls}` }, el('span', {}, label), control);

/** @param {string} type @param {string|null} value @param {Record<string, unknown>} [attrs] */
export function input(type, value, attrs = {}) {
  const node = /** @type {HTMLInputElement} */ (el('input', { type, value: value ?? '', ...attrs }));
  return { node, get: () => node.value.trim() || null };
}

/**
 * Runs a save with its button disabled, so a second tap cannot send it twice.
 * @template T
 * @param {HTMLButtonElement} button
 * @param {() => Promise<T>} work
 * @returns {Promise<T>}
 */
export async function busy(button, work) {
  button.disabled = true;
  try {
    return await work();
  } finally {
    button.disabled = false;
  }
}
