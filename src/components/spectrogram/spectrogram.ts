import { LitElement, PropertyValues, html, unsafeCSS } from "lit";
import { customElement, property, query, queryAssignedElements } from "lit/decorators.js";
import { computed, ReadonlySignal, signal, SignalWatcher } from "@lit-labs/preact-signals";
import { RenderCanvasSize, RenderWindow, Size } from "../../models/rendering";
import { AudioModel } from "../../models/recordings";
import { Seconds, UnitConverter } from "../../models/unitConverters";
import { OeResizeObserver } from "../../helpers/resizeObserver";
import { AudioHelper } from "../../helpers/audio/audio";
import { WindowFunctionName } from "fft-windowing-ts";
import { IAudioInformation, SpectrogramOptions } from "../../helpers/audio/models";
import { booleanConverter, enumConverter } from "../../helpers/attributes";
import { HIGH_ACCURACY_TIME_PROCESSOR_NAME } from "../../helpers/audio/messages";
import { ChromeHost } from "../../mixins/chrome/chromeHost/chromeHost";
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
 * @csspart canvas - Allows you to size the spectrogram component from the size of the canvas
 *
 * @fires Loading
 * @fires Finished
 * @fires play
 * @fires options-change
 *
 * @slot - A `<source>` element to provide the audio source
 */
@customElement("oe-spectrogram")
export class SpectrogramComponent extends SignalWatcher(ChromeHost(LitElement)) {
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

  @query("#spectrogram-container")
  private spectrogramContainer!: Readonly<HTMLDivElement>;

  // TODO: we might want to make this signal writable when we add support for
  // indicator handle seeking
  // see: https://github.com/ecoacoustics/web-components/issues/259
  public get currentTime(): ReadonlySignal<Seconds> {
    return this._currentTime;
  }

  private set currentTime(value: Seconds) {
    if (!this.audio.value) {
      console.error("Attempted to set current time before audio model initialization");
      return;
    } else if (value > this.audio.value.duration || value < 0) {
      console.error("Attempted to set current time outside of the audio duration");
      return;
    }

    this._currentTime.value = value;
  }

  private readonly _currentTime = signal<Seconds>(this.offset);

  // if you need to access to "renderWindow", "audio", or "renderCanvasSize"
  // you should use the signals exported by the unitConverter
  //
  // the typescript "readonly" annotation here specifies that you can't change
  // the property values.
  // This is so that the user can't try to create a new unit converter by
  // directly assigning to the "unitConverter" property.
  // The readonly annotation still allows you to modify properties of the signal
  // e.g. the signals "value" property.
  private readonly renderWindow = computed<RenderWindow>(() => this.parseRenderWindow());
  private readonly audio = signal<AudioModel | undefined>(undefined);
  private readonly renderCanvasSize = signal<RenderCanvasSize>({ width: 0, height: 0 });
  private readonly _unitConverters = signal<UnitConverter | undefined>(undefined);

  // we have a getter for the unit converters property so that the internal
  // typing of the signal can be mutable while the exported signal is readonly
  public get unitConverters(): ReadonlySignal<UnitConverter | undefined> {
    return this._unitConverters;
  }

  private readonly audioHelper = new AudioHelper();
  private readonly audioContext = new AudioContext();

