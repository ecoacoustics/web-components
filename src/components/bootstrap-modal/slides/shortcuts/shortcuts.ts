import { html, svg, TemplateResult } from "lit";
import { map } from "lit/directives/map.js";
import { KeyboardShortcut } from "bootstrap-modal/bootstrap-modal";
import { AbstractSlide } from "../abstractSlide";
import { gridTileSprite } from "../../sprites/grid-tile.sprite";
import { loop } from "../../../../helpers/directives";
import { when } from "lit/directives/when.js";
import { cursorSprite } from "../../sprites/cursor.sprite";

export class ShortcutsSlide extends AbstractSlide {
  public constructor(shortcuts: KeyboardShortcut[]) {
    super("You can use the following keyboard shortcuts");

    // in this short tutorial dialog, we demonstrate using the keyboard
    // shortcuts for the first two decision buttons
    // because we do not use
    this.shortcuts = shortcuts.slice(0, 2);
  }

  private shortcuts: KeyboardShortcut[];

  private verificationGrid() {
    return svg`
      ${gridTileSprite(10, 0, false, "tile-0")}
      ${gridTileSprite(100, 0, false, "tile-1")}
      ${gridTileSprite(190, 0, false, "tile-2")}
    `;
  }

  private keyboardButtonsTemplate(): TemplateResult {
    const displayedShortcuts = [
      ...this.shortcuts,
      { keys: ["Ctrl"], hasMouse: true, description: "Toggle selection" },
      { keys: ["Ctrl", "A"], description: "Select all" },
      { keys: ["Esc"], description: "De-select all" },
    ] satisfies KeyboardShortcut[];

    return html`
      ${map(
        displayedShortcuts,
        (shortcut: KeyboardShortcut, index: number) => html`
          <section class="shortcut-card">
            <h3 class="shortcut-card-title">${shortcut.description}</h3>
            <div class="shortcut shortcut-${index}">
              ${loop(
                shortcut.keys,
                (key, { last }) => html`<kbd>${key}</kbd> ${when(!last || shortcut.hasMouse, () => "+")}`,
              )}
              ${when(shortcut.hasMouse, () => html`<sl-icon name="mouse"></sl-icon>`)}
            </div>
          </section>
        `,
      )}
    `;
  }

  public render() {
    return html`
      <div class="shortcut-slide slide">
        <div class="shortcut-card">
          <svg viewBox="0 0 270 60">${this.verificationGrid()} ${cursorSprite(135, 25)}</svg>
          <div class="shortcut-keys">${this.keyboardButtonsTemplate()}</div>
        </div>
      </div>
    `;
  }
}
