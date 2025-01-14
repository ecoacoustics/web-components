import { html, nothing, svg, TemplateResult } from "lit";
import { map } from "lit/directives/map.js";
import { BootstrapSlide } from "../bootstrapSlide";
import { gridTileSprite } from "../../sprites/grid-tile.sprite";
import { cursorSprite } from "../../sprites/cursor.sprite";
import { KeyboardShortcut, keyboardShortcutTemplate, mouseClick } from "../../../../templates/keyboardShortcut";

export function shortcutsSlide(
  decisionShortcuts: ReadonlyArray<KeyboardShortcut>,
  hasClassificationTask: boolean,
): BootstrapSlide {
  const title = "You can use keyboard shortcuts";

  // in this short tutorial dialog, we demonstrate using the keyboard
  // shortcuts for the first two decision buttons
  const slideTemplate = html`
    <div class="shortcut-slide slide">
      <svg viewBox="0 0 270 60">${verificationGridTemplate(hasClassificationTask)} ${cursorSprite(135, 25)}</svg>
      <div class="shortcut-keys">${keyboardButtonsTemplate(decisionShortcuts)}</div>
    </div>
  `;

  return { slideTemplate, title };
}

function keyboardButtonsTemplate(shortcuts: ReadonlyArray<KeyboardShortcut>): TemplateResult | typeof nothing {
  if (shortcuts.length < 2) {
    const errorMessage =
      "Failed to create shortcut bootstrap slide: Insufficient decision shortcuts (requires 2 decision shortcuts)";
    console.warn(errorMessage);
    return nothing;
  }

  const positiveShortcut = shortcuts[0];
  const negativeShortcut = shortcuts[1];

  // The position in the array also determines the layout order of the shortcut
  // keys in the slide.
  // I have ordered this array in the order that they are used in the animation
  //
  // 1. Select all of the tiles with Ctrl + A
  // 2. Deselect the second tile using Ctrl + Click
  // 3. Make a positive decision about the first and third tiles
  // 4. Deselect all tiles
  // 5. Select the second undecided tile using Ctrl + Click
  // 6. Make a negative decision
  // 7. Deselect all tiles (to reset the animation)
  const displayedShortcuts = [
    { keys: ["Ctrl", "a"], description: "Select all" },
    { keys: ["Ctrl", mouseClick], description: "Toggle selection" },
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
          <div class="shortcut shortcut-${index}">${keyboardShortcutTemplate(shortcut)}</div>
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
