import { LitElement, PropertyValues, html } from "lit";
import { customElement, property, query, queryAssignedElements } from "lit/decorators.js";
import { spectrogramStyles } from "./css/style";
import { computed, signal, Signal, SignalWatcher } from "@lit-labs/preact-signals";
import { RenderCanvasSize, RenderWindow, TwoDSlice } from "../models/rendering";
import { AudioModel } from "../models/recordings";
import { Hertz, Pixels, Seconds, UnitConverter } from "../models/unitConverters";
import { OeResizeObserver } from "../helpers/resizeObserver";
import { AbstractComponent } from "../mixins/abstractComponent";
import { AudioHelper } from "../helpers/audio/audio";
import { SpectrogramOptions } from "../helpers/audio/state";
import { WindowFunctionName } from "fft-windowing-ts";

// TODO: fix
const defaultAudioModel = new AudioModel({
  duration: 7.5,
  sampleRate: 44100,
  originalAudioRecording: {
    startOffset: 0,
    duration: 0,
  },
});

/**
 * A spectrogram component that can be used with the open ecoacoustics components
 *
 * @property paused - Whether the spectrogram is paused
 * @property src - The source of the audio file to play
 * @property offset - What should second 0 be shown as in the spectrogram
 * @property window - What part of the spectrogram is currently visible
 * @property window-size - The size of the fft window
 * @property window-overlap - The amount of overlap between fft windows
 * @property window-function - The window function to use for the spectrogram
 * @property color-map - The color map to use for the spectrogram
 * @property brightness - The brightness of the spectrogram
 * @property contrast - The contrast of the spectrogram
 *
 * @slot - A `<source>` element to provide the audio source
 */
@customElement("oe-spectrogram")
export class Spectrogram extends SignalWatcher(AbstractComponent(LitElement)) {
  public static styles = spectrogramStyles;

  @property({ type: Boolean, reflect: true })
  public paused = true;

  @property({ type: String })
  public src = "";

  // must be in the format startOffset, lowFrequency, endOffset, highFrequency
  @property({ type: String, attribute: "window" })
  public domRenderWindow?: string;

  @property({ type: Number, attribute: "window-size" })
  public windowSize = 512;

  @property({ type: String, attribute: "window-function" })
  public windowFunction: WindowFunctionName = "hann";

  @property({ type: Number, attribute: "window-overlap" })
  public windowOverlap = 0;

  @property({ type: Boolean, attribute: "mel-scale" })
  public melScale = false;

  @property({ type: String, attribute: "color-map" })
  public colorMap = "";

  @property({ type: Number })
  public brightness = 0;

  @property({ type: Number })
  public contrast = 1;

  @property({ type: Number, reflect: true })
  public offset = 0;

  @queryAssignedElements()
  public slotElements!: Array<HTMLElement>;

  @query("#media-element")
  private mediaElement!: HTMLMediaElement;

  @query("canvas")
  private canvas!: HTMLCanvasElement;

  public fftSlice?: TwoDSlice<Pixels, Hertz>;

  public audio: Signal<AudioModel> = signal(defaultAudioModel);
  public currentTime: Signal<Seconds> = signal(this.offset);
  public renderCanvasSize: Signal<RenderCanvasSize> = signal(this.canvasSize());
  public renderWindow: Signal<RenderWindow> = computed(() => this.parseRenderWindow());
  public unitConverters?: UnitConverter;

  public firstUpdated(): void {
    OeResizeObserver.observe(this.canvas, () => {
      this.renderCanvasSize.value = this.canvasSize();
      this.updateCurrentTime();
      this.resizeCanvasViewport();
      AudioHelper.connect(this.mediaElement, this.canvas, this.spectrogramOptions());
    });

    this.unitConverters = new UnitConverter(this.renderWindow, this.renderCanvasSize, this.audio);
  }

  public disconnectedCallback(): void {
    OeResizeObserver.instance.unobserve(this.canvas);
  }

  public willUpdate(change: PropertyValues<this>): void {
    if (change.has("paused")) {
      this.setPlaying();
    }

    // if the src changes, we want to start the recording from the beginning
    if (change.has("src") || change.has("slotElements")) {
      this.currentTime.value = 0;
    }
  }

  public updated(change: PropertyValues<this>) {
    this.setPlaying();

    if (change.has("offset") || change.has("renderWindow")) {
      this.shadowRoot?.dispatchEvent(new Event("slotchange"));
    }
  }

  public play() {
    this.paused = false;
  }

  public pause() {
    this.paused = true;
  }

  private updateCurrentTime() {
    if (!this.paused) {
      this.currentTime.value = this.mediaElement.currentTime;
      requestAnimationFrame(() => this.updateCurrentTime());
    }
  }

  private canvasSize(): RenderCanvasSize {
    return new RenderCanvasSize({
      width: this.canvas?.clientWidth ?? 0,
      height: this.canvas?.clientHeight ?? 0,
    });
  }

  private resizeCanvasViewport(): void {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
  }

  private spectrogramOptions(): SpectrogramOptions {
    return new SpectrogramOptions(
      this.windowSize,
      this.windowOverlap,
      this.windowFunction,
      this.melScale,
      this.brightness,
      this.contrast,
      this.colorMap,
    );
  }

  private setPlaying() {
    if (this.paused == this.mediaElement?.paused) return;

    if (this.paused) {
      this.mediaElement?.pause();
    } else {
      this.mediaElement?.play();
      requestAnimationFrame(() => this.updateCurrentTime());
    }

    this.dispatchEvent(new CustomEvent("play", { detail: !this.paused }));
  }

  private updateAudio(): void {
    const originalRecording = { duration: this.audioDuration(), startOffset: this.offset };

    this.audio.value = new AudioModel({
      duration: this.audioDuration(),
      sampleRate: this.audioSampleRate(),
      originalAudioRecording: originalRecording,
    });
  }

  // TODO: Actually get the sample rate from the audio file
  private audioSampleRate(): Hertz {
    return defaultAudioModel.sampleRate;
  }

  private audioDuration(): Seconds {
    return this.mediaElement.duration;
  }

  // creates a render window from an audio segment
  private parseRenderWindow(): RenderWindow {
    if (!this.domRenderWindow) {
      return new RenderWindow({
        startOffset: this.offset,
        endOffset: this.offset + this.audio.value.duration,
        lowFrequency: 0,
        highFrequency: this.unitConverters?.nyquist() ?? 0,
      });
    }

    const [startOffset, lowFrequency, endOffset, highFrequency] = this.domRenderWindow.split(",").map(parseFloat);

    return new RenderWindow({
      startOffset,
      endOffset,
      lowFrequency,
      highFrequency,
    });
  }

  public render() {
    return html`
      <div id="spectrogram-container">
        <canvas></canvas>
      </div>
      <audio id="media-element" src="${this.src}" @ended="${this.pause}" @loadedmetadata="${this.updateAudio}">
        <slot></slot>
      </audio>
    `;
  }
}
