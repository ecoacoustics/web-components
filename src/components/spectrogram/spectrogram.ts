import { LitElement, PropertyValues, html } from "lit";
import { customElement, property, query, queryAssignedElements } from "lit/decorators.js";
import { spectrogramStyles } from "./css/style";
import { computed, signal, Signal, SignalWatcher } from "@lit-labs/preact-signals";
import { RenderCanvasSize, RenderWindow, TwoDSlice } from "../../models/rendering";
import { AudioModel } from "../../models/recordings";
import { Hertz, Pixel, Seconds, UnitConverter } from "../../models/unitConverters";
import { OeResizeObserver } from "../../helpers/resizeObserver";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { AudioHelper } from "../../helpers/audio/audio";
import { WindowFunctionName } from "fft-windowing-ts";
import { IAudioInformation, SpectrogramOptions } from "../../helpers/audio/models";

// TODO: fix
const defaultAudioModel = new AudioModel({
  duration: 0,
  sampleRate: 0,
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
 * TODO
 * @property aspect-ratio (stretch | fit-width | fit-height | natural) - The aspect ratio of the spectrogram
 * stretch - fills parent and distorts image
 * fit-width - fits the width of the container and scales the height (fills its parent in the x direction) (maintaining the correct aspect ratio)
 * fit-height - fits the height of the container and scales the width (fills its parent in the y direction) (maintaining the correct aspect ratio)
 * natural - a 1:1 mapping to the natural FFT height
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

  @property({ type: Number })
  public offset = 0;

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

  @queryAssignedElements()
  public slotElements!: Array<HTMLElement>;

  @query("#media-element")
  private mediaElement!: HTMLMediaElement;

  @query("canvas")
  private canvas!: HTMLCanvasElement;

  public fftSlice?: TwoDSlice<Pixel, Hertz>;

  public audio: Signal<AudioModel> = signal(defaultAudioModel);
  public currentTime: Signal<Seconds> = signal(this.offset);
  public renderCanvasSize: Signal<RenderCanvasSize> = signal(this.canvasSize());
  public renderWindow: Signal<RenderWindow> = computed(() => this.parseRenderWindow());
  public unitConverters?: UnitConverter;
  private doneFirstRender = false;
  private audioHelper = new AudioHelper();

  public firstUpdated(): void {
    // todo: retrieve size data from even callback
    OeResizeObserver.observe(this.canvas, () => {
      this.renderCanvasSize.value = this.canvasSize();
      this.updateCurrentTime();
      this.resizeCanvasViewport();

      this.doneFirstRender = true;
    });

    this.renderSpectrogram();
    this.unitConverters = new UnitConverter(this.renderWindow, this.renderCanvasSize, this.audio);
  }

  // todo: this should be part of a mixin
  public disconnectedCallback(): void {
    OeResizeObserver.instance.unobserve(this.canvas);
  }

  public updated(change: PropertyValues<this>) {
    if (this.doneFirstRender) {
      // spectrogram regeneration functionality
      if (this.invalidateSpectrogramOptions(change)) {
        this.audioHelper.regenerateSpectrogram(this.spectrogramOptions());
      } else if (this.invalidateSpectrogramSource(change)) {
        this.currentTime.value = 0;
        this.regenerateSpectrogram();
      }
    }
  }

  public renderSpectrogram(): void {
    this.audioHelper
      .connect(this.mediaElement.src, this.canvas, this.spectrogramOptions())
      .then((info: IAudioInformation) => {
        const originalRecording = { duration: info.duration!, startOffset: this.offset };

        this.audio.value = new AudioModel({
          duration: info.duration!,
          sampleRate: info.sampleRate!,
          originalAudioRecording: originalRecording,
        });
      });
  }

  public regenerateSpectrogram(): void {
    this.audioHelper.changeSource(this.mediaElement.src, this.spectrogramOptions()).then((info: IAudioInformation) => {
      const originalRecording = { duration: info.duration!, startOffset: this.offset };

      this.audio.value = new AudioModel({
        duration: info.duration!,
        sampleRate: info.sampleRate!,
        originalAudioRecording: originalRecording,
      });
    });
  }

  public regenerateSpectrogram(): void {
    this.audioHelper.changeSource(this.mediaElement.src, this.spectrogramOptions()).then((metadata: IAudioMetadata) => {
      const originalRecording = { duration: metadata.format.duration!, startOffset: this.offset };

      this.audio.value = new AudioModel({
        duration: metadata.format.duration!,
        sampleRate: metadata.format.sampleRate!,
        originalAudioRecording: originalRecording,
      });
    });
  }

  public play(): void {
    this.paused = false;
    this.setPlaying();
  }

  public pause(): void {
    this.paused = true;
    this.setPlaying();
  }

  /**
   * Specifies if the spectrogram is invalidated with the new parameters
   * This method can be used to check if the spectrogram needs to be re-rendered
   */
  private invalidateSpectrogramOptions(change: PropertyValues<this>): boolean {
    // TODO: Improve typing
    const invalidationKeys: (keyof Spectrogram)[] = [
      "domRenderWindow",
      "brightness",
      "contrast",
      "windowSize",
      "windowFunction",
      "windowOverlap",
      "melScale",
      "colorMap",
      "offset",
    ];

    return invalidationKeys.some((key) => change.has(key));
  }

  private invalidateSpectrogramSource(change: PropertyValues<this>): boolean {
    const invalidationKeys: (keyof Spectrogram)[] = ["src", "slotElements"];

    return invalidationKeys.some((key) => change.has(key));
  }

  private updateCurrentTime(): void {
    if (!this.paused) {
      this.currentTime.value = this.mediaElement.currentTime;
      requestAnimationFrame(() => this.updateCurrentTime());
    }
  }

  // TODO: we shouldn't query the element for this size - it can cause a repaint every time we ask
  // instead use the resize observer's data and cache the size
  private canvasSize(): RenderCanvasSize {
    return new RenderCanvasSize({
      width: this.canvas?.clientWidth ?? 0,
      height: this.canvas?.clientHeight ?? 0,
    });
  }

  private resizeCanvasViewport(): void {
    if (this.audioHelper.canvasTransferred) {
      this.audioHelper.resizeCanvas(this.canvasSize());
    } else {
      this.canvas.width = this.canvas.clientWidth;
      this.canvas.height = this.canvas.clientHeight;
    }
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

  private setPlaying(): void {
    if (this.paused == this.mediaElement?.paused) return;

    if (this.paused) {
      this.mediaElement?.pause();
    } else {
      this.mediaElement?.play();
      requestAnimationFrame(() => this.updateCurrentTime());
    }

    this.dispatchEvent(new CustomEvent("play", { detail: !this.paused }));
  }

  // creates a render window from an audio segment
  private parseRenderWindow(): RenderWindow {
    if (!this.domRenderWindow) {
      return new RenderWindow({
        startOffset: this.offset,
        endOffset: this.offset + this.audio.value.duration,
        lowFrequency: 0,
        highFrequency: this.unitConverters?.nyquist.value ?? 0,
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
      <audio id="media-element" src="${this.src}" @ended="${this.pause}" preload crossorigin>
        <slot></slot>
      </audio>
    `;
  }
}
