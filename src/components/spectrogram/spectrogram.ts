import { LitElement, PropertyValues, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { spectrogramStyles } from "./css/style";
import { signal, Signal, SignalWatcher } from "@lit-labs/preact-signals";
import { RenderCanvasSize, RenderWindow, TwoDSlice } from "../models/rendering";
import { AudioModel } from "../models/recordings";
import { Hertz, Pixels, Scales, Seconds, UnitConverters } from "../models/unitConverters";
import { OeResizeObserver } from "../helpers/resizeObserver";
import { AbstractComponent } from "../mixins/abstractComponent";
import { AudioHelper } from "../helpers/audio";

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
export class Spectrogram extends SignalWatcher(AbstractComponent(LitElement)) {
  public static styles = spectrogramStyles;

  @property({ type: Boolean, reflect: true })
  public paused = true;

  @property({ type: String })
  public src = "";

  // must be in the format startOffset, lowFreq, endOffset, highFreq
  @property({ type: String, attribute: "window" })
  public domRenderWindow?: string;

  @property({ type: Number, reflect: true })
  public offset: number = 0;

  @query("#media-element")
  private mediaElement!: HTMLMediaElement;

  @query("canvas")
  private canvas!: HTMLCanvasElement;

  @state()
  private audio?: AudioModel;

  public fftSlice?: TwoDSlice<Pixels, Hertz>;

  public currentTime: Signal<Seconds> = signal(this.offset);
  public segmentToCanvasScale: Signal<Scales | any> = signal(null);
  public segmentToFractionalScale: Signal<Scales | any> = signal(null);
  public renderWindowScale: Signal<Scales | any> = signal(null);
  public renderCanvasSize: Signal<RenderCanvasSize> = signal(this.canvasSize());
  public renderWindow: Signal<RenderWindow> = signal(this.createRenderWindow());

  public firstUpdated(): void {
    OeResizeObserver.observe(this.canvas, () => {
      this.renderCanvasSize.value = this.canvasSize();
    });

    this.updateCurrentTime();
  }

  public disconnectedCallback(): void {
    OeResizeObserver.instance.unobserve(this.canvas);
  }

  public willUpdate(change: PropertyValues<this>): void {
    if (change.has("paused")) {
      this.setPlaying();
    }

    this.renderWindow.value = this.createRenderWindow();
  }

  public updated() {
    this.setPlaying();
  }

  public play() {
    AudioHelper.connect(this.mediaElement);
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

  private createRenderWindow(): RenderWindow {
    const segmentAudio =
      this.audio ??
      new AudioModel({
        duration: 0,
        sampleRate: 0,
        originalAudioRecording: {
          startOffset: this.offset,
          duration: 0,
        },
      });

    const scale = new Scales().renderWindowScale(
      segmentAudio,
      segmentAudio.originalAudioRecording!,
      this.renderCanvasSize.value,
    );

    this.segmentToCanvasScale.value = scale;

    const newRenderWindow = this.parseRenderWindow(segmentAudio);

    this.segmentToFractionalScale.value = new Scales().fractionalScale(newRenderWindow);
    this.renderWindowScale.value = new Scales().renderWindowScaleAdvanced(newRenderWindow, this.renderCanvasSize.value);

    return newRenderWindow;
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
    if (!this.mediaElement) return;

    const originalRecording = { duration: this.audioDuration(), startOffset: this.offset };

    this.audio = new AudioModel({
      duration: this.audioDuration(),
      sampleRate: this.audioSampleRate(),
      originalAudioRecording: originalRecording,
    });
  }

  private audioSampleRate(): Hertz {
    return 22050;
  }

  private audioDuration(): Seconds {
    return this.mediaElement.duration;
  }

  // creates a render window from an audio segment
  private parseRenderWindow(segmentAudio: AudioModel): RenderWindow {
    if (!this.domRenderWindow) {
      return new RenderWindow({
        startOffset: this.offset,
        endOffset: this.offset + segmentAudio.duration,
        lowFrequency: 0,
        highFrequency: UnitConverters.nyquist(segmentAudio),
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

  private calculateFft() {}

  private paintCanvasFft() {}

  public render() {
    return html`
      <div id="spectrogram-container" part="spectrogram-container">
        <canvas></canvas>
      </div>
      <audio id="media-element" src="${this.src}" @ended="${this.pause}" @loadedmetadata="${this.updateAudio}">
        <slot></slot>
      </audio>
    `;
  }
}
