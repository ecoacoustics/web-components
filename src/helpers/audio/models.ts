import { WindowFunctionName } from "fft-windowing-ts";
import { Sample, Hertz } from "../../models/unitConverters";
import { ColorMapName } from "./colors";

export interface IAudioInformation {
  startSample: Sample;
  endSample: Sample;
  sampleRate: Hertz;
}

export class SpectrogramOptions {
  constructor(
    windowSize: number,
    windowOverlap: number,
    windowFunction: WindowFunctionName,
    melScale: boolean,
    brightness: number,
    contrast: number,
    colorMap: ColorMapName,
  ) {
    this.windowSize = windowSize;
    this.windowOverlap = windowOverlap;
    this.windowFunction = windowFunction;
    this.melScale = melScale;
    this.brightness = brightness;
    this.contrast = contrast;
    this.colorMap = colorMap;
  }

  /**
   * number of samples in each window for the fft
   * must be a power of 2
   */
  public windowSize: number;
  /** number of samples to overlap between windows */
  public windowOverlap: number;
  public windowFunction: WindowFunctionName;
  public melScale: boolean;
  public brightness: number;
  public contrast: number;
  public colorMap: ColorMapName;

  public get windowStep(): number {
    return this.windowSize - this.windowOverlap;
  }
}
