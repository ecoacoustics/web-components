import { importSprites } from "../../../../helpers/svgs/imports";
import { AbstractSlide } from "../abstractSlide";
import { html, svg } from "lit";
import { map } from "lit/directives/map.js";
import { KeyboardShortcut } from "bootstrap-modal/bootstrap-modal";
import gridTile from "../../sprites/grid-tile.svg?raw";

export class ShortcutsSlide extends AbstractSlide {
  public constructor(shortcuts: KeyboardShortcut[]) {
    super("You can use the following shortcuts to complete your tasks");
    this.shortcuts = shortcuts;
  }

  public override isSvg = false;
  private shortcuts: KeyboardShortcut[];

  private decisionShortcutTemplate() {
    return html`
        ${map(
          this.shortcuts,
          (shortcut) => html`
            <div>
              ${map(shortcut.keys, (key) => html`<kbd>${key}</kbd>`)}
              <span>${shortcut.description}</span>
            </div>
          `,
        )}
      </div>
    `;
  }

  private gridAnimation() {
    return svg`
      ${importSprites(gridTile)}

      <use class="shortcut-grid-tile" href="#grid-tile" x="10" y="10" />
      <use class="shortcut-grid-tile" href="#grid-tile" x="100" y="10" />
      <use class="shortcut-grid-tile" href="#grid-tile" x="190" y="10" />

      <use class="shortcut-grid-tile" href="#grid-tile" x="10" y="80" />
      <use class="shortcut-grid-tile" href="#grid-tile" x="100" y="80" />
      <use class="shortcut-grid-tile" href="#grid-tile" x="190" y="80" />
    `;
  }

  private selectionShortcutsTemplate() {
    // prettier-ignore
    return html`
      <svg viewBox="0 0 270 140">${this.gridAnimation()}</svg>
      <div class="selection-shortcut-keys">
        ${this.shortcutTemplate(["Ctrl", "A"], "Select all")}
        ${this.shortcutTemplate(["Esc"], "De-select all")}
      </div>
    `;
  }

  private shortcutTemplate(shortcut: string[], shortcutTitle: string) {
    return html`
      <div>
        <h3 class="shortcut-template-title">${shortcutTitle}</h3>
        <div class="shortcut">
          <div class="shortcut-keys">${shortcut.map((key) => html`<kbd>${key}</kbd>`)}</div>
        </div>
      </div>
    `;
  }

  public render() {
    return html`
      <div class="shortcut-slide html-slide">
        <div class="decision-shortcuts shortcut-card">
          <h3>Decision Shortcuts</h3>
          ${this.decisionShortcutTemplate()}
        </div>

        <div class="selection-shortcuts shortcut-card">
          <h3>Selection Shortcuts</h3>
          ${this.selectionShortcutsTemplate()}
        </div>
      </div>
    `;
  }
}
