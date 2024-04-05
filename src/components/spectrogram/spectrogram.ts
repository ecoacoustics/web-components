import { LitElement, PropertyValues, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { spectrogramStyles } from "./css/style";
import { RenderWindow } from "models/models";

/**
 * A simple spectrogram component that can be used with the open ecoacoustics components
 *
 * @property playing - Whether the spectrogram is playing
 * @property src - The source of the audio file to play
 *
 * @fires playing - When the spectrogram starts or stops playing
 *
 * @slot - A `<source>` element to provide the audio source
 */
@customElement("oe-spectrogram")
export class Spectrogram extends LitElement {
  public static styles = spectrogramStyles;

  @property({ type: Boolean, reflect: true })
  public paused = true;

  @property({ type: String })
  public src = "";

  // if we serialize this, it will serialize it as 4 comma separated numbers (x0, x1, y0, y1)
  @property({ reflect: true })
  public renderWindow?: RenderWindow;

  @query("#media-element")
  private mediaElement?: HTMLMediaElement;

  public willUpdate(change: PropertyValues<this>): void {
    if (change.has("paused")) {
      this.setPlaying();
    }
  }

  public updated() {
    this.setPlaying();
  }

  public play() {
    this.paused = false;
  }

  public pause() {
    this.paused = true;
  }

  private setPlaying() {
    if (this.paused == this.mediaElement?.paused) return;

    if (this.paused) {
      this.mediaElement?.pause();
    } else {
      this.mediaElement?.play();
    }

    this.dispatchEvent(new CustomEvent("play", { detail: !this.paused }));
  }

  public render() {
    return html`
      <div id="spectrogram-container"></div>
      <audio id="media-element" src="${this.src}" @ended="${this.pause}">
        <slot></slot>
      </audio>
    `;
  }
}