  private readonly highAccuracyTimeBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT);
  private readonly currentTimeBuffer = new Float32Array(this.highAccuracyTimeBuffer);

  // TODO: move somewhere else
  private interpolationCancelReference: number | null = null;

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
    OeResizeObserver.instance.unobserve(this.spectrogramContainer);

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

  public async firstUpdated(change: PropertyValues<this>) {
    super.firstUpdated(change);

    OeResizeObserver.observe(this.spectrogramContainer, (event) => this.handleResize(event));

    // because audio context's automatically start in an active state, and start
    // processing audio even if there is no <audio> element input, we immediately
    // suspend it so that it doesn't use up additional resources / threads
    // we should manually resume the audio context when the audio's when the
    // play/paused state is updated
    this.audioContext.suspend();

    const source = this.audioContext.createMediaElementSource(this.mediaElement);
    source.connect(this.audioContext.destination);

    // because FireFox reduces the accuracy of the audio element's currentTime
    // we use an AudioWorkletNode to calculate a more accurate time by
    // calculating the currentTime based on the number of samples processed
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
    super.updated(change);

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
  }

  public async renderSpectrogram() {
    if (!this.hasSource()) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent(SpectrogramComponent.loadingEventName, {
        bubbles: true,
      }),
    );

    const info: IAudioInformation = await this.audioHelper.connect(
      this.renderedSource,
      this.canvas,
      this.spectrogramOptions,
    );

    const originalRecording = { duration: info.duration, startOffset: this.offset };

    this.audio.value = new AudioModel(info.duration, info.sampleRate, originalRecording);

    this.initializeUnitConverter();
    this.resizeCanvas(this.spectrogramContainer.getBoundingClientRect());

    this.dispatchEvent(
      new CustomEvent(SpectrogramComponent.loadedEventName, {
        bubbles: true,
      }),
    );

    this.doneFirstRender = true;
  }

  public async regenerateSpectrogram() {
    if (!this.doneFirstRender || !this.renderedSource) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent(SpectrogramComponent.loadingEventName, {
        bubbles: true,
      }),
    );

    const info: IAudioInformation = await this.audioHelper.changeSource(this.renderedSource, this.spectrogramOptions);
    const originalRecording = { duration: info.duration, startOffset: this.offset };
    this.audio.value = new AudioModel(info.duration, info.sampleRate, originalRecording);

    this.resizeCanvas(this.spectrogramContainer.getBoundingClientRect());

    this.dispatchEvent(
      new CustomEvent(SpectrogramComponent.loadedEventName, {
        bubbles: true,
      }),
    );
  }

  public async regenerateSpectrogramOptions() {
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

    await this.audioHelper.regenerateSpectrogram(this.spectrogramOptions);

    this.resizeCanvas(this.spectrogramContainer.getBoundingClientRect());

    this.dispatchEvent(
      new CustomEvent(SpectrogramComponent.loadedEventName, {
        bubbles: true,
      }),
    );
  }

  public resetSettings(): void {
    this.colorMap = "audacity";
    this.contrast = 1;
    this.brightness = 0;
    this.melScale = false;

    this.stop();
  }

  public play(keyboardShortcut = false): void {
    // There is a bug in Firefox (not present in Chrome) where if you repeatedly
    // play and pause an audio element (e.g. by holding down space bar), the
    // audio element will not reset the currentTime to 0 once the audio has
    // finished playing.
    // To get around this, if we play audio that is already at the end, we reset
    // the currentTime to 0.
    const audioValue = this.audio.value;
    if (!audioValue || this.currentTime.value >= audioValue.duration) {
      this.mediaElement.currentTime = 0;
      this.currentTime = 0;
    }

    this.setPaused(false, keyboardShortcut);
  }

  public pause(keyboardShortcut = false): void {
    this.setPaused(true, keyboardShortcut);
  }

  public stop(): void {
    this.currentTime = 0;
    this.pause();
  }

  private initializeUnitConverter(): void {
    if (!this.audio.value) {
      throw new Error("Attempted to initialize unit converter before creating audio model");
    }

    this._unitConverters.value = new UnitConverter(
      this.renderWindow,
      this.renderCanvasSize,
      // typescript is correctly throwing an error because if the audio model
      // suddenly gets de-initialized (for some reason) the audio signal might
      // emit "undefined".
      // however, I have deemed that there is no time when this should ever
      // happen when this component is working correctly.
      //
      // TODO: as part of a defensive programming practice, we should remove
      // the "as any" cast and gracefully handle errors where the audio model
      // suddenly destructs itself
      this.audio as any,
      signal(this.melScale),
    );
  }

  private originalFftSize(): Size {
    if (!this.audio.value) {
      throw new Error("Attempted to calculate original fft size before audio model initialization");
    }

    const options = this.spectrogramOptions;
    const step = options.windowSize - options.windowOverlap;
    const duration = this.audio.value.duration;
    const sampleRate = this.audio.value.sampleRate;
    const totalSamples = duration * sampleRate;

    const width = Math.ceil(totalSamples / step);
    const height = options.windowSize / 2;

    return { width, height };
  }

  private naturalSize(originalSize: Size, entry: DOMRectReadOnly): Size {
    if (entry.width === 0 || entry.height === 0) {
      return { width: 0, height: 0 };
    }

    // the natural size is where we take the "original" spectrogram size and
    // scale the width and height (while maintaining the aspect ratio) up until
    // one of the dimensions overflows the targetEntry.contentRect
    const scale = Math.min(entry.width / originalSize.width, entry.height / originalSize.height);

    return {
      width: originalSize.width * scale,
      height: originalSize.height * scale,
    };
  }

  private stretchSize(entry: DOMRectReadOnly): Size {
    // in any correctly structured HTML document, a parent element should always
    // exist (at the very minimum a html tag should be present) however, we
    // cannot enforce this, so we have to check that a parent element exists
    if (entry) {
      return { width: entry.width, height: entry.height };
    }

    throw new Error("Spectrogram element does not have a parent to scale to");
  }

  // TODO: parents should not contribute to the size of the canvas
  private handleResize(entries: ResizeObserverEntry[]): void {
    // if the spectrogram canvas has not been rendered yet, we can safely skip
    // resizing the canvas because:
    // 1. there will be no content to resize, meaning that there will be a lot
    // of work being performed for no result
    // 2. if there is no canvas content, we can't perform natural and original
    // scaling correctly
    if (!this.doneFirstRender || entries.length === 0) {
      return;
    }

    const targetEntry = entries[0];
    this.resizeCanvas(targetEntry.contentRect);
  }

  // TODO: refactor this procedure
  private resizeCanvas(targetEntry: DOMRectReadOnly): void {
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
      this.canvas.style.position = "relative";
      this.canvas.style.height = `${size.height}px`;
      this.canvas.style.maxHeight = `${size.height}px`;

      this.canvas.style.width = `${size.width}px`;
      this.canvas.style.maxWidth = `${size.width}px`;
    } else if (this.scaling === SpectrogramCanvasScale.NATURAL) {
      this.canvas.style.position = "relative";

      this.canvas.style.width = "auto";
      this.canvas.style.maxWidth = "auto";
    } else {
      /*
        we want absolute positioning because the relative position point will be
        the .surface element provided by the ChromeHost mixin
      */
      this.canvas.style.position = "absolute";
      this.canvas.style.width = "100%";
      this.canvas.style.maxWidth = "100%";
    }
  }

  /**
   * Specifies if the spectrogram is invalidated with the new parameters
   * This method can be used to check if the spectrogram needs to be re-rendered
   */
  private invalidateSpectrogramOptions(change: PropertyValues<this>): boolean {
    // TODO: Improve typing
    const invalidationKeys = [
      "domRenderWindow",
      "brightness",
      "contrast",
      "windowSize",
      "windowFunction",
      "windowOverlap",
      "melScale",
      "colorMap",
      "offset",
    ] as const satisfies (keyof SpectrogramComponent)[];

    return invalidationKeys.some((key) => change.has(key));
  }

  private invalidateSpectrogramSource(change: PropertyValues<this>): boolean {
    // our AbstractComponent mixin triggers a change event when the slot content
    // changes, meaning that we can use the slotElements property to check if
    // the source has been invalidated through the slot
    const invalidationKeys = ["src", "slottedSourceElements"] as const satisfies (keyof SpectrogramComponent)[];
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
      if (this.interpolationCancelReference !== null) {
        window.cancelAnimationFrame(this.interpolationCancelReference);
        this.interpolationCancelReference = null;
      }

      // we use peek() here because we do not want to create a subscription
      // to the currentTime signal
      const initialTime = this.highAccuracyElapsedTime() - this.currentTime.peek();
      this.interpolationCancelReference = requestAnimationFrame(() => this.pollUpdateHighAccuracyTime(initialTime));

      return;
    }

    // even though the audio elements currentTime is not accurate to perform
    // animations, we can use the currentTime to if we only want to update the
    // audio once without polling updates
    this.currentTime = this.mediaElement.currentTime;
  }

  private pollUpdateHighAccuracyTime(startTime: number): void {
    if (!this.paused) {
      const bufferTime = this.highAccuracyElapsedTime();
      const mediaElementTime = this.mediaElement.currentTime;

      if (mediaElementTime === 0) {
        // if the media element has not started playing yet (e.g. due to lag)
        // there is no need to update the time.
        this.interpolationCancelReference = requestAnimationFrame(() => this.pollUpdateHighAccuracyTime(bufferTime));
        return;
      }

      // we only compute the time elapsed once the media element has started
      // playing because we do not need to calculate the time elapsed to short
      // circuit the time update if the audio element is not playing
      const timeElapsed = bufferTime - startTime;

      const desyncLimit = 0.1 satisfies Seconds;
      const desync = Math.abs(mediaElementTime - timeElapsed);

      if (desync > desyncLimit) {
        startTime -= desync;

        this.currentTime = mediaElementTime;
        this.interpolationCancelReference = requestAnimationFrame(() => this.pollUpdateHighAccuracyTime(startTime));

        return;
      }

      this.currentTime = timeElapsed;

      this.interpolationCancelReference = requestAnimationFrame(() => this.pollUpdateHighAccuracyTime(startTime));
    } else {
      this.currentTime = this.mediaElement.currentTime;
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
      if (this.interpolationCancelReference !== null) {
        window.cancelAnimationFrame(this.interpolationCancelReference);
        this.interpolationCancelReference = null;
      }

      this.mediaElement.pause();
      this.audioContext.suspend();
    } else {
      this.mediaElement.play();
      this.audioContext.resume();
      this.updateCurrentTime(true);
    }

    // If the audio fails to fetch or play, the media elements paused property
    // will remain true.
    // Because we want the spectrograms paused attribute to reflect the media
    // elements behavior, we set the paused attribute to the media elements
    // paused property so that all edge cases are handled correctly without
    // having to keep this component updated with the W3C spec
    this.paused = this.mediaElement.paused;
  }

  // creates a render window from an audio segment if no explicit render window
  // is provided
  private parseRenderWindow(): RenderWindow {
    // if the user has provided an explicit render window through the "window"
    // attribute, use that instead of creating an implicit render window
    if (this.domRenderWindow) {
      return this.domRenderWindow;
    }

    if (!this.audio.value) {
      throw new Error("Attempted to create implicit render window without audio model initialization");
    }

    const defaultLowFrequency = 0;
    return new RenderWindow(
      this.offset,
      this.offset + this.audio.value.duration,
      defaultLowFrequency,
      this.unitConverters.value?.nyquist.value ?? 0,
    );
  }

  public renderSurface() {
    return html`
      <div id="spectrogram-container" part="canvas">
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
