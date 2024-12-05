import { importSprites } from "../../../../helpers/svgs/imports";
import { AbstractSlide } from "../abstractSlide";
import { html, svg, SVGTemplateResult } from "lit";
import { map } from "lit/directives/map.js";
import { KeyboardShortcut, VerificationBootstrapComponent } from "bootstrap-modal/bootstrap-modal";
import gridTile from "../sprites/grid-tile.svg?raw";

export class ShortcutsSlide extends AbstractSlide {
  public constructor(shortcuts: KeyboardShortcut[], dialog: VerificationBootstrapComponent) {
    super("You can use the following shortcuts to complete your tasks");

    this.shortcuts = shortcuts;
    this.dialog = dialog;
  }

  public override isSvg = false;
  private shortcuts: KeyboardShortcut[];
  private dialog: VerificationBootstrapComponent;

  private decisionShortcutTemplate() {
    return html`
      <div class="shortcut-card">
        <h3>Decision shortcuts</h3>

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

  private selectAllAnimation() {
    return svg`
      ${importSprites(gridTile)}

      <use class="selection-tile" href="#grid-tile" x="10" y="10" />
      <use class="selection-tile" href="#grid-tile" x="100" y="10" />
      <use class="selection-tile" href="#grid-tile" x="190" y="10" />

      <use class="selection-tile" href="#grid-tile" x="10" y="80" />
      <use class="selection-tile" href="#grid-tile" x="100" y="80" />
      <use class="selection-tile" href="#grid-tile" x="190" y="80" />
    `;
  }

  private deselectAllAnimation() {
    return svg`
      ${importSprites(gridTile)}

      <use class="deselection-tile" href="#grid-tile" x="10" y="10" />
      <use class="deselection-tile" href="#grid-tile" x="100" y="10" />
      <use class="deselection-tile" href="#grid-tile" x="190" y="10" />

      <use class="deselection-tile" href="#grid-tile" x="10" y="80" />
      <use class="deselection-tile" href="#grid-tile" x="100" y="80" />
      <use class="deselection-tile" href="#grid-tile" x="190" y="80" />
    `;
  }

  private shortcutTemplate(shortcut: string[], animation: SVGTemplateResult, shortcutTitle: string) {
    return html`
      <div class="shortcut-card">
        <h3 class="shortcut-template-title">${shortcutTitle}</h3>

        <div class="shortcut-animation">
          <svg>${animation}</svg>
        </div>

        <div class="shortcut">
          <div class="shortcut-keys">${shortcut.map((key) => html`<kbd>${key}</kbd>`)}</div>
        </div>
      </div>
    `;
  }

  public render() {
    // prettier-ignore
    return html`
      <div class="shortcut-slide">
        ${this.decisionShortcutTemplate()}
        ${this.shortcutTemplate(["Ctrl", "A"], this.selectAllAnimation(), "Select all")}
        ${this.shortcutTemplate(["Esc"], this.deselectAllAnimation(), "De-select all")}
      </div>

      <button @click="${() => this.dialog.closeModal()}" class="oe-btn-primary">Begin Verification</button>
    `;
  }
}
