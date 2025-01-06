import { html, svg, TemplateResult } from "lit";
import { map } from "lit/directives/map.js";
import { AbstractSlide } from "../abstractSlide";
import { gridTileSprite } from "../../sprites/grid-tile.sprite";
import { cursorSprite } from "../../sprites/cursor.sprite";
import { KeyboardShortcut, keyboardTemplate } from "../../../../templates/keyboard";

export class ShortcutsSlide extends AbstractSlide {
  public constructor(shortcuts: KeyboardShortcut[]) {
    super("You can use the following keyboard shortcuts");

    // in this short tutorial dialog, we demonstrate using the keyboard
    // shortcuts for the first two decision buttons
    // because we do not use
    this.shortcuts = shortcuts.slice(0, 2);
  }

  private shortcuts: KeyboardShortcut[];

  public play(): void {}

  public stop(): void {}

  private verificationGrid() {
    return svg`
      ${gridTileSprite(10, 0, false, "tile-0")}
      ${gridTileSprite(100, 0, false, "tile-1")}
      ${gridTileSprite(190, 0, false, "tile-2")}
    `;
  }

  private keyboardButtonsTemplate(): TemplateResult {
    const positiveShortcut = this.shortcuts[0];
    const negativeShortcut = this.shortcuts[1];

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

  public render() {
    return html`
      <div class="shortcut-slide slide">
        <svg viewBox="0 0 270 60">${this.verificationGrid()} ${cursorSprite(135, 25)}</svg>
        <div class="shortcut-keys">${this.keyboardButtonsTemplate()}</div>
      </div>
    `;
  }
}
