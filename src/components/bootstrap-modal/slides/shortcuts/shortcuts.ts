import { html, svg, TemplateResult } from "lit";
import { map } from "lit/directives/map.js";
import { BootstrapSlide } from "../bootstrapSlide";
import { gridTileSprite } from "../../sprites/grid-tile.sprite";
import { cursorSprite } from "../../sprites/cursor.sprite";
import { KeyboardShortcut, keyboardTemplate } from "../../../../templates/keyboard";

export function shortcutsSlide(
  decisionShortcuts: ReadonlyArray<KeyboardShortcut>,
  hasClassificationTask: boolean,
): BootstrapSlide {
  const title = "You can use keyboard shortcuts";

  // in this short tutorial dialog, we demonstrate using the keyboard
  // shortcuts for the first two decision buttons
  // because we do not use
  const slideTemplate = html`
    <div class="shortcut-slide slide">
      <svg viewBox="0 0 270 60">${verificationGridTemplate(hasClassificationTask)} ${cursorSprite(135, 25)}</svg>
      <div class="shortcut-keys">${keyboardButtonsTemplate(decisionShortcuts)}</div>
    </div>
  `;

  return { slideTemplate, title };
}

function keyboardButtonsTemplate(shortcuts: ReadonlyArray<KeyboardShortcut>): TemplateResult {
  const positiveShortcut = shortcuts[0];
  const negativeShortcut = shortcuts[1];

  const displayedShortcuts = [
    { keys: ["Ctrl", "a"], description: "Select all" },
    { keys: ["Ctrl"], hasMouse: true, description: "Toggle selection" },
    positiveShortcut,
    { keys: ["Esc"], description: "Deselect all" },
    negativeShortcut,
  ] satisfies KeyboardShortcut[];

  return html`
    ${map(
      displayedShortcuts,
      (shortcut: KeyboardShortcut, index: number) => html`
        <section class="shortcut-card">
          <h3 class="shortcut-card-title">${shortcut.description}</h3>
          <div class="shortcut shortcut-${index}">${keyboardTemplate(shortcut)}</div>
        </section>
      `,
    )}
  `;
}

function verificationGridTemplate(hasClassificationTask: boolean): TemplateResult {
  return svg`
      ${gridTileSprite(10, 0, hasClassificationTask, true, "tile-0")}
      ${gridTileSprite(100, 0, hasClassificationTask, false, "tile-1")}
      ${gridTileSprite(190, 0, hasClassificationTask, true, "tile-2")}
    `;
}
