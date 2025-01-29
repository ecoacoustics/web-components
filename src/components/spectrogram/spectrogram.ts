import { LitElement, PropertyValues, html, unsafeCSS } from "lit";
import { customElement, property, query, queryAssignedElements } from "lit/decorators.js";
import { computed, signal, Signal, SignalWatcher } from "@lit-labs/preact-signals";
import { RenderCanvasSize, RenderWindow, Size, TwoDSlice } from "../../models/rendering";
import { AudioModel } from "../../models/recordings";
import { Hertz, Pixel, Seconds, UnitConverter } from "../../models/unitConverters";
import { OeResizeObserver } from "../../helpers/resizeObserver";
import { AudioHelper } from "../../helpers/audio/audio";
import { WindowFunctionName } from "fft-windowing-ts";
import { IAudioInformation, SpectrogramOptions } from "../../helpers/audio/models";
import { booleanConverter, enumConverter } from "../../helpers/attributes";
import { HIGH_ACCURACY_TIME_PROCESSOR_NAME } from "../../helpers/audio/messages";
import { ChromeHost, ChromeHostSurface } from "../../mixins/chrome/chromeHost/chromeHost";
import HighAccuracyTimeProcessor from "../../helpers/audio/high-accuracy-time-processor.ts?worker&url";
import spectrogramStyles from "./css/style.css?inline";

export interface IPlayEvent {
  play: boolean;
  keyboardShortcut: boolean;
}

export enum SpectrogramCanvasScale {
  STRETCH = "stretch",
  NATURAL = "natural",
  ORIGINAL = "original",
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
 * @event Loading
 * @event Finished
 *
 * @slot - A `<source>` element to provide the audio source
 */
@customElement("oe-spectrogram")
export class SpectrogramComponent extends SignalWatcher(ChromeHost(LitElement)) implements ChromeHostSurface {
  public static styles = unsafeCSS(spectrogramStyles);

  // TODO: we should also have a "pause" event
  public static readonly playEventName = "play";
  public static readonly loadingEventName = "loading";
  public static readonly loadedEventName = "loaded";
  public static readonly optionsChangeEventName = "options-change";

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
  @property({
    type: String,
    reflect: true,
    converter: enumConverter(SpectrogramCanvasScale, SpectrogramCanvasScale.STRETCH),
  })
  public scaling: SpectrogramCanvasScale = SpectrogramCanvasScale.STRETCH;

  /** The size of the fft window */
  @property({ type: Number, attribute: "window-size", reflect: true })
  public windowSize = 512;

  /** The window function to use for the spectrogram */
  @property({ type: String, attribute: "window-function", reflect: true })
  public windowFunction: WindowFunctionName = "hann";

  /** The amount of overlap between fft windows */
  @property({ type: Number, attribute: "window-overlap", reflect: true })
  public windowOverlap = 0;

  /** A boolean attribute representing if the spectrogram should be shown in mel-scale */
  @property({ type: Boolean, attribute: "mel-scale", converter: booleanConverter })
  public melScale = false;

  /** A color map to use for the spectrogram */
  @property({ type: String, attribute: "color-map", reflect: true })
  public colorMap = "";

  /** An offset (seconds) from the start of a larger audio recording */
  @property({ type: Number, reflect: true })
  public offset = 0;

  /** An increase in brightness */
  @property({ type: Number, reflect: true })
  public brightness = 0;

  /** A scalar multiplier that should be applied to fft values */
  @property({ type: Number, reflect: true })
  public contrast = 1;

  @queryAssignedElements({ selector: "source" })
  public slottedSourceElements!: ReadonlyArray<HTMLElement>;

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
  private highAccuracyTimeBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT);
  private currentTimeBuffer = new Float32Array(this.highAccuracyTimeBuffer);
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

    // TODO: We should support multiple <source> elements as fallbacks
    // see: https://github.com/ecoacoustics/web-components/issues/280
    const targetSourceElement = this.slottedSourceElements[0];
    if (targetSourceElement instanceof HTMLSourceElement) {
      return targetSourceElement.src;
    }

