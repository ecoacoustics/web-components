import { LitElement, PropertyValues, TemplateResult, html } from "lit";
import { customElement, property, query, queryAssignedElements } from "lit/decorators.js";
import { spectrogramStyles } from "./css/style";
import { computed, signal, Signal, SignalWatcher } from "@lit-labs/preact-signals";
import { RenderCanvasSize, RenderWindow, Size, TwoDSlice } from "../../models/rendering";
import { AudioModel } from "../../models/recordings";
import { Hertz, Pixel, Seconds, UnitConverter } from "../../models/unitConverters";
import { OeResizeObserver } from "../../helpers/resizeObserver";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { AudioHelper } from "../../helpers/audio/audio";
import { WindowFunctionName } from "fft-windowing-ts";
import { IAudioInformation, SpectrogramOptions } from "../../helpers/audio/models";

export type SpectrogramCanvasScale = "stretch" | "natural" | "original";

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
 * @property scaling - (stretch | natural | original) - The aspect ratio of the spectrogram
 * stretch should scale without aspect ratio
 * natural should scale 1/1 until one of the dimensions overflows (probably set a max height of the natural fft window)
 * original should scale 1/1 with a max height of the spectrogram set to the fft window
 *
 * @fires Loading
 * @fires Finished
 *
 * @slot - A `<source>` element to provide the audio source
 */
@customElement("oe-spectrogram")
export class Spectrogram extends SignalWatcher(AbstractComponent(LitElement)) {
  public static styles = spectrogramStyles;

  // must be in the format startOffset, lowFrequency, endOffset, highFrequency
  @property({ type: String, attribute: "window", reflect: true })
  public domRenderWindow?: string;

  @property({ type: Boolean, reflect: true })
  public paused = true;

  @property({ type: String, reflect: true })
  public scaling: SpectrogramCanvasScale = "stretch";

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
  public offset = 0;

  @property({ type: String })
  public src = "";

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

  public audio: Signal<AudioModel> = signal(defaultAudioModel);
  public currentTime: Signal<Seconds> = signal(this.offset);
  // TODO: remove this temp value
  public renderCanvasSize: Signal<RenderCanvasSize> = signal({ width: 0, height: 0 });
  public renderWindow: Signal<RenderWindow> = computed(() => this.parseRenderWindow());
  public useMelScale: Signal<boolean> = signal(this.melScale);
  public fftSlice?: TwoDSlice<Pixel, Hertz>;
  public unitConverters?: UnitConverter;
  private audioHelper = new AudioHelper();
  // TODO: remove this
  private doneFirstRender = false;

  public hasSource(): boolean {
    return !!this.src || this.slotElements.length > 0;
  }

  // todo: this should be part of a mixin
  public disconnectedCallback(): void {
    OeResizeObserver.instance.unobserve(this.canvas);
    super.disconnectedCallback();
  }

  public firstUpdated(): void {
    OeResizeObserver.observe(this.canvas, (e) => this.handleResize(e));
    this.resizeCanvas(this.canvas);

    if (this.hasSource()) {
      this.renderSpectrogram();
    }

    this.unitConverters = new UnitConverter(this.renderWindow, this.renderCanvasSize, this.audio, this.useMelScale);
  }

  public updated(change: PropertyValues<this>) {
    if (this.doneFirstRender) {
      // spectrogram regeneration functionality
      if (this.invalidateSpectrogramOptions(change)) {
        this.regenerateSpectrogramOptions();
        this.useMelScale.value = this.melScale;
      } else if (this.invalidateSpectrogramSource(change)) {
        this.pause();
        this.regenerateSpectrogram();
        this.updateCurrentTime();
      }
    } else if (this.invalidateSpectrogramSource(change)) {
      if (this.hasSource()) {
        this.renderSpectrogram();
      }
    }
  }

  public renderSpectrogram(): void {
    console.log("rendering spectrogram");
    this.dispatchEvent(
      new CustomEvent("loading", {
        bubbles: true,
      }),
    );

    this.audioHelper
      .connect(this.mediaElement.src, this.canvas, this.spectrogramOptions())
      .then((info: IAudioInformation) => {
        const originalRecording = { duration: info.duration!, startOffset: this.offset };

        this.audio.value = new AudioModel({
          duration: info.duration!,
          sampleRate: info.sampleRate!,
          originalAudioRecording: originalRecording,
        });

        this.dispatchEvent(
          new CustomEvent("loaded", {
            bubbles: true,
          }),
        );

        this.doneFirstRender = true;
      });
  }

  public regenerateSpectrogram(): void {
    console.log("regenerating spectrogram");
    this.dispatchEvent(
      new CustomEvent("loading", {
        bubbles: true,
      }),
    );

    this.audioHelper.changeSource(this.mediaElement.src, this.spectrogramOptions()).then((info: IAudioInformation) => {
      const originalRecording = { duration: info.duration!, startOffset: this.offset };

      this.audio.value = new AudioModel({
        duration: info.duration!,
        sampleRate: info.sampleRate!,
        originalAudioRecording: originalRecording,
      });

      this.dispatchEvent(
        new CustomEvent("loaded", {
          bubbles: true,
        }),
      );
    });
  }

