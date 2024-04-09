import { LitElement, PropertyValues, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { spectrogramStyles } from "./css/style";
import { signal, Signal, SignalWatcher } from "@lit-labs/preact-signals";
import { RenderCanvasSize, RenderWindow, TwoDSlice } from "../models/rendering";
import { AudioModel } from "../models/recordings";
import { Hertz, Pixels, Scales, Seconds, UnitConverters } from "../models/unitConverters";

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

  public fftSlice?: TwoDSlice<Pixels, Hertz>;

  public segmentToCanvasScale: Signal<Scales | any> = signal(null);
  public segmentToFractionalScale: Signal<Scales | any> = signal(null);
  public renderCanvasSize: Signal<RenderCanvasSize> = signal(this.canvasSize());
  public renderWindow: Signal<RenderWindow> = signal(this.createRenderWindow());

  // TODO: Cleanup?? Make sure thre size obhserver is destroyed. We might want to use a static class to
  private resizeObserver = new ResizeObserver(() => {
    this.renderCanvasSize.value = this.canvasSize();
  });

  public firstUpdated(): void {
    this.resizeObserver.observe(this.canvas);
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
    this.paused = false;
  }

  public pause() {
    this.paused = true;
  }

  private canvasSize(): RenderCanvasSize {
    return new RenderCanvasSize({
      width: this.canvas?.clientWidth ?? 0,
      height: this.canvas?.clientHeight ?? 0,
    });
  }

  private createRenderWindow(): RenderWindow {
    this.fftSlice = new TwoDSlice({
      x0: 0,
      x1: this.renderCanvasSize.value.width,
      y0: 0,
      y1: this.renderCanvasSize.value.height,
    });

    const spectrogramAudio =
      this.audio ??
      new AudioModel({ duration: 0, sampleRate: 0, originalAudioRecording: { startOffset: 0, duration: 0 } });

    // TODO: we want to create a 2d slice from seconds, hertz, and an audio model

    // TODO: Invert relation ship. A render window should be used to get a 2d slice
    const scale = new Scales().renderWindowScale(
      spectrogramAudio,
      spectrogramAudio.originalAudioRecording!,
      this.renderCanvasSize.value,
    );

    this.segmentToCanvasScale.value = scale;
    const rw = UnitConverters.getRenderWindow(scale, this.fftSlice);

    this.segmentToFractionalScale.value = new Scales().fractionalScale(rw);

    return rw;
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

  private audioSampleRate(): Hertz {
    return 22050;
  }

  private audioDuration(): Seconds {
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
        <slot @slotchange="${() => this.requestUpdate()}"></slot>
      </audio>
    `;
  }
}
