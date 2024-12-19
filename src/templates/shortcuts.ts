import { html, HTMLTemplateResult } from "lit";
import { when } from "lit/directives/when.js";
import { loop } from "../helpers/directives";

export interface KeyboardShortcut {
  keys: string[];
  description: string;
  hasMouse?: boolean;
}

export function shortcutTemplate(shortcut: KeyboardShortcut): HTMLTemplateResult {
  const hasUpperCase = shortcut.keys.some((key) => key === key.toUpperCase());

  return html`
    ${when(hasUpperCase, () => html`<kbd class="shortcut-legend">Shift</kbd> +`)}
    ${loop(shortcut.keys, (key, { last }) => html`<kbd>${key}</kbd> ${when(!last || shortcut.hasMouse, () => "+")}`)}
    ${when(shortcut.hasMouse, () => html`<sl-icon name="mouse"></sl-icon>`)}
  `;
}