    return "";
  }

  public hasSource(): boolean {
    return !!this.src || this.slottedSourceElements.length > 0;
  }

  // todo: this should be part of a mixin
  public disconnectedCallback(): void {
    // if the spectrogram component is rapidly added and removed from the DOM
    // the canvas will not be initialized, and the canvas can be undefined
    // this can sometimes occur during tests if the test runner doesn't
    // correctly wait for the component to be fully initialized
    OeResizeObserver.instance.unobserve(this.canvas);

    // because the resize observer is disconnected when the spectrogram is
    // removed from the DOM, the unit converter value will still have the old
    // spectrogram canvas size after it is removed from the DOM
    // this means that any elements that depend on the size of the spectrogram
    // component e.g. axes, indicators, etc. will still stay the same size
    // to fix this, we emit a canvas size of zero after the component is removed
    if (this.unitConverters.value) {
      this.unitConverters.value.canvasSize.value = { width: 0, height: 0 };
    }

    super.disconnectedCallback();
  }

  public async firstUpdated(change: any) {
    super.firstUpdated(change);

    OeResizeObserver.observe(this.canvas, (e) => this.handleResize(e));
    this.resizeCanvas(this.canvas);

    const unitConverters = new UnitConverter(
      this.renderWindow,
      this.renderCanvasSize,
      this.audio,
      signal(this.melScale),
    );
    this.unitConverters.value = unitConverters;

    // because audio context's automatically start in an active state, and start
    // processing audio even if there is no <audio> element input, we immediately
    // suspend it so that it doesn't use up additional resources / threads
    // we should manually resume the audio context when the audio's when the
    // play/paused state is updated
    this.audioContext.suspend();

    const source = this.audioContext.createMediaElementSource(this.mediaElement);
    source.connect(this.audioContext.destination);

    // because FireFox reduces the accuracy of the audio element's currentTime
    // we use an AudioWorkletNode to calculate a more accurate time by calculating
    // the currentTime based on the number of samples processed
    const workletUrl = new URL(HighAccuracyTimeProcessor, import.meta.url);
    await this.audioContext.audioWorklet.addModule(workletUrl);
    const highAccuracyTimeWorklet = new AudioWorkletNode(this.audioContext, HIGH_ACCURACY_TIME_PROCESSOR_NAME);

    // because we receive the accurate time from a separate audio worklet thread
    // we communicate the accurate time to the main thread through a
    // SharedArrayBuffer with one float32 value (the accurate time)
    const setupMessage = ["setup", { timeBuffer: this.highAccuracyTimeBuffer }];
    highAccuracyTimeWorklet.port.postMessage(setupMessage);

    source.connect(highAccuracyTimeWorklet);
  }

  public updated(change: PropertyValues<this>) {
    if (this.doneFirstRender) {
      // because regenerating the options is also performed when the source is
      // invalidated, we only use the regenerateSpectrogramOptions method when
      // only the options are updated
      if (this.invalidateSpectrogramSource(change)) {
        this.pause();
        this.regenerateSpectrogram();
        this.updateCurrentTime();
      } else if (this.invalidateSpectrogramOptions(change)) {
        this.regenerateSpectrogramOptions();
      }

      if (this.unitConverters.value && change.has("melScale")) {
        this.unitConverters.value.melScale.value = this.melScale;
      }
    } else if (this.invalidateSpectrogramSource(change)) {
      this.renderSpectrogram();
    }

    // TODO: Find out why this was originally here
    // this.resizeCanvas(this.canvas);
  }

  public renderSpectrogram(): void {
    if (!this.hasSource()) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent(SpectrogramComponent.loadingEventName, {
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

    this.dispatchEvent(
      new CustomEvent(SpectrogramComponent.loadingEventName, {
        bubbles: true,
      }),
    );

    this.audioHelper.changeSource(this.renderedSource, this.spectrogramOptions).then((info: IAudioInformation) => {
      const originalRecording = { duration: info.duration, startOffset: this.offset };
      this.audio.value = new AudioModel(info.duration, info.sampleRate, originalRecording);

      this.dispatchEvent(
        new CustomEvent(SpectrogramComponent.loadedEventName, {
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

    this.dispatchEvent(
      new CustomEvent<SpectrogramOptions>(SpectrogramComponent.optionsChangeEventName, {
        detail: this.spectrogramOptions,
        bubbles: true,
      }),
    );

    this.audioHelper.regenerateSpectrogram(this.spectrogramOptions).then(() => {
      this.dispatchEvent(
        new CustomEvent(SpectrogramComponent.loadedEventName, {
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
    if (target.clientWidth === 0 || target.clientHeight === 0) {
      return { width: 0, height: 0 };
    }

    // the natural size is where we take the "original" spectrogram size and
    // scale the width and height (while maintaining the aspect ratio) up until
    // one of the dimensions overflows the targetEntry.contentRect
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
    let size: Size;

    if (this.scaling === SpectrogramCanvasScale.ORIGINAL) {
      size = this.originalFftSize();
    } else if (this.scaling === SpectrogramCanvasScale.NATURAL) {
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

    if (this.scaling === SpectrogramCanvasScale.ORIGINAL) {
      this.style.height = `${size.height}px`;
      this.style.width = `${size.width}px`;
    } else if (this.scaling === SpectrogramCanvasScale.NATURAL) {
      this.canvas.style.width = "auto";
    } else {
      this.canvas.style.width = "100%";
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
    // our AbstractComponent mixin triggers a change event when the slot content
    // changes, meaning that we can use the slotElements property to check if
    // the source has been invalidated through the slot
    const invalidationKeys: (keyof SpectrogramComponent)[] = ["src", "slottedSourceElements"];
    return invalidationKeys.some((key) => change.has(key));
  }

  /**
   * Returns the amount of time processed by the high accuracy time processor
   * It is important to note that the time does not represent the actual time
   * of the audio element, but is actually a very accurate amount of time that
   * has passed since the worklet node started processing audio
   */
  private highAccuracyElapsedTime(): number {
    return this.currentTimeBuffer[0];
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

      const initialTime = this.highAccuracyElapsedTime() - this.currentTime.peek();
      this.nextRequestId = requestAnimationFrame(() => this.pollUpdateHighAccuracyTime(initialTime));
      return;
    }

    // even though the audio elements currentTime is not accurate to perform
    // animations, we can use the currentTime to if we only want to update the
    // audio once without polling updates
    this.currentTime.value = this.mediaElement.currentTime;
  }

  // TODO: move somewhere else
  private nextRequestId: number | null = null;

  private pollUpdateHighAccuracyTime(startTime: number): void {
    if (!this.paused) {
      const bufferTime = this.highAccuracyElapsedTime();
      const timeElapsed = bufferTime - startTime;

      this.currentTime.value = timeElapsed;

      this.nextRequestId = requestAnimationFrame(() => this.pollUpdateHighAccuracyTime(startTime));
    }
  }

  private setPaused(paused: boolean, keyboardShortcut = false): void {
    const detail: IPlayEvent = {
      play: !paused,
      keyboardShortcut,
    };

    // if this event is canceled, the spectrogram will not play
    const eventSuccess = this.dispatchEvent(
      new CustomEvent<IPlayEvent>(SpectrogramComponent.playEventName, {
        detail,
        cancelable: true,
        bubbles: true,

        // We set composed: true so that the event can bubble through shadow
        // and light DOM boundaries.
        // Such as when the spectrogram is templated inside a grid tile
        composed: true,
      }),
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

      this.mediaElement.pause();
      this.audioContext.suspend();
    } else {
      this.mediaElement.play();
      this.audioContext.resume();
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

  public surface() {
    return html`
      <div id="spectrogram-container">
        <canvas></canvas>
      </div>
      <audio
        id="media-element"
        src="${this.renderedSource}"
        @play="${() => this.play()}"
        @ended="${() => this.stop()}"
        preload="metadata"
        crossorigin="anonymous"
      >
        <slot></slot>
      </audio>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-spectrogram": SpectrogramComponent;
  }
}
