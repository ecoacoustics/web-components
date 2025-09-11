import { WindowFunctionName } from "fft-windowing-ts";
import { PowerTwoWindowSize } from "../../helpers/audio/models";
import { ColorMapName } from "../../helpers/audio/colors";

export enum SpectrogramCanvasScale {
  STRETCH = "stretch",
  NATURAL = "natural",
  ORIGINAL = "original",
}

export class SpectrogramOptions {
  constructor(
    windowSize: PowerTwoWindowSize,
    windowOverlap: number,
    windowFunction: WindowFunctionName,
    melScale: boolean,
    brightness: number,
    contrast: number,
    colorMap: ColorMapName,
    scaling: SpectrogramCanvasScale,
  ) {
    this.windowSize = windowSize;
    this.windowOverlap = windowOverlap;
    this.windowFunction = windowFunction;
    this.melScale = melScale;
    this.brightness = brightness;
    this.contrast = contrast;
    this.colorMap = colorMap;
    this.scaling = scaling;
  }

  /**
   * number of samples in each window for the fft
   * must be a power of 2
   */
  public windowSize: PowerTwoWindowSize;
  /** number of samples to overlap between windows */
  public windowOverlap: number;
  public readonly windowFunction: WindowFunctionName;
  public melScale: boolean;
  public brightness: number;
  public contrast: number;
  public colorMap: ColorMapName;
  public scaling: SpectrogramCanvasScale;

  public get windowStep(): number {
    return this.windowSize - this.windowOverlap;
  }
}
