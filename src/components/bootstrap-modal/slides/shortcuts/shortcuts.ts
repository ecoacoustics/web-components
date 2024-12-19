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
    this.shortcuts = shortcuts;
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
      { keys: ["Ctrl", "Click"], description: "" },
      { keys: ["Ctrl", "A"], description: "Select All" },
      { keys: ["Esc"], description: "De-select All" },
    ] satisfies KeyboardShortcut[];

    return html`
      ${map(
        displayedShortcuts,
        (shortcut: KeyboardShortcut, index: number) => html`
          <section class="shortcut-card">
            <h3 class="shortcut-card-title">${shortcut.description}</h3>
            <div class="shortcut shortcut-${index}">
              ${loop(shortcut.keys, (key, { last }) => html`<kbd>${key}</kbd> ${when(!last, () => "+")}`)}
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
