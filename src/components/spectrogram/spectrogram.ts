import { LitElement, PropertyValues, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { spectrogramStyles } from "./css/style";
import { signal, Signal, SignalWatcher } from "@lit-labs/preact-signals";
import { RenderCanvasSize, RenderWindow, TwoDSlice } from "../models/rendering";
import { AudioModel } from "../models/recordings";
import { UnitConverters } from "../models/unitConverters";

/**
 * A simple spectrogram component that can be used with the open ecoacoustics components
 *
 * @property playing - Whether the spectrogram is playing
 * @property src - The source of the audio file to play
 *
 * @csspart spectrogram-container - Styling applied to the spectrogram container
 *
 * @fires playing - When the spectrogram starts or stops playing
 *
 * @slot - A `<source>` element to provide the audio source
 */
@customElement("oe-spectrogram")
export class Spectrogram extends SignalWatcher(LitElement) {
  public constructor() {
    super();
  }

  public static styles = spectrogramStyles;

  @property({ type: Boolean, reflect: true })
  public paused = true;

  @property({ type: String })
  public src = "";

  @query("#media-element")
  private mediaElement!: HTMLMediaElement;

  @query("canvas")
  private canvas!: HTMLCanvasElement;

  @state()
  private audio?: AudioModel;

  @state()
  public twoDSlice?: TwoDSlice;

  public renderCanvasSize: Signal<RenderCanvasSize | null> = signal(null);
  public renderWindow: Signal<RenderWindow | null> = signal(null);

  private resizeObserver = new ResizeObserver(() => {
    const canvasSize = new RenderCanvasSize({
      width: this.canvas?.clientWidth ?? 0,
      height: this.canvas?.clientHeight ?? 0,
    });

    this.renderCanvasSize.value = canvasSize;
  });

  public firstUpdated(): void {
    this.resizeObserver.observe(this.canvas);
  }

  public willUpdate(change: PropertyValues<this>): void {
    if (change.has("paused")) {
      this.setPlaying();
    }

    this.twoDSlice = new TwoDSlice({
      x0: 0,
      x1: this.renderCanvasSize.value?.width ?? 0,
      y0: 0,
      y1: this.renderCanvasSize.value?.height ?? 0,
    });

    if (!this.audio) return;

    this.renderWindow.value = UnitConverters.getRenderWindow(this.twoDSlice, this.audio);
    console.log(this.renderWindow.value);
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

  private updateAudio(): void {
    if (!this.mediaElement) return;

    const originalRecording = { duration: this.audioDuration(), startOffset: 0 };

    this.audio = new AudioModel({
      duration: this.audioDuration(),
      sampleRate: this.audioSampleRate(),
      originalAudioRecording: originalRecording,
    });
  }

  private audioSampleRate(): number {
    return 11025;
  }

  private audioDuration(): number {
    return this.mediaElement.duration;
  }

  public render() {
    return html`
      <div id="spectrogram-container" part="spectrogram-container">
        <canvas></canvas>
      </div>
      <audio
        id="media-element"
        src="${this.src}"
        @ended="${this.pause}"
        @loadedmetadata="${this.updateAudio}"
        preload="metadata"
      >
        <slot></slot>
      </audio>
    `;
  }
}