  public regenerateSpectrogramOptions(): void {
    this.audioHelper.regenerateSpectrogram(this.spectrogramOptions()).then(() => {
      this.dispatchEvent(
        new CustomEvent("loaded", {
          bubbles: true,
        }),
      );
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

  private originalFftSize(): Size {
    const options = this.spectrogramOptions();
    const step = options.windowSize - options.windowOverlap;
    const duration = this.audio.value.duration;
    const sampleRate = this.audio.value.sampleRate;
    const totalSamples = duration * sampleRate;

    const width = Math.ceil(totalSamples / step);
    const height = options.windowSize / 2;

    return { width, height };
  }

  private naturalSize(originalSize: Size, target: HTMLElement): Size {
    // the natural size is where we scale the width and height up
    // until one of the dimensions overflows the targetEntry.contentRect
    // while keeping the aspect ratio
    const scale = Math.min(target.clientWidth / originalSize.width, target.clientHeight / originalSize.height);

    return {
      width: originalSize.width * scale,
      height: originalSize.height * scale,
    };
  }

  private stretchSize(entry: HTMLElement): Size {
    return { width: entry.clientWidth, height: entry.clientHeight };
  }

  private handleResize(entries: ResizeObserverEntry[]): void {
    if (entries.length === 0) return;

    const targetEntry = entries[0].target as HTMLElement;

    this.resizeCanvas(targetEntry);
  }

  // TODO: refactor this procedure
  private resizeCanvas(targetEntry: HTMLElement): void {
    let size: Size | undefined;

    if (this.scaling === "original") {
      size = this.originalFftSize();
    } else if (this.scaling === "natural") {
      const originalSize = this.originalFftSize();
      size = this.naturalSize(originalSize, targetEntry);
    } else {
      size = this.stretchSize(targetEntry);
    }

    console.log("resize to", size);

    this.renderCanvasSize.value = size;

    if (this.audioHelper.canvasTransferred) {
      this.audioHelper.resizeCanvas(size);
    } else {
      this.canvas.width = size.width;
      this.canvas.height = size.height;
    }

    if (this.scaling === "stretch") {
      this.canvas.style.width = "100%";
    } else {
      this.canvas.style.width = "auto";
    }
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

  private updateCurrentTime(poll = false): void {
    if (poll) {
      if (this.nextRequestId) {
        window.cancelAnimationFrame(this.nextRequestId);
        this.nextRequestId = null;
      }

      this.highFreqUpdateCurrentTime();
    } else {
      this.currentTime.value = this.mediaElement.currentTime;
    }
  }

  // TODO: move somewhere else
  private nextRequestId: number | null = null;

  private highFreqUpdateCurrentTime(
    lastHighResSync: DOMHighResTimeStamp = performance.now(),
    lastObservedTime: number | null = null,
  ): void {
    // this will become a problem if we want to update the time in the future without pausing the media element
    // e.g. seeking
    if (!this.paused) {
      const mediaElementTime = this.mediaElement.currentTime;
      let exactTimeDelta = 0;

      // in Firefox there are anti-fingerprinting protections that reduce accuracy of the media element's currentTime
      // this causes the same values to be emitted multiple times (when poling at 60 FPS), and will cause the last
      // couple of milliseconds to be skipped
      // to fix this, we use a high resolution timer, and if we see the same value twice, we calculate the difference
      // that we have seen, so that we can "fill in the gaps"
      // in browsers which report the real time (e.g. Chrome) this condition should never be true
      const highResTime = performance.now();
      if (mediaElementTime === lastObservedTime) {
        exactTimeDelta = (highResTime - lastHighResSync) / 1_000;
      } else {
        lastHighResSync = highResTime;
      }

      this.currentTime.value = mediaElementTime + exactTimeDelta;

      this.nextRequestId = requestAnimationFrame(() =>
        this.highFreqUpdateCurrentTime(lastHighResSync, mediaElementTime),
      );
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
      this.updateCurrentTime(true);
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
    // TODO: I'm sure there's a way to do this in the lit html template
    let derivedMediaElement: TemplateResult<1> | undefined;
    if (this.src) {
      derivedMediaElement = html`
        <audio id="media-element" src="${this.src}" @ended="${this.pause}" preload crossorigin>
          <slot></slot>
        </audio>
      `;
    } else if (this.slotElements.length > 0) {
      derivedMediaElement = html`
        <audio id="media-element" @ended="${this.pause}" preload crossorigin>
          <slot></slot>
        </audio>
      `;
    } else {
      derivedMediaElement = html`<audio id="media-element" @ended="${this.pause}" preload crossorigin></audio>`;
    }

    return html`
      <div id="spectrogram-container">
        <canvas></canvas>
      </div>
      ${derivedMediaElement}
    `;
  }
}
