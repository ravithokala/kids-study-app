// @ts-check

import { el, uk } from '../dom.js';
import { VERSION } from '../version.js';
import { status } from '../store/store.js';
import { call } from '../api.js';
import { toast } from './sheet.js';
import { busy } from './fields.js';
import { applyTheme, savedTheme } from '../theme.js';
import { systemSection } from './system.js';
import { loadTimeText } from '../freshness.js';
import { installSection } from './install.js';

/**
 * More: children, data status, backup, appearance, system check, account.
 * @param {HTMLElement} main
 * @param {{ signOut: () => Promise<void>, signOutEverywhere: () => Promise<string|null> }} actions  signOutEverywhere answers why it failed
 */
export function more(main, actions) {
  const synced = status.lastSynced ? new Date(status.lastSynced) : null;
  const themeChoice = (/** @type {string} */ value, /** @type {string} */ label) => el('button', { type: 'button', 'aria-pressed': String(savedTheme() === value),
    onclick: () => { applyTheme(value); more(main, actions); } }, label);

  main.replaceChildren(
    el('h1', { class: 'screen-title' }, 'More'),
    el('section', { class: 'card' },
      el('h2', {}, 'Children'),
      el('a', { class: 'menu-link', href: '#/children' }, 'Add, change or move up a year', el('span', { class: 'chevron' }, '›'))),
    el('section', { class: 'card' },
      el('h2', {}, 'Data'),
      el('p', {}, status.online ? 'Changes are saved straight to the sheet; this phone keeps a copy for quick opening.' : 'Offline: you can view everything; saving needs a connection.'),
      el('p', { class: 'muted small' }, synced ? `Updated from the sheet ${uk(synced.toISOString().slice(0, 10))} at ${synced.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.` : 'Not updated yet.',
        status.error ? ` Last problem: ${status.error}` : ''),
      status.sheetUrl ? el('p', {}, el('a', { href: status.sheetUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Open the sheet in Google Drive')) : ''),
    el('section', { class: 'card' },
      el('h2', {}, 'Backup'),
      el('p', { class: 'muted small' }, 'The sheet in Google Drive is the main copy. A backup file is an extra copy you keep yourself. It holds the children’s names: keep it private.'),
      el('div', { class: 'actions start' }, el('button', { class: 'button', type: 'button', onclick: exportBackup }, 'Download backup'))),
    el('section', { class: 'card' },
      el('h2', {}, 'Appearance'),
      el('div', { class: 'segmented', role: 'group', 'aria-label': 'Theme' }, themeChoice('auto', 'Auto'), themeChoice('light', 'Light'), themeChoice('dark', 'Dark'))),
    systemSection(),
    el('section', { class: 'card' },
      el('h2', {}, 'Account'),
      el('p', {}, status.user ? `Signed in as ${status.user}.` : 'Signed in.', status.users.length > 1 ? ` App users: ${status.users.join(', ')}.` : ''),
      el('div', { class: 'actions start' },
        el('button', { class: 'button', type: 'button', onclick: actions.signOut }, 'Sign out of this phone'),
        // A lost phone: ends this account's sign-in on every device, this one included.
        el('button', { class: 'button danger', type: 'button', onclick: async () => {
          if (!window.confirm('Sign out on every device where you are signed in, including this one?')) return;
          const problem = await actions.signOutEverywhere();
          if (problem) toast(`Could not sign out all devices: ${problem}`);
        } }, 'Sign out all devices'))),
    installSection(),
    el('p', { class: 'version' }, `Version ${VERSION}`, status.timing ? el('span', { class: 'load-time' }, loadTimeText(status.timing)) : ''));
}

/** Downloads every row as a JSON file, read from the sheet (needs a connection). */
async function exportBackup(/** @type {Event} */ ev) {
  try {
    const r = await busy(/** @type {HTMLButtonElement} */ (ev.currentTarget), () => call('export.all', {}));
    if (!r.ok) { toast(r.errors.map((e) => e.message).join('; ')); return; }
    const file = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
    const link = /** @type {HTMLAnchorElement} */ (el('a', { href: URL.createObjectURL(file), download: `kids-study-backup-${new Date().toISOString().slice(0, 10)}.json` }));
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
    toast('Backup downloaded.');
  } catch (e) {
    toast(navigator.onLine ? `Could not make a backup: ${e instanceof Error ? e.message : String(e)}` : 'A backup needs a connection.');
  }
}
