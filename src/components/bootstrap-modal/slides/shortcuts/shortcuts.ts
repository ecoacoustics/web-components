import { html, svg } from "lit";
import { map } from "lit/directives/map.js";
import { KeyboardShortcut } from "bootstrap-modal/bootstrap-modal";
import { createRef, ref, Ref } from "lit/directives/ref.js";
import { AbstractSlide } from "../abstractSlide";
import { gridTileSprite } from "../../sprites/grid-tile.sprite";

export class ShortcutsSlide extends AbstractSlide {
  public constructor(shortcuts: KeyboardShortcut[]) {
    const title = "Shortcuts";
    const description = "You can use the following keyboard shortcuts";

    super(title, description);
    this.shortcuts = shortcuts;
  }

  private shortcuts: KeyboardShortcut[];

  // TOOD: Refactor this
  private selectAllCtrl: Ref<HTMLElement> = createRef();
  private selectAllA: Ref<HTMLElement> = createRef();
  private deselectAllEsc: Ref<HTMLElement> = createRef();

  private animationDuration = 5 as const;
  private depressedDuration = 1 as const;

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
      ${gridTileSprite(10, 0)}
      ${gridTileSprite(100, 0)}
      ${gridTileSprite(190, 0)}
    `;
  }

  private selectionShortcutsTemplate() {
    // prettier-ignore
    return html`
      <svg viewBox="0 0 270 60">${this.gridAnimation()}</svg>
      <div class="selection-shortcut-keys">
        <section>
          <h3 class="shortcut-card-title">Select all</h3>
          <div class="shortcut">
            <kbd ${ref(this.selectAllCtrl)}>Ctrl</kbd>
            <kbd ${ref(this.selectAllA)}>A</kbd>
          </div>
        </section>

        <section>
          <h3 class="shortcut-card-title">De-select all</h3>
          <div class="shortcut">
            <kbd ${ref(this.deselectAllEsc)}>Esc</kbd>
          </div>
        </section>
      </div>
    `;
  }

  // we animate keypress in JavaScript because we already have a "depressed"
  // state for the "kbd" element
  // we can re-use the "depressed" state for the animation without having
  // to duplicate the styles
  private async animateKeypress(): Promise<void> {
    const animationDurationMs = this.animationDuration * 1_000;
    const depressedDurationMs = this.depressedDuration * 1_000;

    // animate the select all keypress
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.selectAllCtrl.value?.classList.add("depressed");
        this.selectAllA.value?.classList.add("depressed");

        setTimeout(() => {
          this.selectAllCtrl.value?.classList.remove("depressed");
          this.selectAllA.value?.classList.remove("depressed");
        }, depressedDurationMs);
      }, depressedDurationMs);
    });

    // animate the esc keypress
    const secondOffset = animationDurationMs - depressedDurationMs;
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.deselectAllEsc.value?.classList.add("depressed");

        setTimeout(() => {
          this.deselectAllEsc.value?.classList.remove("depressed");
        }, depressedDurationMs);

        setTimeout(() => {
          this.animateKeypress();
        }, animationDurationMs - secondOffset);
      }, secondOffset);
    });
  }

  public render() {
    this.animateKeypress();

    return html`
      <div class="shortcut-slide slide" style="--animation-duration: ${this.animationDuration}s">
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
