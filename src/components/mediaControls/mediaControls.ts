import { LitElement, PropertyValues, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { mediaControlsStyles } from "./css/style";
import { ILogger, rootContext } from "../logger/logger";
import { provide } from "@lit/context";
import lucidPlayIcon from "lucide-static/icons/play.svg?raw";
import lucidPauseIcon from "lucide-static/icons/pause.svg?raw";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { Spectrogram } from "../spectrogram/spectrogram";

// class A {
//   private map = new Map<object, (() => any)[]>();

//   bindEvent(subject, event, callback) {
//     const callbackWithContext = callback.bind(this);
//     subject.addEventListener(event, callbackWithContext);

//     this.map.set(subject, this.map.get(subject)?.concat([callbackWithContext]) ?? []);
//   }

//   unbindEvents(subject) {
//     this.map.get(subject).forEach((callback) => {
//       subject.removeEventListener(callback);
//     });
//   }
// }

/**
 * A simple media player with play/pause and seek functionality that can be used with the open ecoacoustics spectrograms and components.
 *
 * @property for - The id of the audio element to control
 *
 * @csspart play-icon - Styling applied to the play icon (including default)
 * @csspart pause-icon - Styling applied to the pause icon (including default)
 *
 * @slot play-icon - The icon to display when the media is stopped
 * @slot pause-icon - The icon to display when the media is playing
 */
@customElement("oe-media-controls")
export class MediaControls extends LitElement {
  public static styles = mediaControlsStyles;

  @provide({ context: rootContext })
  public logger: ILogger = {
    log: console.log,
  };

  @property({ type: String })
  public for: string = "";

  private spectrogramElement?: Spectrogram | null;

  public disconnectedCallback(): void {
    this.spectrogramElement?.removeEventListener("playing", this.callback);
    super.disconnectedCallback();
  }

  private callback = this.handleUpdatePlaying.bind(this);

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("for")) {
      // unbind the previous spectrogram element from the playing
      this.spectrogramElement?.removeEventListener("playing", this.callback);
      this.spectrogramElement = document.querySelector<Spectrogram>(`#${this.for}`);

      this.spectrogramElement?.addEventListener("playing", this.callback);
    }
  }

  protected toggleAudio(): void {
    // if the media controls element is not bound to a spectrogram element, do nothing
    if (!this.spectrogramElement) return;

    if (this.isSpectrogramPlaying()) {
      this.spectrogramElement.pause();
    } else {
      this.spectrogramElement.play();
    }
  }

  private handleUpdatePlaying(): void {
    this.logger.log(`Audio ${this.isSpectrogramPlaying() ? "playing" : "paused"}`);
    this.requestUpdate();
  }

  private isSpectrogramPlaying(): boolean {
    return this.spectrogramElement?.playing ?? false;
  }

  private playIcon() {
    return html`<slot name="play-icon" part="play-icon">${unsafeSVG(lucidPlayIcon)}</slot>`;
  }

  private pauseIcon() {
    return html`<slot name="pause-icon" part="pause-icon">${unsafeSVG(lucidPauseIcon)}</slot>`;
  }

  public render() {
    return html`
      <button id="action-button" @click="${() => this.toggleAudio()}">
        ${this.isSpectrogramPlaying() ? this.pauseIcon() : this.playIcon()}
      </button>
    `;
  }
}
