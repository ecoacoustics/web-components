import { html, HTMLTemplateResult } from "lit";
import { when } from "lit/directives/when.js";
import { loop } from "../helpers/directives";

export interface KeyboardShortcut {
  keys: string[];
  description?: string;
  hasMouse?: boolean;
}

export const shiftSymbol = "⇧" as const;

/**
 * @description
 * A standardized template to display keyboard shortcuts and shortcut
 * combinations
 */
export function keyboardShortcutTemplate(shortcut: KeyboardShortcut): HTMLTemplateResult {
  return html`
    ${loop(
      shortcut.keys,
      (key, { last }) => html`<kbd>${key.toLocaleUpperCase()}</kbd> ${when(!last || shortcut.hasMouse, () => "+")}`,
    )}
    ${when(shortcut.hasMouse, () => html`<sl-icon name="mouse" class="inline-icon xl-icon"></sl-icon>`)}
  `;
}
