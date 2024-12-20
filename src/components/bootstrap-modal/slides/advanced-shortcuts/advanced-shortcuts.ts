import { html } from "lit";
import { AbstractSlide } from "../abstractSlide";
import { keyboardTemplate } from "../../../../templates/keyboard";

export class AdvancedShortcutsSlide extends AbstractSlide {
  public constructor() {
    super("Keyboard shortcuts");
  }

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
              You can play multiple spectrogram by selecting a sub-set of spectrograms and pressing the
              ${keyboardTemplate({ keys: ["Space"] })} key.
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
        </div>
      </div>
    `;
  }
}
