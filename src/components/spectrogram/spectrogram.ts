import { LitElement, PropertyValues, html, unsafeCSS } from "lit";
import { customElement, property, query, queryAssignedElements } from "lit/decorators.js";
import { computed, signal, Signal, SignalWatcher } from "@lit-labs/preact-signals";
import { RenderCanvasSize, RenderWindow, Size, TwoDSlice } from "../../models/rendering";
import { AudioModel } from "../../models/recordings";
import { Hertz, Pixel, Seconds, UnitConverter } from "../../models/unitConverters";
import { OeResizeObserver } from "../../helpers/resizeObserver";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { AudioHelper } from "../../helpers/audio/audio";
import { WindowFunctionName } from "fft-windowing-ts";
import { IAudioInformation, SpectrogramOptions } from "../../helpers/audio/models";
import { booleanConverter } from "../../helpers/attributes";
import { TIME_DOMAIN_PROCESSOR_NAME } from "../../helpers/audio/messages";
import TimeDomainProcessor from "../../helpers/audio/time-domain-processor.ts?worker&url";
import spectrogramStyles from "./css/style.css?inline";

export type SpectrogramCanvasScale = "stretch" | "natural" | "original";

export interface IPlayEvent {
  play: boolean;
  keyboardShortcut: boolean;
}

// TODO: remove this default model
const defaultAudioModel = new AudioModel(0, 0, { startOffset: 0, duration: 0 });

// TODO: move this to a different place
const domRenderWindowConverter = (value: string | null): RenderWindow | undefined => {
  if (!value) {
    return;
  }

  const [startOffset, lowFrequency, endOffset, highFrequency] = value.split(",").map(parseFloat);
  return new RenderWindow(startOffset, endOffset, lowFrequency, highFrequency);
};

/**
 * @description
 * A spectrogram component that can be used with the open ecoacoustics components
 *
 * @fires Loading
 * @fires Finished
 *
 * @slot - A `<source>` element to provide the audio source
 */
@customElement("oe-spectrogram")
export class SpectrogramComponent extends SignalWatcher(AbstractComponent(LitElement)) {
  public static styles = unsafeCSS(spectrogramStyles);

  public static readonly playEventName = "play" as const;

  // must be in the format window="startOffset, lowFrequency, endOffset, highFrequency"
  @property({ attribute: "window", converter: domRenderWindowConverter, reflect: true })
  public domRenderWindow?: RenderWindow;

  /** Whether the spectrogram is paused */
  @property({ type: Boolean, reflect: true })
  public paused = true;

  /** The source of the audio file */
  @property({ type: String, reflect: true })
  public src = "";

  /**
   * The aspect ratio of the spectrogram
   * stretch should scale without aspect ratio
   * natural should scale with the correct aspect ratio to fill the container it
   * is in. One dimension will be constrained by the container, the other by the
   * aspect ratio.
   * original will set the spectrogram to the native resolution of the FFT output.
   * It will not scale the image at all.
   *
   * @values stretch | natural | original
   */
  @property({ type: String, reflect: true })
  public scaling: SpectrogramCanvasScale = "stretch";

  /** The size of the fft window */
  @property({ type: Number, attribute: "window-size" })
  public windowSize = 512;

  /** The window function to use for the spectrogram */
  @property({ type: String, attribute: "window-function" })
  public windowFunction: WindowFunctionName = "hann";

  /** The amount of overlap between fft windows */
  @property({ type: Number, attribute: "window-overlap" })
  public windowOverlap = 0;

  /** A boolean attribute representing if the spectrogram should be shown in mel-scale */
  @property({ type: Boolean, attribute: "mel-scale", converter: booleanConverter })
  public melScale = false;

  /** A color map to use for the spectrogram */
  @property({ type: String, attribute: "color-map" })
  public colorMap = "";

  /** An offset (seconds) from the start of a larger audio recording */
  @property({ type: Number })
  public offset = 0;

  /** An increase in brightness */
  @property({ type: Number })
  public brightness = 0;

