import { html } from "lit";
import { AbstractSlide } from "../abstractSlide";
import { keyboardTemplate } from "../../../../templates/keyboard";

export class AdvancedShortcutsSlide extends AbstractSlide {
  public constructor() {
    super("Advanced keyboard shortcuts");
  }

  // TODO: This page will probably have to be updated when we change the paging
  // keyboard shortcuts to page up and page down.
  // see: https://github.com/ecoacoustics/web-components/issues/129
  public render() {
    return html`
      <div class="advanced-shortcuts-slide slide">
        <section>
          <h3>Space to play</h3>
          <p>
            You can play a single spectrogram by selecting it and pressing the ${keyboardTemplate({ keys: ["Space"] })}
            key.
          </p>

          <p>
            You can play multiple spectrogram by selecting a sub-set of spectrograms and pressing the
            ${keyboardTemplate({ keys: ["Space"] })} key.
          </p>
        </section>

        <section>
          <h3>Arrow keys to navigate</h3>

          <p>You can navigate through pages of history using shortcut keys.</p>

          <div class="keyboard-legend">
            <div>
              ${keyboardTemplate({ keys: ["←"] })}
              <span>Navigate previous</span>
            </div>

            <div>
              ${keyboardTemplate({ keys: ["→"] })}
              <span>Navigate next</span>
            </div>
          </div>
        </section>

        <section>
          <h3>Alt Keyboard Selection</h3>

          <p>You can select multiple spectrograms by holding the ${keyboardTemplate({ keys: ["Alt"] })} key.</p>
        </section>

        <section>
          <h3>Fullscreen</h3>

          <p>You can enter fullscreen mode by clicking the "fullscreen" icon at the bottom of the verification grid, or by pressing
            ${keyboardTemplate({ keys: ["f11"] })}.</p>
          </p>
        </section>
      </div>
    `;
  }
}
