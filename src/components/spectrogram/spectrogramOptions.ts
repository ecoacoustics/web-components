import { WindowFunctionName } from "fft-windowing-ts";
import { PowerTwoWindowSize } from "../../helpers/audio/models";
import { ColorMapName } from "../../helpers/audio/colors";

export enum SpectrogramCanvasScale {
  STRETCH = "stretch",
  NATURAL = "natural",
  ORIGINAL = "original",
}

export interface ISpectrogramOptions {
  /** Number of samples in each window for the fft must be a power of 2 */
  windowSize?: PowerTwoWindowSize;

  /** number of samples to overlap between windows */
  windowOverlap?: number;

  windowFunction?: WindowFunctionName;

  melScale?: boolean;

  brightness?: number;

  contrast?: number;

  colorMap?: ColorMapName;

  scaling?: SpectrogramCanvasScale;
}

export class SpectrogramOptions implements ISpectrogramOptions {
  constructor(options: Required<ISpectrogramOptions>) {
    this.windowSize = options.windowSize;
    this.windowOverlap = options.windowOverlap;
    this.windowFunction = options.windowFunction;
    this.melScale = options.melScale;
    this.brightness = options.brightness;
    this.contrast = options.contrast;
    this.colorMap = options.colorMap;
    this.scaling = options.scaling;
  }

  public readonly windowSize: PowerTwoWindowSize;
  public readonly windowOverlap: number;
  public readonly windowFunction: WindowFunctionName;
  public readonly melScale: boolean;
  public readonly brightness: number;
  public readonly contrast: number;
  public readonly colorMap: ColorMapName;
  public readonly scaling: SpectrogramCanvasScale;

  public get windowStep(): number {
    if (this.windowSize === undefined || this.windowOverlap === undefined) {
      throw new Error("windowSize and windowOverlap must be defined to calculate windowStep");
    }

    return this.windowSize - this.windowOverlap;
  }
}
