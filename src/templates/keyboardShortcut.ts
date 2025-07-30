import { html, HTMLTemplateResult } from "lit";
import { when } from "lit/directives/when.js";
import { loop } from "../helpers/directives";
import { classMap } from "lit/directives/class-map.js";

export type KeyboardShortcutKey = string | typeof shiftSymbol | typeof mouseClick;

export interface KeyboardShortcut {
  keys: KeyboardShortcutKey[];
  description?: string;
}

export enum ShiftSymbolVariant {
  "inline",
  "short",
  "long",
}

export const shiftSymbol = Symbol("shift");
export const mouseClick = Symbol("mouseClick");

/**
 * @description
 * A standardized template to display keyboard shortcuts and shortcut
 * combinations
 */
export function keyboardShortcutTemplate(
  shortcut: KeyboardShortcut,
  shiftSymbolVariant: ShiftSymbolVariant = ShiftSymbolVariant.long,
  compact = false,
): HTMLTemplateResult {
  const shortShiftCharacter = "⇧";

  const normalized = new Array<string | typeof mouseClick>();
  for (let i = 0; i < shortcut.keys.length; i++) {
    const key = shortcut.keys[i];
    if (key === shiftSymbol) {
      if (shiftSymbolVariant === ShiftSymbolVariant.inline) {
        const nextKey = i < shortcut.keys.length ? shortcut.keys[i + 1].toString() : "";
        normalized.push(shortShiftCharacter + nextKey);
        i++;
      } else if (shiftSymbolVariant === ShiftSymbolVariant.short) {
        normalized.push(shortShiftCharacter);
      } else if (shiftSymbolVariant === ShiftSymbolVariant.long) {
        normalized.push("Shift");
      }
    } else {
      normalized.push(key);
    }
  }

  const classes = classMap({ compact });

  return html`
    ${loop(
      normalized,
      (key, { last }) => html`
        ${key === mouseClick
          ? html`<sl-icon name="mouse" class="inline-icon xl-icon"></sl-icon>`
          : html`<kbd class="${classes}">${key.toLocaleUpperCase()}</kbd>`}
        ${when(!last, () => "+")}
      `,
    )}
  `;
}
