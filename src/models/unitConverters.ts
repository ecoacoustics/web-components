import { RenderCanvasSize, RenderWindow } from "./rendering";
import { AudioModel } from "./recordings";
import { computed, Signal } from "@lit-labs/preact-signals";
import { hertzToMels } from "../helpers/audio/mel";
import { SpectrogramOptions } from "../helpers/audio/models";

export type Seconds = number;
export type Hertz = number;
export type MHertz = number;
export type Sample = number;
export type Pixel = number;
export type EmUnit = number;

export type ScaleDomain<T extends number> = [min: T, min: T];
export type ScaleRange<T extends number> = [min: T, max: T];

export type LinearScale<T extends number> = (value: T) => Pixel;
export type InverseLinearScale<T extends number> = (value: Pixel) => T;

export type TemporalScale = LinearScale<Seconds>;
export type FrequencyScale = LinearScale<Hertz>;
export type InvertTemporalScale = InverseLinearScale<Seconds>;
export type InvertFrequencyScale = InverseLinearScale<Hertz>;

const identityFunction = (value: number) => value;

// TODO: we might want to use batch signals here to increase performance
// use we signals in the stateful unit converters so that when one value updates
// all the computed values also update
export class UnitConverter {
  public constructor(
    renderWindow: Signal<RenderWindow>,
    canvasSize: Signal<RenderCanvasSize>,
    audioModel: Signal<AudioModel>,
    melScale: Signal<boolean>,
  ) {
    this.renderWindow = renderWindow;
    this.canvasSize = canvasSize;
    this.audioModel = audioModel;
    this.melScale = melScale;
  }

  public renderWindow: Signal<RenderWindow>;
  public canvasSize: Signal<RenderCanvasSize>;
  public audioModel: Signal<AudioModel>;
  public melScale: Signal<boolean>;
  public nyquist = computed(() => this.audioModel.value.sampleRate / 2);
  private frequencyInterpolator = computed(() => (this.melScale.value ? hertzToMels : (value: Hertz): Hertz => value));

  // by using computed signals for the temporalDomain and frequencyDomain
  // the scale functions will automatically update when the renderWindow size changes
  public temporalDomain: Signal<ScaleDomain<Seconds>> = computed(() => [
    this.renderWindow.value.startOffset,
    this.renderWindow.value.endOffset,
  ]);

  // the scale functions such as scaleY() take in hertz values (not mel-scale values)
  // but when melScale is set, we want the hz values to be in their mel scale canvas
  // position (and vice versa)
  // this behavior is implemented by setting the domain to mel scale when melScale is set
  // this will automatically update the scales to convert to/from mel scale values
  public frequencyDomain: Signal<ScaleDomain<Hertz>> = computed(() => [
    this.frequencyInterpolator.value(0),
    this.frequencyInterpolator.value(this.nyquist.value),
  ]);

  // the frequency axis/hertz/y-axis is special because we want the highest frequency to occupy the smallest pixel value
  // so that it is at the top of the canvas
  public temporalRange: Signal<ScaleRange<Seconds>> = computed(() => [0, this.canvasSize.value.width]);
  public frequencyRange: Signal<ScaleRange<Hertz>> = computed(() => [this.canvasSize.value.height, 0]);

  /**
   * Convert Seconds into a Pixel value on the canvas
   *
   * @param value the value in seconds
   * @returns the x-offset that the seconds value should be drawn
   */
  public scaleX: Signal<TemporalScale> = computed(() =>
    this.linearScale<Seconds>(this.temporalDomain.value, this.temporalRange.value),
  );

  /**
   * Convert a Pixel value on a canvas value into a number of Seconds
   *
   * @param value the x-offset on the canvas
   * @returns what seconds value the x-offset represents
   */
  public scaleXInverse = computed<InvertTemporalScale>(() =>
    this.inverseLinearScale(this.temporalDomain.value, this.temporalRange.value),
  );

  /**
   * Convert Hertz into a Pixel value on the canvas
   *
   * @param value the value in Hertz
   * @returns the y-offset that the Hertz value should be drawn
   */
  public scaleY = computed<FrequencyScale>(() =>
    this.linearScale<Hertz>(this.frequencyDomain.value, this.frequencyRange.value, this.frequencyInterpolator.value),
  );

  /**
   * Convert a Pixel value on a canvas into a number of Hertz
   *
   * @param value the y-offset on the canvas
   * @returns what Hertz value the y-offset represents
   */
  public scaleYInverse = computed<InvertFrequencyScale>(() =>
    this.inverseLinearScale(this.frequencyDomain.value, this.frequencyRange.value, this.frequencyInterpolator.value),
  );

  public originalCanvasSize(options: SpectrogramOptions) {
    const step = options.windowSize - options.windowOverlap;
    const duration = this.audioModel.value.duration;
    const sampleRate = this.audioModel.value.sampleRate;
    const totalSamples = duration * sampleRate;

    const width = Math.ceil(totalSamples / step);
    const height = options.windowSize / 2;

    return { width, height };
  }

  // TODO: I think passing in a scaleConverter here is a hack
  /**
   * @returns a function that converts a value to a pixel value
   */
  private linearScale<T extends number>(
    domain: ScaleDomain<T>,
    range: ScaleRange<T>,
    scaleConverter = identityFunction,
  ): LinearScale<T> {
    const magnitude = this.calculateMagnitude<T>(domain, range);
    return (value: T) => scaleConverter(value) * magnitude + range[0];
  }

  /**
   * @returns a function that converts a pixel value to a value
   */
  private inverseLinearScale<T extends number>(
    domain: ScaleDomain<T>,
    range: ScaleRange<T>,
    scaleConverter = identityFunction,
  ): InverseLinearScale<T> {
    const magnitude = this.calculateMagnitude<T>(domain, range);
    return ((value: T) => (scaleConverter(value) - range[0]) / magnitude) as any;
  }

  /**
   * calculate the magnitude of a linear function using
   * (y_2 - y_1) / (x_2 - x_1)
   *
   * @returns the magnitude of the mathematical function
   */
  private calculateMagnitude<T extends number>(domain: ScaleDomain<T>, range: ScaleRange<T>): number {
    // if the domain is zero, then the magnitude is zero
    // we cannot rely on the magnitude formula because we would divide by zero
    if (domain[1] === domain[0]) {
      return 0;
    }

    return (range[1] - range[0]) / (domain[1] - domain[0]);
  }
}