  /** A scalar multiplier that should be applied to fft values */
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
  public renderCanvasSize: Signal<RenderCanvasSize> = signal({ width: 128, height: 0 });
  public renderWindow: Signal<RenderWindow> = computed(() => this.parseRenderWindow());
  public fftSlice?: TwoDSlice<Pixel, Hertz>;
  public unitConverters: Signal<UnitConverter | undefined> = signal(undefined);
  private audioHelper = new AudioHelper();
  private audioContext = new AudioContext();
  // TODO: remove this
  private doneFirstRender = false;

  public get spectrogramOptions(): SpectrogramOptions {
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

  public set spectrogramOptions(options: SpectrogramOptions) {
    this.windowSize = options.windowSize;
    this.windowOverlap = options.windowOverlap;
    this.windowFunction = options.windowFunction;
    this.melScale = options.melScale;
    this.brightness = options.brightness;
    this.contrast = options.contrast;
    this.colorMap = options.colorMap;
  }

  public get possibleWindowSizes(): ReadonlyArray<number> {
    return [128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
  }

  public get possibleWindowOverlaps(): ReadonlyArray<number> {
    // we assign windowSizes to a variable so that we don't have to re-create
    // the possible window sizes array every iteration in the filter callback
    const windowSizes = this.possibleWindowSizes;
    const currentWindowSize = this.spectrogramOptions.windowSize;
    return windowSizes.filter((value: number) => value < currentWindowSize);
  }

  public get renderedSource(): string {
    if (this.src) {
      return this.src;
    }

    const slotElement = this.slotElements[0];
    if (slotElement instanceof HTMLSourceElement) {
      return slotElement.src;
    }

    return "";
  }

  public hasSource(): boolean {
    return !!this.src || this.slotElements.length > 0;
  }

  // todo: this should be part of a mixin
  public disconnectedCallback(): void {
    OeResizeObserver.instance.unobserve(this.canvas);
    super.disconnectedCallback();
  }

  public async firstUpdated() {
    OeResizeObserver.observe(this.canvas, (e) => this.handleResize(e));
    this.resizeCanvas(this.canvas);

    if (this.hasSource()) {
      this.renderSpectrogram();
    }

    const unitConverters = new UnitConverter(
      this.renderWindow,
      this.renderCanvasSize,
      this.audio,
      signal(this.melScale),
    );
    this.unitConverters.value = unitConverters;

    // attach the audio context
    const workletUrl = new URL(TimeDomainProcessor, import.meta.url);
    await this.audioContext.audioWorklet.addModule(workletUrl);
    const audioWorklet = new AudioWorkletNode(this.audioContext, TIME_DOMAIN_PROCESSOR_NAME);

    audioWorklet.connect(this.audioContext.destination);
  }

  public updated(change: PropertyValues<this>) {
    if (this.doneFirstRender) {
      // spectrogram regeneration functionality
      if (this.invalidateSpectrogramOptions(change)) {
        this.regenerateSpectrogramOptions();

        if (this.unitConverters.value) {
          this.unitConverters.value.melScale.value = this.melScale;
        }
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

    this.resizeCanvas(this.canvas);
  }

  public renderSpectrogram(): void {
    this.dispatchEvent(
      new CustomEvent("loading", {
        bubbles: true,
      }),
    );

    this.audioHelper
      .connect(this.renderedSource, this.canvas, this.spectrogramOptions)
      .then((info: IAudioInformation) => {
        const originalRecording = { duration: info.duration, startOffset: this.offset };

        this.audio.value = new AudioModel(info.duration, info.sampleRate, originalRecording);

        this.dispatchEvent(
          new CustomEvent("loaded", {
            bubbles: true,
          }),
        );

        this.doneFirstRender = true;
      });
  }

  public regenerateSpectrogram(): void {
    if (!this.doneFirstRender || !this.renderedSource) {
      return;
    }

    console.log("regenerating spectrogram");
    this.dispatchEvent(
      new CustomEvent("loading", {
        bubbles: true,
      }),
    );

    this.audioHelper.changeSource(this.renderedSource, this.spectrogramOptions).then((info: IAudioInformation) => {
      const originalRecording = { duration: info.duration, startOffset: this.offset };
      this.audio.value = new AudioModel(info.duration, info.sampleRate, originalRecording);

      this.dispatchEvent(
        new CustomEvent("loaded", {
          bubbles: true,
        }),
      );
    });
  }

  public regenerateSpectrogramOptions(): void {
    // if the spectrogram options are updated, but there is no source
    // we should not attempt to regenerate the spectrogram
    if (!this.doneFirstRender || !this.renderedSource) {
      return;
    }

    this.audioHelper.regenerateSpectrogram(this.spectrogramOptions).then(() => {
      this.dispatchEvent(
        new CustomEvent("loaded", {
          bubbles: true,
        }),
      );
    });
  }

  public resetSettings(): void {
    this.colorMap = "audacity";
    this.contrast = 1;
    this.brightness = 0;
    this.melScale = false;

    this.stop();
  }

  public play(keyboardShortcut = false): void {
    this.setPaused(false, keyboardShortcut);
  }

  public pause(keyboardShortcut = false): void {
    this.setPaused(true, keyboardShortcut);
  }

  public stop(): void {
    this.currentTime.value = 0;
    this.pause();
  }

  private handleSlotChange(): void {
    if (this.hasSource()) {
      this.renderSpectrogram();
    }
  }

  private originalFftSize(): Size {
    const options = this.spectrogramOptions;
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
    const elementToScaleTo = entry;

    // in any correctly structured HTML document, a parent element should always
    // exist (at the very minimum a html tag should be present) however, we
    // cannot enforce this, so we have to check that a parent element exists
    if (elementToScaleTo) {
      return { width: elementToScaleTo.clientWidth, height: elementToScaleTo.clientHeight };
    }

    throw new Error("Spectrogram element does not have a parent to scale to");
  }

  // TODO: parents should not contribute to the size of the canvas
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

    this.renderCanvasSize.value = size;

    if (this.audioHelper.canvasTransferred) {
      this.audioHelper.resizeCanvas(size);
    } else {
      this.canvas.width = size.width;
      this.canvas.height = size.height;
    }

    if (this.scaling === "original") {
      this.style.height = `${size.height}px`;
      this.style.width = `${size.width}px`;
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
    const invalidationKeys: (keyof SpectrogramComponent)[] = [
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
    const invalidationKeys: (keyof SpectrogramComponent)[] = ["src", "slotElements"];
    return invalidationKeys.some((key) => change.has(key));
  }

  private updateCurrentTime(poll = false): void {
    if (poll) {
      // if the user starts playing the audio, stops playing it, then starts playing it again within the same frame
      // we would have two animation requests, and both would continue polling the time
      // in all subsequent frames, we would have two time updates per frame
      if (this.nextRequestId) {
        window.cancelAnimationFrame(this.nextRequestId);
        this.nextRequestId = null;
      }

      // we use request animation frame here because otherwise we could have two time
      // updates in the same frame
      // this could happen if we process the first time update before the next frame is requested
      // meaning that it queues a time update for the next frame
      // when the next frame is requested, the time will be updated again, meaning there was
      // two time updates in the same frame
      this.nextRequestId = requestAnimationFrame(() => this.pollUpdateHighFreqCurrentTime());
      return;
    }

    this.currentTime.value = this.mediaElement.currentTime;
  }

  // TODO: move somewhere else
  private nextRequestId: number | null = null;
  private playStartedAt: DOMHighResTimeStamp | null = null;

  // we used to set lastHighResSync to performance.now(), but this caused some
  // visual artifacts when the audio was paused and then played again
  // this was because the time between calling function and fetching the highResTime
  // later on led to a time difference of a couple of milliseconds
  private pollUpdateHighFreqCurrentTime(
    lastHighResSync: DOMHighResTimeStamp | null = null,
    lastObservedTime: number | null = null,
  ): void {
    // this will become a problem if we want to update the time in the future without pausing the media element
    // e.g. seeking
    if (!this.paused) {
      const mediaElementTime = this.mediaElement.currentTime;
      let highResolutionDelta = 0;

      // in Firefox there are anti-fingerprinting protections that reduce accuracy of the media element's currentTime
      // this causes the same values to be emitted multiple times (when poling at 60 FPS), and will cause the last
      // couple of milliseconds to be skipped
      // to fix this, we use a high resolution timer, and if we see the same value twice, we calculate the difference
      // that we have seen, so that we can "fill in the gaps"
      // in browsers which report the real time (e.g. Chrome) this condition should never be true
      const highResTime = performance.now();
      if (mediaElementTime === lastObservedTime) {
        // TODO: I don't think defaulting to the highResTime is correct
        // however, this fixed the indicator jumping back at the start of the recording
        highResolutionDelta = (highResTime - (lastHighResSync ?? highResTime)) / 1_000;

        if (this.playStartedAt === null) {
          this.playStartedAt = highResTime;
        }
      } else {
        if (this.playStartedAt !== null) {
          lastHighResSync = highResTime;
        }
      }

      // on some browsers, the media elements paused event doesn't emit the exact
      // millisecond that the audio is paused/the duration is reached
      // this can cause the high-resolution time to exceed the duration of the audio
      // by a few milliseconds
      // to fix this, we check if the new proposed time is greater than the duration
      // if it is, we set the current time to the duration and set the paused state
      const newProposedTime = mediaElementTime + highResolutionDelta;
      if (newProposedTime >= this.audio.value.duration) {
        this.currentTime.value = this.audio.value.duration;
        this.pause();

        // by returning early, we should never trigger the next requestAnimationFrame
        return;
      }

      this.currentTime.value = mediaElementTime + highResolutionDelta;

      this.nextRequestId = requestAnimationFrame(() =>
        this.pollUpdateHighFreqCurrentTime(lastHighResSync, mediaElementTime),
      );
    }
  }

  private setPaused(paused: boolean, keyboardShortcut = false): void {
    const detail: IPlayEvent = {
      play: !paused,
      keyboardShortcut,
    };

    // if this event is canceled, the spectrogram will not play
    const eventSuccess = this.dispatchEvent(
      new CustomEvent<IPlayEvent>(SpectrogramComponent.playEventName, { detail, cancelable: true, bubbles: true }),
    );

    // if the event is canceled (through event.preventDefault), it means that
    // some element didn't want the spectrogram to start playing
    if (!eventSuccess) {
      return;
    }

    if (paused) {
      // TODO: find out if we actually need this
      if (this.nextRequestId) {
        window.cancelAnimationFrame(this.nextRequestId);
        this.nextRequestId = null;
      }

      // we set playStartedAt to null so that when we start playing again the
      // high resolution time will not update until the first low resolution time
      // is updated
      this.playStartedAt = null;

      this.mediaElement.pause();
    } else {
      this.mediaElement.play();
      this.updateCurrentTime(true);
    }

    this.paused = paused;
  }

  // creates a render window from an audio segment if no explicit render window
  // is provided
  private parseRenderWindow(): RenderWindow {
    if (!this.domRenderWindow) {
      const defaultLowFrequency = 0;
      return new RenderWindow(
        this.offset,
        this.offset + this.audio.value.duration,
        defaultLowFrequency,
        this.unitConverters.value?.nyquist.value ?? 0,
      );
    }

    return this.domRenderWindow;
  }

  public render() {
    return html`
      <div id="spectrogram-container">
        <canvas></canvas>
      </div>
      <audio
        id="media-element"
        src="${this.src}"
        @play="${() => this.play()}"
        @ended="${() => this.pause()}"
        preload="metadata"
        crossorigin="anonymous"
      >
        <slot @slotchange="${this.handleSlotChange}"></slot>
      </audio>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-spectrogram": SpectrogramComponent;
  }
}
