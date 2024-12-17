import { html, svg } from "lit";
import { map } from "lit/directives/map.js";
import { KeyboardShortcut } from "bootstrap-modal/bootstrap-modal";
import { AbstractSlide } from "../abstractSlide";
import { gridTileSprite } from "../../sprites/grid-tile.sprite";
import { loop } from "../../../../helpers/directives";
import { when } from "lit/directives/when.js";

export class ShortcutsSlide extends AbstractSlide {
  public constructor(shortcuts: KeyboardShortcut[]) {
    super("You can use the following keyboard shortcuts");

    this.shortcuts = shortcuts;
  }

  private shortcuts: KeyboardShortcut[];

  // TOOD: Refactor this
  private gridAnimation() {
    return svg`
      ${gridTileSprite(10, 0)}
      ${gridTileSprite(100, 0)}
      ${gridTileSprite(190, 0)}
    `;
  }

  public render() {
    const displayedShortcuts = [
      ...this.shortcuts,
      { keys: ["Ctrl", "A"], description: "Select All" },
      { keys: ["Esc"], description: "De-select All" },
    ] satisfies KeyboardShortcut[];

    return html`
      <div class="shortcut-slide slide">
        <div class="shortcut-card">
          <svg viewBox="0 0 270 60">${this.gridAnimation()}</svg>
          <div class="shortcut-keys">
            ${map(
              displayedShortcuts,
              (shortcut) => html`
                <section class="shortcut-card">
                  <h3 class="shortcut-card-title">${shortcut.description}</h3>
                  <div class="shortcut">
                    ${loop(shortcut.keys, (key, { last }) => html` <kbd>${key}</kbd> ${when(!last, () => "+")} `)}
                  </div>
                </section>
              `,
            )}
          </div>
        </div>
      </div>
    `;
  }
}
