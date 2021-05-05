import { LitElement, html } from "lit";
import { customElement, property, state, eventOptions } from "lit/decorators.js";
import { mediaControlsStyles } from "./css/style";
import { ILogger, rootContext } from "../logger/logger";
import { provide } from "@lit/context";
import lucidPlayIcon from "lucide-static/icons/play.svg?raw";
import lucidPauseIcon from "lucide-static/icons/pause.svg?raw";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";

export interface MediaControlsProps {
  for: string;
}

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
  @property({ attribute: false })
  public logger: ILogger = {
    log: console.log,
  };

  @property({ type: String })
  public for: string = "";

  @state()
  public playing = false;

  public toggleAudio(): void {
    const audioElement = document.getElementById(this.for) as HTMLAudioElement;

    if (this.playing) {
      audioElement.pause();
    } else {
      audioElement.play();
    }

    this.playing = !this.playing;

    this.logger.log(`Audio ${this.playing ? "playing" : "paused"}`);

    this.onChange();
  }

  @eventOptions({ passive: true })
  public onChange() {
    this.dispatchEvent(
      new CustomEvent("playing-event", {
        detail: { value: `${this.playing ? "playing" : "paused"}` },
      }),
    );
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
        ${this.playing ? this.pauseIcon() : this.playIcon()}
      </button>
    `;
  }
}
