import { html, svg } from "lit";
import { map } from "lit/directives/map.js";
import { KeyboardShortcut } from "bootstrap-modal/bootstrap-modal";
import { createRef, ref, Ref } from "lit/directives/ref.js";
import { AbstractSlide } from "../abstractSlide";
import { importSprites } from "../../../../helpers/svgs/imports";
import gridTile from "../../sprites/grid-tile.svg?raw";

export class ShortcutsSlide extends AbstractSlide {
  public constructor(shortcuts: KeyboardShortcut[]) {
    super("You can use the following shortcuts to complete your tasks");
    this.shortcuts = shortcuts;
  }

  public override isSvg = false;
  private shortcuts: KeyboardShortcut[];
  private selectAllCtrl: Ref<HTMLElement> = createRef();
  private selectAllA: Ref<HTMLElement> = createRef();
  private deselectAllEsc: Ref<HTMLElement> = createRef();

  private animationDurationMs = 5_000;
  private depressedDurationMs = 1_000;

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
        <div>
          <h3 class="shortcut-template-title">Select all</h3>
          <div class="shortcut">
            <div class="shortcut-keys">
              <kbd ${ref(this.selectAllCtrl)}>Ctrl</kbd>
              <kbd ${ref(this.selectAllA)}>A</kbd>
            </div>
          </div>
        </div>

        <div>
          <h3 class="shortcut-template-title">De-select all</h3>
          <div class="shortcut">
            <div class="shortcut-keys">
              <kbd ${ref(this.deselectAllEsc)}>Esc</kbd>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // we animate keypress in JavaScript because we already have a "depressed"
  // state for the "kbd" element
  // we can re-use the "depressed" state for the animation without having
  // to duplicate the styles
  private async animateKeypress(): Promise<void> {
    // animate the select all keypress
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.selectAllCtrl.value?.classList.add("depressed");
        this.selectAllA.value?.classList.add("depressed");

        setTimeout(() => {
          this.selectAllCtrl.value?.classList.remove("depressed");
          this.selectAllA.value?.classList.remove("depressed");
        }, this.depressedDurationMs);
      }, this.depressedDurationMs);
    });

    // animate the esc keypress
    const secondOffset = this.animationDurationMs - this.depressedDurationMs;
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.deselectAllEsc.value?.classList.add("depressed");

        setTimeout(() => {
          this.deselectAllEsc.value?.classList.remove("depressed");
        }, this.depressedDurationMs);

        setTimeout(() => {
          this.animateKeypress();
        }, this.animationDurationMs - secondOffset);
      }, secondOffset);
    });
  }

  public render() {
    this.animateKeypress();

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
