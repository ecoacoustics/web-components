import { html, HTMLTemplateResult } from "lit";
import { when } from "lit/directives/when.js";
import { loop } from "../helpers/directives";

export interface KeyboardShortcut {
  keys: string[];
  description?: string;
  hasMouse?: boolean;
}

export function keyboardTemplate(shortcut: KeyboardShortcut): HTMLTemplateResult {
  const isAscii = shortcut.keys.every((key) => key.charCodeAt(0) < 128);
  const hasUpperCase = shortcut.keys.some((key: string) => key === key.toUpperCase());
  const shouldShowShift = hasUpperCase && isAscii;

  return html`
    ${when(shouldShowShift, () => html`<kbd class="shortcut-legend">Shift</kbd> +`)}
    ${loop(shortcut.keys, (key, { last }) => html`<kbd>${key}</kbd> ${when(!last || shortcut.hasMouse, () => "+")}`)}
    ${when(shortcut.hasMouse, () => html`<sl-icon name="mouse"></sl-icon>`)}
  `;
}
