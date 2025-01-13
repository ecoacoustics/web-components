import { html, HTMLTemplateResult } from "lit";
import { when } from "lit/directives/when.js";
import { loop } from "../helpers/directives";

export type KeyboardShortcutKey = string | typeof shiftSymbol;

export interface KeyboardShortcut {
  keys: KeyboardShortcutKey[];
  description?: string;
  hasMouse?: boolean;
}

export enum ShiftSymbolVariant {
  "inline",
  "short",
  "long",
}

export const shiftSymbol = Symbol("shift");

/**
 * @description
 * A standardized template to display keyboard shortcuts and shortcut
 * combinations
 */
export function keyboardShortcutTemplate(
  shortcut: KeyboardShortcut,
  shiftSymbolVariant: ShiftSymbolVariant = ShiftSymbolVariant.long,
): HTMLTemplateResult {
  const shortShiftCharacter = "⇧";
  let skipNext = false;

  return html`
    ${loop(shortcut.keys, (key, { last, index }) => {
      if (skipNext) {
        return;
      }

      if (key === shiftSymbol) {
        switch (shiftSymbolVariant) {
          case ShiftSymbolVariant.inline: {
            skipNext = true;
            if (last) {
              return html`<kbd>${shortShiftCharacter}</kbd>`;
            }

            const nextKey = shortcut.keys[index + 1];
            return html`<kbd>${shortShiftCharacter}${nextKey}</kbd>`;
          }

          case ShiftSymbolVariant.short: {
            return html`<kbd>${shortShiftCharacter}</kbd> ${when(!last || shortcut.hasMouse, () => "+")}`;
          }

          case ShiftSymbolVariant.long: {
            return html`<kbd>Shift</kbd> ${when(!last || shortcut.hasMouse, () => "+")}`;
          }
        }
      }

      return html`<kbd>${key.toLocaleUpperCase()}</kbd> ${when(!last || shortcut.hasMouse, () => "+")}`;
    })}
    ${when(shortcut.hasMouse, () => html`<sl-icon name="mouse" class="inline-icon xl-icon"></sl-icon>`)}
  `;
}
