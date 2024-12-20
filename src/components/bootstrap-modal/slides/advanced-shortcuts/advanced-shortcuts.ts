import { html } from "lit";
import { AbstractSlide } from "../abstractSlide";
import { keyboardTemplate } from "../../../../templates/keyboard";

export class AdvancedShortcutsSlide extends AbstractSlide {
  public constructor() {
    super("Keyboard shortcuts");
  }

  public override hasAnimations = false;

  public render() {
    return html`
      <div class="advanced-shortcuts-slide slide">
        <div class="shortcuts-container">
          <section>
            <h3>Playback</h3>
            <p>
              You can play a single spectrogram by selecting it and pressing the
              ${keyboardTemplate({ keys: ["Space"] })} key.
            </p>

            <p>
              ${keyboardTemplate({ keys: ["Space"] })} will play a all selected subjects if you have more than one
              selected.
            </p>
          </section>

          <section>
            <h3>Keyboard Selection</h3>
            <p>You can select subjects by holding the ${keyboardTemplate({ keys: ["Alt"] })} key.</p>
          </section>

          <section>
            <h3>Fullscreen</h3>
            <p>Use ${keyboardTemplate({ keys: ["F11"] })} to go into full screen.</p>
          </section>

          <section>
            <h3>Toggle Selection</h3>
            <p>
              You can add subjects to your current selection by using the ${keyboardTemplate({ keys: ["Ctrl"] })} key.
            </p>
          </section>

          <section>
            <h3>Exclusive Selection</h3>
            <p>You can select a range of subjects by holding the ${keyboardTemplate({ keys: ["Shift"] })} key.</p>
          </section>

          <section>
            <h3>Additive Range Selection</h3>
            <p>
              You can add a range of subjects to your current selection by holding the
              ${keyboardTemplate({ keys: ["Shift", "Ctrl"] })} key.
            </p>
          </section>

          <section>
            <h3>Select All</h3>
            <p>
              Select all visible subjects by pressing the ${keyboardTemplate({ keys: ["Ctrl", "a"] })} key combination.
            </p>
          </section>

          <section>
            <h3>Deselect All</h3>
            <p>Deselect all subjects by pressing the ${keyboardTemplate({ keys: ["Ctrl", "d"] })} key combination.</p>
          </section>
        </div>
      </div>
    `;
  }
}
